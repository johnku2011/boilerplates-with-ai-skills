import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readLock, writeLock } from "./provenance.js";
import type { ScanStatus, SkillsLock } from "./schema.js";

export interface ScanResult {
  riskScore: number;
  scanMode: "static" | "llm";
  findings: number;
}

export interface SkillScanner {
  name: string;
  isAvailable(): Promise<boolean>;
  scan(skillDir: string, opts: { useLlm: boolean }): Promise<ScanResult>;
}

interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      resolve({ code: 127, stdout: "", stderr: "spawn failed" });
      return;
    }
    child.on("error", () => resolve({ code: 127, stdout, stderr: "spawn error" }));
    child.stdout?.on("data", (d) => (stdout += String(d)));
    child.stderr?.on("data", (d) => (stderr += String(d)));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/** Adapter around the NVIDIA SkillSpector CLI (`skillspector`). */
export class SkillSpectorScanner implements SkillScanner {
  readonly name = "skillspector";

  async isAvailable(): Promise<boolean> {
    const { code } = await runCommand("skillspector", ["--version"]);
    return code === 0;
  }

  async scan(skillDir: string, opts: { useLlm: boolean }): Promise<ScanResult> {
    const args = ["scan", skillDir, "--format", "json"];
    if (!opts.useLlm) args.push("--no-llm");
    const { stdout } = await runCommand("skillspector", args);
    const parsed = extractJson(stdout);
    return {
      riskScore: readRiskScore(parsed),
      scanMode: readLlmUsed(parsed) ? "llm" : "static",
      findings: readFindings(parsed),
    };
  }
}

/**
 * Read the SkillSpector risk score. Current SkillSpector nests it under
 * `risk_assessment.score`; older/other shapes used a top-level `risk_score`.
 */
function readRiskScore(obj: Record<string, unknown>): number {
  const nested = asRecord(obj.risk_assessment);
  return (
    numberField(nested, "score") ??
    numberField(obj, "risk_score") ??
    numberField(obj, "riskScore") ??
    0
  );
}

function readLlmUsed(obj: Record<string, unknown>): boolean {
  const meta = asRecord(obj.metadata);
  return (
    booleanField(meta, "llm_requested") ??
    booleanField(meta, "llm_available") ??
    booleanField(obj, "llm_used") ??
    false
  );
}

function readFindings(obj: Record<string, unknown>): number {
  const issues = obj.issues ?? obj.findings;
  return Array.isArray(issues) ? issues.length : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function numberField(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key];
  return typeof v === "number" ? v : undefined;
}

function booleanField(obj: Record<string, unknown>, key: string): boolean | undefined {
  const v = obj[key];
  return typeof v === "boolean" ? v : undefined;
}

export interface ScanProjectOptions {
  projectDir: string;
  scanner: SkillScanner;
  threshold?: number;
  useLlm?: boolean;
  /** When true, fail if the scanner binary is not installed. */
  requireScanner?: boolean;
}

export interface ScanProjectReport {
  passed: boolean;
  scannerAvailable: boolean;
  threshold: number;
  results: Array<{ name: string; status: ScanStatus; riskScore: number | null }>;
  reportsDir: string;
}

export async function scanProject(options: ScanProjectOptions): Promise<ScanProjectReport> {
  const { projectDir, scanner } = options;
  const threshold = options.threshold ?? 50;
  const useLlm = options.useLlm ?? false;
  const requireScanner = options.requireScanner ?? false;

  const lock = await readLock(projectDir);
  const reportsDir = join(projectDir, "safety-reports");
  await mkdir(reportsDir, { recursive: true });

  const available = await scanner.isAvailable();
  const scannedAt = new Date().toISOString();
  const results: ScanProjectReport["results"] = [];

  if (!available) {
    if (requireScanner) {
      throw new Error(
        `Security scanner "${scanner.name}" is not installed, but --require-scanner was set. ` +
          `Install it (e.g. pip install skillspector) and retry.`,
      );
    }
    for (const skill of lock.skills) {
      skill.scan.status = "skipped";
      skill.scan.threshold = threshold;
      skill.scan.scannedAt = scannedAt;
      results.push({ name: skill.name, status: "skipped", riskScore: null });
    }
    await persist(projectDir, lock, reportsDir, {
      scannerAvailable: false,
      threshold,
      results,
    });
    return { passed: true, scannerAvailable: false, threshold, results, reportsDir };
  }

  let passed = true;
  for (const skill of lock.skills) {
    const skillDir = join(projectDir, ".bwai", "skills", skill.name);
    const result = await scanner.scan(skillDir, { useLlm });
    const status: ScanStatus = result.riskScore > threshold ? "failed" : "passed";
    if (status === "failed") passed = false;

    skill.scan = {
      status,
      riskScore: result.riskScore,
      scanMode: result.scanMode,
      threshold,
      scannedAt,
    };
    results.push({ name: skill.name, status, riskScore: result.riskScore });

    await writeFile(
      join(reportsDir, `${skill.name}.json`),
      `${JSON.stringify({ skill: skill.name, threshold, ...result }, null, 2)}\n`,
      "utf8",
    );
  }

  await persist(projectDir, lock, reportsDir, {
    scannerAvailable: true,
    threshold,
    results,
  });
  return { passed, scannerAvailable: true, threshold, results, reportsDir };
}

async function persist(
  projectDir: string,
  lock: SkillsLock,
  reportsDir: string,
  summary: {
    scannerAvailable: boolean;
    threshold: number;
    results: ScanProjectReport["results"];
  },
): Promise<void> {
  await writeLock(projectDir, lock);
  const lines: string[] = [];
  lines.push(`# Safety Report`);
  lines.push("");
  lines.push(`- Boilerplate: \`${lock.boilerplate}\``);
  lines.push(`- Scanner available: ${summary.scannerAvailable ? "yes" : "no"}`);
  lines.push(`- Threshold: risk score must be <= ${summary.threshold}`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`| Skill | Status | Risk score |`);
  lines.push(`| --- | --- | --- |`);
  for (const r of summary.results) {
    lines.push(`| ${r.name} | ${r.status} | ${r.riskScore ?? "n/a"} |`);
  }
  lines.push("");
  if (!summary.scannerAvailable) {
    lines.push(
      "> SkillSpector was not found on PATH, so skills were not scanned. " +
        "Install it with `pip install skillspector` and re-run `bwai scan-project`, " +
        "or pass `--require-scanner` to make a missing scanner fail the gate.",
    );
  }
  await writeFile(join(reportsDir, "summary.md"), `${lines.join("\n")}\n`, "utf8");
}

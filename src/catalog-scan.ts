import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listBoilerplates } from "./catalog.js";
import { defaultBoilerplatesDir, defaultSharedSkillsDir, packageRoot } from "./paths.js";
import { scanSkillDirectory, type SkillScanner, type ScanResult } from "./scan.js";

export interface CatalogSkillTarget {
  id: string;
  label: string;
  dir: string;
}

export interface CatalogScanResult {
  name: string;
  id: string;
  riskScore: number | null;
  status: "passed" | "failed" | "skipped";
  findings: number;
}

export interface CatalogScanReport {
  passed: boolean;
  scannerAvailable: boolean;
  threshold: number;
  reportsDir: string;
  results: CatalogScanResult[];
}

async function isSkillDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory() && (await stat(join(path, "SKILL.md"))).isFile();
  } catch {
    return false;
  }
}

/** Discover every skill directory shipped in this catalog repo. */
export async function listCatalogSkillTargets(
  opts: { boilerplatesDir?: string; sharedSkillsDir?: string } = {},
): Promise<CatalogSkillTarget[]> {
  const sharedDir = opts.sharedSkillsDir ?? defaultSharedSkillsDir();
  const boilerplatesDir = opts.boilerplatesDir ?? defaultBoilerplatesDir();
  const targets: CatalogSkillTarget[] = [];

  try {
    for (const name of (await readdir(sharedDir)).sort()) {
      const dir = join(sharedDir, name);
      if (await isSkillDirectory(dir)) {
        targets.push({ id: `shared-${name}`, label: `shared/${name}`, dir });
      }
    }
  } catch {
    // no shared dir
  }

  for (const bp of await listBoilerplates(boilerplatesDir)) {
    let entries: string[] = [];
    try {
      entries = await readdir(bp.skillsDir);
    } catch {
      continue;
    }
    for (const name of entries.sort()) {
      const dir = join(bp.skillsDir, name);
      if (await isSkillDirectory(dir)) {
        targets.push({
          id: `${bp.manifest.name}-${name}`,
          label: `boilerplate/${bp.manifest.name}/${name}`,
          dir,
        });
      }
    }
  }

  return targets;
}

function safeReportBasename(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export interface ScanCatalogOptions {
  scanner: SkillScanner;
  threshold?: number;
  useLlm?: boolean;
  requireScanner?: boolean;
  reportsDir?: string;
  boilerplatesDir?: string;
  sharedSkillsDir?: string;
}

export async function scanCatalog(options: ScanCatalogOptions): Promise<CatalogScanReport> {
  const threshold = options.threshold ?? 30;
  const useLlm = options.useLlm ?? false;
  const requireScanner = options.requireScanner ?? false;
  const reportsDir = options.reportsDir ?? join(packageRoot(), "safety-reports", "catalog");
  const targets = await listCatalogSkillTargets(options);

  await mkdir(reportsDir, { recursive: true });

  const available = await options.scanner.isAvailable();
  if (!available && requireScanner) {
    throw new Error(
      `Security scanner "${options.scanner.name}" is not installed, but --require-scanner was set. ` +
        `Install with: uv tool install git+https://github.com/NVIDIA/skillspector.git`,
    );
  }

  const results: CatalogScanResult[] = [];
  let passed = true;

  if (!available) {
    for (const target of targets) {
      results.push({
        name: target.label,
        id: target.id,
        riskScore: null,
        status: "skipped",
        findings: 0,
      });
    }
    await writeCatalogSummary(reportsDir, { threshold, scannerAvailable: false, results });
    return { passed: true, scannerAvailable: false, threshold, reportsDir, results };
  }

  for (const target of targets) {
    const scan = await scanSkillDirectory(options.scanner, target.dir, { useLlm });
    const status = scan.riskScore > threshold ? "failed" : "passed";
    if (status === "failed") passed = false;

    results.push({
      name: target.label,
      id: target.id,
      riskScore: scan.riskScore,
      status,
      findings: scan.findings,
    });

    const base = safeReportBasename(target.id);
    await writeFile(
      join(reportsDir, `${base}.json`),
      `${JSON.stringify({ skill: target.label, threshold, ...scan }, null, 2)}\n`,
      "utf8",
    );
    if (scan.sarif) {
      await writeFile(join(reportsDir, `${base}.sarif`), `${scan.sarif}\n`, "utf8");
    }
  }

  await writeCatalogSummary(reportsDir, { threshold, scannerAvailable: true, results });
  return { passed, scannerAvailable: true, threshold, reportsDir, results };
}

async function writeCatalogSummary(
  reportsDir: string,
  summary: {
    threshold: number;
    scannerAvailable: boolean;
    results: CatalogScanResult[];
  },
): Promise<void> {
  const lines: string[] = [
    "# Catalog Safety Report",
    "",
    `- Scanner available: ${summary.scannerAvailable ? "yes" : "no"}`,
    `- Threshold: risk score must be <= ${summary.threshold}`,
    `- Generated: ${new Date().toISOString()}`,
    "",
    "| Skill | Status | Risk score | Findings |",
    "| --- | --- | --- | --- |",
  ];
  for (const r of summary.results) {
    lines.push(`| ${r.name} | ${r.status} | ${r.riskScore ?? "n/a"} | ${r.findings ?? "n/a"} |`);
  }
  lines.push("");
  if (!summary.scannerAvailable) {
    lines.push(
      "> SkillSpector was not found on PATH. Install with " +
        "`uv tool install git+https://github.com/NVIDIA/skillspector.git`.",
    );
  }
  await writeFile(join(reportsDir, "summary.md"), `${lines.join("\n")}\n`, "utf8");
}

export type { ScanResult };

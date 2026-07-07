import { access, constants } from "node:fs/promises";
import { join } from "node:path";
import { listBoilerplates } from "./catalog.js";
import { SkillSpectorScanner } from "./scan.js";
import { readLock } from "./provenance.js";

export type DoctorStatus = "ok" | "warn" | "fail";

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  ok: boolean;
}

function nodeMajorVersion(): number {
  const match = /^v(\d+)/.exec(process.version);
  return match ? Number(match[1]) : 0;
}

async function pathReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command: string): Promise<boolean> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

/** Environment and project readiness checks for bwai-cli users. */
export async function runDoctor(cwd = process.cwd()): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  const major = nodeMajorVersion();
  if (major >= 20) {
    checks.push({
      name: "node",
      status: "ok",
      message: `Node.js ${process.version} (>= 20 required)`,
    });
  } else {
    checks.push({
      name: "node",
      status: "fail",
      message: `Node.js ${process.version} — upgrade to Node 20+`,
    });
  }

  try {
    const boilerplates = await listBoilerplates();
    checks.push({
      name: "catalog",
      status: boilerplates.length > 0 ? "ok" : "fail",
      message:
        boilerplates.length > 0
          ? `${boilerplates.length} boilerplate(s) in catalog`
          : "No boilerplates found — reinstall bwai-cli or run from repo root",
    });
  } catch (err) {
    checks.push({
      name: "catalog",
      status: "fail",
      message: `Catalog unreadable: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const scanner = new SkillSpectorScanner();
  if (await scanner.isAvailable()) {
    checks.push({
      name: "skillspector",
      status: "ok",
      message: "SkillSpector CLI available (`skillspector --version`)",
    });
  } else {
    checks.push({
      name: "skillspector",
      status: "warn",
      message:
        "SkillSpector not installed — scans will be skipped unless you pass --require-scanner. Install: uv tool install git+https://github.com/NVIDIA/skillspector.git",
    });
  }

  const lockPath = join(cwd, "skills.lock");
  if (await pathReadable(lockPath)) {
    try {
      const lock = await readLock(cwd);
      checks.push({
        name: "project",
        status: "ok",
        message: `skills.lock found (${lock.boilerplate}, ${lock.skills.length} skill(s)) — run \`bwai scan-project\` to refresh scans`,
      });
    } catch {
      checks.push({
        name: "project",
        status: "warn",
        message: "skills.lock present but invalid — regenerate with `bwai new` or fix lockfile",
      });
    }
  } else {
    checks.push({
      name: "project",
      status: "ok",
      message: "No skills.lock in this directory (not a bwai-scaffolded project yet)",
    });
  }

  if (await commandExists("getsuperpower")) {
    checks.push({
      name: "getsuperpower",
      status: "ok",
      message: "getsuperpower CLI on PATH — optional for workflow install",
    });
  } else {
    checks.push({
      name: "getsuperpower",
      status: "warn",
      message:
        "getsuperpower not on PATH — optional; use `npx getsuperpower install ./workflows/...` after scaffold",
    });
  }

  const ok = checks.every((c) => c.status !== "fail");
  return { checks, ok };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((c) => {
    const icon = c.status === "ok" ? "✓" : c.status === "warn" ? "!" : "✗";
    return `  ${icon} ${c.name}: ${c.message}`;
  });
  lines.push("");
  lines.push(report.ok ? "All required checks passed." : "Fix failed checks above.");
  return lines.join("\n");
}

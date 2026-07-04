import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../src/scaffold.js";
import { scanProject, type SkillScanner } from "../src/scan.js";
import { readLock } from "../src/provenance.js";

function fakeScanner(opts: {
  available: boolean;
  riskByName?: Record<string, number>;
}): SkillScanner {
  return {
    name: "fake",
    async isAvailable() {
      return opts.available;
    },
    async scan(skillDir) {
      const name = skillDir.split("/").pop() ?? "";
      const riskScore = opts.riskByName?.[name] ?? 0;
      return { riskScore, scanMode: "static", findings: riskScore > 0 ? 1 : 0 };
    },
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("scanProject", () => {
  let dir: string;
  let project: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bwai-scan-"));
    project = join(dir, "proj");
    await scaffold({ boilerplateName: "node-service", targetDir: project, agents: ["claude"] });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("passes when all skills are below threshold and writes reports", async () => {
    const report = await scanProject({
      projectDir: project,
      scanner: fakeScanner({ available: true, riskByName: { "code-review": 10 } }),
      threshold: 50,
    });
    expect(report.passed).toBe(true);
    expect(report.scannerAvailable).toBe(true);
    expect(await exists(join(project, "safety-reports", "summary.md"))).toBe(true);
    expect(await exists(join(project, "safety-reports", "code-review.json"))).toBe(true);

    const lock = await readLock(project);
    const cr = lock.skills.find((s) => s.name === "code-review");
    expect(cr?.scan.status).toBe("passed");
    expect(cr?.scan.riskScore).toBe(10);
  });

  it("fails the gate when a skill exceeds threshold", async () => {
    const report = await scanProject({
      projectDir: project,
      scanner: fakeScanner({ available: true, riskByName: { "code-review": 80 } }),
      threshold: 50,
    });
    expect(report.passed).toBe(false);
    const failed = report.results.find((r) => r.name === "code-review");
    expect(failed?.status).toBe("failed");
  });

  it("marks skills skipped when the scanner is unavailable", async () => {
    const report = await scanProject({
      projectDir: project,
      scanner: fakeScanner({ available: false }),
    });
    expect(report.passed).toBe(true);
    expect(report.scannerAvailable).toBe(false);
    expect(report.results.every((r) => r.status === "skipped")).toBe(true);
    const summary = await readFile(join(project, "safety-reports", "summary.md"), "utf8");
    expect(summary).toMatch(/not found on PATH/i);
  });

  it("throws when scanner is unavailable and requireScanner is set", async () => {
    await expect(
      scanProject({
        projectDir: project,
        scanner: fakeScanner({ available: false }),
        requireScanner: true,
      }),
    ).rejects.toThrow(/not installed/);
  });
});

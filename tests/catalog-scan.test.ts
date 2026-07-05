import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listCatalogSkillTargets, scanCatalog } from "../src/catalog-scan.js";
import type { SkillScanner } from "../src/scan.js";

function fakeScanner(opts: {
  available: boolean;
  riskByLabel?: Record<string, number>;
  sarif?: string;
}): SkillScanner {
  return {
    name: "fake",
    async isAvailable() {
      return opts.available;
    },
    async scan(skillDir) {
      const name = skillDir.split("/").pop() ?? "";
      const riskScore = opts.riskByLabel?.[name] ?? 0;
      return {
        riskScore,
        scanMode: "static",
        findings: riskScore > 0 ? 1 : 0,
        sarif: opts.sarif,
      };
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

describe("catalog scan", () => {
  it("discovers shared and local catalog skills", async () => {
    const targets = await listCatalogSkillTargets();
    const labels = targets.map((t) => t.label);
    expect(labels).toEqual(
      expect.arrayContaining(["shared/code-review", "shared/test-driven-development"]),
    );
    expect(labels.some((l) => l.startsWith("boilerplate/"))).toBe(true);
  });

  describe("scanCatalog", () => {
    let reportsDir: string;

    beforeEach(async () => {
      reportsDir = await mkdtemp(join(tmpdir(), "bwai-catalog-scan-"));
    });

    afterEach(async () => {
      await rm(reportsDir, { recursive: true, force: true });
    });

    it("passes when all skills are below threshold and writes SARIF", async () => {
      const sarif = JSON.stringify({ version: "2.1.0", runs: [] });
      const report = await scanCatalog({
        scanner: fakeScanner({ available: true, riskByLabel: {}, sarif }),
        threshold: 30,
        reportsDir,
      });
      expect(report.passed).toBe(true);
      expect(report.scannerAvailable).toBe(true);
      expect(report.results.length).toBeGreaterThan(0);
      expect(await exists(join(reportsDir, "summary.md"))).toBe(true);

      const first = report.results[0]!;
      const base = first.id.replace(/[^a-zA-Z0-9._-]+/g, "-");
      expect(await exists(join(reportsDir, `${base}.json`))).toBe(true);
      expect(await exists(join(reportsDir, `${base}.sarif`))).toBe(true);
      const written = await readFile(join(reportsDir, `${base}.sarif`), "utf8");
      expect(written).toContain("2.1.0");
    });

    it("fails when a skill exceeds threshold", async () => {
      const report = await scanCatalog({
        scanner: fakeScanner({
          available: true,
          riskByLabel: { "code-review": 99 },
        }),
        threshold: 30,
        reportsDir,
      });
      expect(report.passed).toBe(false);
      const failed = report.results.find((r) => r.name.includes("code-review"));
      expect(failed?.status).toBe("failed");
    });

    it("throws when scanner unavailable and requireScanner is set", async () => {
      await expect(
        scanCatalog({
          scanner: fakeScanner({ available: false }),
          requireScanner: true,
          reportsDir,
        }),
      ).rejects.toThrow(/not installed/);
    });
  });
});

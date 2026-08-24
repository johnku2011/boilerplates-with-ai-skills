import { describe, it, expect } from "vitest";
import { runDoctor, formatDoctorReport } from "../src/doctor.js";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCatalogFixture } from "./catalog-fixture.js";

describe("doctor", () => {
  it("returns checks including node, catalog, and global-advisor", async () => {
    const report = await runDoctor();
    expect(report.checks.length).toBeGreaterThanOrEqual(5);
    expect(report.checks.some((c) => c.name === "node")).toBe(true);
    expect(report.checks.some((c) => c.name === "catalog")).toBe(true);
    expect(report.checks.some((c) => c.name === "global-advisor")).toBe(true);
    const node = report.checks.find((c) => c.name === "node");
    expect(node?.status).toBe("ok");
    const catalog = report.checks.find((c) => c.name === "catalog");
    expect(catalog?.status).toBe("ok");
  });

  it("formats report as text", async () => {
    const report = await runDoctor();
    const text = formatDoctorReport(report);
    expect(text).toContain("node:");
    expect(text).toContain("catalog:");
  });

  it("reports accumulated catalog diagnostics as a failed check", async () => {
    const root = await mkdtemp(join(tmpdir(), "bwai-doctor-catalog-"));
    try {
      const fixture = await createCatalogFixture(root);
      const broken = join(fixture.boilerplatesDir, "broken");
      await mkdir(broken, { recursive: true });
      await writeFile(join(broken, "boilerplate.json"), "{bad-json", "utf8");

      const report = await runDoctor(root, { catalogRoots: fixture });
      const catalog = report.checks.find((check) => check.name === "catalog");
      expect(catalog?.status).toBe("fail");
      expect(catalog?.message).toContain("1 error");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

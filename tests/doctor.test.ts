import { describe, it, expect } from "vitest";
import { runDoctor, formatDoctorReport } from "../src/doctor.js";

describe("doctor", () => {
  it("returns checks including node and catalog", async () => {
    const report = await runDoctor();
    expect(report.checks.length).toBeGreaterThanOrEqual(4);
    expect(report.checks.some((c) => c.name === "node")).toBe(true);
    expect(report.checks.some((c) => c.name === "catalog")).toBe(true);
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
});

import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { defaultBoilerplatesDir } from "../src/paths.js";

const CANONICAL = join(process.cwd(), "shared", "ci", "skill-scan.yml");

describe("template CI workflow", () => {
  it("canonical skill-scan.yml exists", async () => {
    const content = await readFile(CANONICAL, "utf8");
    expect(content).toContain("npx --yes bwai-cli scan-project");
    expect(content).toContain("--require-scanner");
  });

  it("every boilerplate template ships the same skill-scan workflow", async () => {
    const canonical = await readFile(CANONICAL, "utf8");
    const boilerplatesDir = defaultBoilerplatesDir();
    const names = await readdir(boilerplatesDir, { withFileTypes: true });
    const boilerplateNames = names.filter((d) => d.isDirectory()).map((d) => d.name);

    expect(boilerplateNames.length).toBeGreaterThan(0);

    for (const name of boilerplateNames) {
      const workflowPath = join(
        boilerplatesDir,
        name,
        "template",
        ".github",
        "workflows",
        "skill-scan.yml",
      );
      const content = await readFile(workflowPath, "utf8");
      expect(content).toBe(canonical);
    }
  });
});

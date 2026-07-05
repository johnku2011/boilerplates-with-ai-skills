import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRegistryFromCatalog, loadRegistry, saveRegistry } from "../src/registry.js";
import { syncSkills } from "../src/sync-skills.js";
import { promoteSkill } from "../src/promote.js";
import type { SkillScanner } from "../src/scan.js";

function fakeScanner(risk = 0): SkillScanner {
  return {
    name: "fake",
    async isAvailable() {
      return true;
    },
    async scan() {
      return { riskScore: risk, scanMode: "static", findings: 0 };
    },
  };
}

describe("registry", () => {
  let dir: string;
  let registryPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bwai-registry-"));
    registryPath = join(dir, "skills-index.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("builds an index from the repo catalog", async () => {
    const index = await buildRegistryFromCatalog({ registryPath });
    expect(index.indexVersion).toBe(1);
    expect(index.skills.some((s) => s.name === "code-review")).toBe(true);
    expect(index.skills.every((s) => s.sha256.length === 64)).toBe(true);
  });

  it("round-trips through save and load", async () => {
    const index = await buildRegistryFromCatalog({ registryPath });
    await saveRegistry(index, registryPath);
    const loaded = await loadRegistry(registryPath);
    expect(loaded.skills.length).toBe(index.skills.length);
  });
});

describe("syncSkills", () => {
  it("adds bundleAll shared skills to boilerplate manifests", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-sync-"));
    try {
      const registryPath = join(dir, "registry.json");
      const sharedDir = join(dir, "shared", "skills", "project-security");
      await mkdir(sharedDir, { recursive: true });
      await cp(
        join(process.cwd(), "shared/skills/project-security/SKILL.md"),
        join(sharedDir, "SKILL.md"),
      );

      const bpDir = join(dir, "boilerplates", "demo");
      await mkdir(join(bpDir, "template"), { recursive: true });
      await mkdir(join(bpDir, "skills"), { recursive: true });
      await writeFile(
        join(bpDir, "boilerplate.json"),
        `${JSON.stringify(
          {
            name: "demo",
            description: "demo",
            stack: "demo",
            version: "0.1.0",
            defaultAgents: ["claude"],
            skills: [],
          },
          null,
          2,
        )}\n`,
      );

      await saveRegistry(
        {
          indexVersion: 1,
          updatedAt: new Date().toISOString(),
          skills: [
            {
              name: "project-security",
              catalogLocation: "shared",
              catalogPath: "shared/skills/project-security",
              promotedAt: new Date().toISOString(),
              sha256: "abc",
              scan: { status: "pending", riskScore: null, scannedAt: null, threshold: 30 },
              bundleAll: true,
              bundledIn: [],
            },
          ],
        },
        registryPath,
      );

      const result = await syncSkills({
        registryPath,
        boilerplatesDir: join(dir, "boilerplates"),
      });
      expect(result.addedToBoilerplates).toEqual([
        { boilerplate: "demo", skill: "project-security" },
      ]);

      const manifest = JSON.parse(await readFile(join(bpDir, "boilerplate.json"), "utf8")) as {
        skills: Array<{ name: string; source: string }>;
      };
      expect(manifest.skills).toEqual([{ name: "project-security", source: "shared" }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("promoteSkill", () => {
  it("copies a local skill into shared and updates the registry", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-promote-"));
    try {
      const source = join(dir, "source", "demo-skill");
      await mkdir(source, { recursive: true });
      await writeFile(
        join(source, "SKILL.md"),
        "---\nname: demo-skill\ndescription: demo\n---\n\n# Demo\n",
      );

      const sharedDir = join(dir, "shared", "skills");
      const registryPath = join(dir, "registry.json");

      const result = await promoteSkill({
        skillName: "demo-skill",
        fromPath: source,
        scanner: fakeScanner(0),
        sharedSkillsDir: sharedDir,
        registryPath,
      });

      expect(result.dryRun).toBe(false);
      expect(await readFile(join(sharedDir, "demo-skill", "SKILL.md"), "utf8")).toContain("# Demo");
      const index = await loadRegistry(registryPath);
      expect(index.skills.some((s) => s.name === "demo-skill")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("blocks promotion when risk exceeds threshold", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-promote-block-"));
    try {
      const source = join(dir, "source", "risky-skill");
      await mkdir(source, { recursive: true });
      await writeFile(join(source, "SKILL.md"), "---\nname: risky\ndescription: x\n---\n");

      await expect(
        promoteSkill({
          skillName: "risky-skill",
          fromPath: source,
          scanner: fakeScanner(99),
          threshold: 30,
          sharedSkillsDir: join(dir, "shared", "skills"),
          registryPath: join(dir, "registry.json"),
        }),
      ).rejects.toThrow(/exceeds threshold/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

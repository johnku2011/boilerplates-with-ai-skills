import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyCatalogScanToRegistry,
  buildRegistryFromCatalog,
  loadRegistry,
  saveRegistry,
} from "../src/registry.js";
import { syncSkills } from "../src/sync-skills.js";
import { promoteSkill } from "../src/promote.js";
import type { SkillScanner } from "../src/scan.js";
import { CatalogValidationError, loadCatalogSnapshot } from "../src/catalog-snapshot.js";
import {
  boilerplateManifest,
  createCatalogFixture,
  writeBoilerplate,
  writeSkill,
} from "./catalog-fixture.js";

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
    expect(index.indexVersion).toBe(2);
    expect(index.skills.some((s) => s.name === "code-review")).toBe(true);
    expect(index.skills.find((s) => s.name === "code-review")?.id).toBe("shared:code-review");
    expect(index.skills.every((s) => s.sha256.length === 64)).toBe(true);
  });

  it("round-trips through save and load", async () => {
    const index = await buildRegistryFromCatalog({ registryPath });
    await saveRegistry(index, registryPath);
    const loaded = await loadRegistry(registryPath);
    expect(loaded.skills.length).toBe(index.skills.length);
  });

  it("loads a version 1 registry and migrates it in memory", async () => {
    await writeFile(
      registryPath,
      `${JSON.stringify({
        indexVersion: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        skills: [
          {
            name: "code-review",
            catalogLocation: "shared",
            catalogPath: "shared/skills/code-review",
            promotedAt: "2026-01-01T00:00:00.000Z",
            sha256: "abc",
            scan: { status: "pending", riskScore: null, scannedAt: null, threshold: 30 },
            bundleAll: false,
            bundledIn: [],
          },
        ],
      })}\n`,
      "utf8",
    );

    const migrated = await loadRegistry(registryPath);
    expect(migrated.indexVersion).toBe(2);
    expect(migrated.skills[0]?.id).toBe("shared:code-review");
    await saveRegistry(migrated, registryPath);
    expect(JSON.parse(await readFile(registryPath, "utf8")).indexVersion).toBe(2);
  });

  it("rejects conflicting local ownership during version 1 migration", async () => {
    await writeFile(
      registryPath,
      `${JSON.stringify({
        indexVersion: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        skills: [
          {
            name: "logger",
            catalogLocation: "local",
            catalogPath: "boilerplates/alpha/skills/logger",
            promotedAt: "2026-01-01T00:00:00.000Z",
            sha256: "abc",
            scan: { status: "pending", riskScore: null, scannedAt: null, threshold: 30 },
            bundledIn: ["beta"],
          },
        ],
      })}\n`,
      "utf8",
    );
    await expect(loadRegistry(registryPath)).rejects.toThrow(/conflicting|ambiguous/i);
  });

  it("does not ignore a malformed existing registry during rebuild", async () => {
    await writeFile(registryPath, "{bad-json", "utf8");
    await expect(buildRegistryFromCatalog({ registryPath })).rejects.toThrow();
    expect(await readFile(registryPath, "utf8")).toBe("{bad-json");
  });

  it("preserves same-named local skills under different canonical identities", async () => {
    const fixture = await createCatalogFixture(join(dir, "catalog"));
    for (const name of ["alpha", "beta"]) {
      const boilerplateDir = await writeBoilerplate(
        fixture,
        name,
        boilerplateManifest(name, [{ name: "logger", source: "local" }]),
      );
      await writeSkill(join(boilerplateDir, "skills", "logger"), "logger");
    }
    const snapshot = await loadCatalogSnapshot(fixture);

    const index = await buildRegistryFromCatalog({ registryPath, snapshot });

    expect(index.skills.map((skill) => skill.id)).toEqual(
      expect.arrayContaining(["boilerplate:alpha/skills/logger", "boilerplate:beta/skills/logger"]),
    );
  });

  it("applies scan results by canonical identity", async () => {
    const index = await buildRegistryFromCatalog({ registryPath });
    const updated = applyCatalogScanToRegistry(index, [
      {
        id: "shared:code-review",
        label: "presentation-label-that-does-not-match",
        riskScore: 12,
        status: "passed",
      },
    ]);

    expect(updated.skills.find((skill) => skill.id === "shared:code-review")?.scan.riskScore).toBe(
      12,
    );
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
          indexVersion: 2,
          updatedAt: new Date().toISOString(),
          skills: [
            {
              id: "shared:project-security",
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

  it("validates custom catalog roots before changing manifests", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-sync-invalid-"));
    try {
      const fixture = await createCatalogFixture(join(dir, "catalog"));
      const boilerplateDir = await writeBoilerplate(
        fixture,
        "demo",
        boilerplateManifest("demo", [{ name: "code-review", source: "shared" }]),
      );
      const registryPath = join(dir, "registry.json");
      await saveRegistry(
        {
          indexVersion: 2,
          updatedAt: new Date().toISOString(),
          skills: [
            {
              id: "shared:project-security",
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

      await expect(syncSkills({ registryPath, catalogRoots: fixture })).rejects.toBeInstanceOf(
        CatalogValidationError,
      );
      const manifest = JSON.parse(
        await readFile(join(boilerplateDir, "boilerplate.json"), "utf8"),
      ) as { skills: Array<{ name: string }> };
      expect(manifest.skills.map((skill) => skill.name)).toEqual(["code-review"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("promoteSkill", () => {
  it("copies a local skill into shared and updates the registry", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-promote-"));
    try {
      const fixture = await createCatalogFixture(join(dir, "catalog"));
      const source = join(dir, "source", "demo-skill");
      await mkdir(source, { recursive: true });
      await writeFile(
        join(source, "SKILL.md"),
        "---\nname: demo-skill\ndescription: Use when testing skill promotion into the shared catalog.\nlicense: MIT\n---\n\n# Demo\n",
      );

      const registryPath = join(dir, "registry.json");

      const result = await promoteSkill({
        skillName: "demo-skill",
        fromPath: source,
        scanner: fakeScanner(0),
        catalogRoots: fixture,
        registryPath,
      });

      expect(result.dryRun).toBe(false);
      expect(
        await readFile(join(fixture.sharedSkillsDir, "demo-skill", "SKILL.md"), "utf8"),
      ).toContain("# Demo");
      const index = await loadRegistry(registryPath);
      expect(index.skills.some((s) => s.name === "demo-skill")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("blocks promotion when risk exceeds threshold", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-promote-block-"));
    try {
      const fixture = await createCatalogFixture(join(dir, "catalog"));
      const source = join(dir, "source", "risky-skill");
      await mkdir(source, { recursive: true });
      await writeFile(
        join(source, "SKILL.md"),
        "---\nname: risky-skill\ndescription: Use when testing promote risk threshold blocking.\nlicense: MIT\n---\n",
      );

      await expect(
        promoteSkill({
          skillName: "risky-skill",
          fromPath: source,
          scanner: fakeScanner(99),
          threshold: 30,
          catalogRoots: fixture,
          registryPath: join(dir, "registry.json"),
        }),
      ).rejects.toThrow(/exceeds threshold/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("validates existing catalog state before copying a promoted skill", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bwai-promote-invalid-"));
    try {
      const fixture = await createCatalogFixture(join(dir, "catalog"));
      await writeBoilerplate(
        fixture,
        "demo",
        boilerplateManifest("demo", [{ name: "code-review", source: "shared" }]),
      );
      const source = join(dir, "source", "demo-skill");
      await writeSkill(source, "demo-skill");

      await expect(
        promoteSkill({
          skillName: "demo-skill",
          fromPath: source,
          scanner: fakeScanner(),
          registryPath: join(dir, "registry.json"),
          catalogRoots: fixture,
        }),
      ).rejects.toBeInstanceOf(CatalogValidationError);
      await expect(
        readFile(join(fixture.sharedSkillsDir, "demo-skill", "SKILL.md")),
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

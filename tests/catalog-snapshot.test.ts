import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertValidCatalog,
  CatalogValidationError,
  loadCatalogSnapshot,
  type CatalogDiagnosticCode,
} from "../src/catalog-snapshot.js";
import {
  boilerplateManifest,
  createCatalogFixture,
  writeBoilerplate,
  writeSkill,
  writeWorkflow,
} from "./catalog-fixture.js";

const roots: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "bwai-catalog-snapshot-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("loadCatalogSnapshot", () => {
  it("loads valid artifacts with canonical identities and freezes the result", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    await writeSkill(join(fixture.sharedSkillsDir, "code-review"), "code-review");
    await writeBoilerplate(
      fixture,
      "demo",
      boilerplateManifest("demo", [{ name: "code-review", source: "shared" }]),
    );

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.valid).toBe(true);
    expect(snapshot.skills.map((skill) => skill.id)).toContain("shared:code-review");
    expect(snapshot.boilerplates.map((boilerplate) => boilerplate.id)).toContain(
      "boilerplate:demo",
    );
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.skills)).toBe(true);
  });

  it("retains malformed boilerplate discoveries and reports a diagnostic", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    const dir = join(fixture.boilerplatesDir, "broken");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "boilerplate.json"), "{not-json", "utf8");

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.valid).toBe(false);
    expect(snapshot.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "boilerplate", path: dir, valid: false }),
      ]),
    );
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_BOILERPLATE_MANIFEST",
    );
  });

  it("turns unreadable catalog roots into diagnostics", async () => {
    const root = await newRoot();
    const snapshot = await loadCatalogSnapshot({
      boilerplatesDir: join(root, "missing-boilerplates"),
      sharedSkillsDir: join(root, "missing-skills"),
      sharedWorkflowsDir: join(root, "missing-workflows"),
    });

    expect(snapshot.valid).toBe(false);
    expect(
      snapshot.diagnostics.filter((diagnostic) => diagnostic.code === "CATALOG_ROOT_UNREADABLE"),
    ).toHaveLength(3);
  });

  it.each<{
    title: string;
    code: CatalogDiagnosticCode;
    arrange: (fixture: Awaited<ReturnType<typeof createCatalogFixture>>) => Promise<void>;
  }>([
    {
      title: "missing declared shared skill",
      code: "MISSING_DECLARED_SKILL",
      arrange: async (fixture) => {
        await writeBoilerplate(
          fixture,
          "demo",
          boilerplateManifest("demo", [{ name: "absent", source: "shared" }]),
        );
      },
    },
    {
      title: "undeclared local skill",
      code: "UNDECLARED_LOCAL_SKILL",
      arrange: async (fixture) => {
        const dir = await writeBoilerplate(fixture, "demo", boilerplateManifest("demo"));
        await writeSkill(join(dir, "skills", "logger"), "logger");
      },
    },
    {
      title: "duplicate declaration",
      code: "DUPLICATE_SKILL_DECLARATION",
      arrange: async (fixture) => {
        await writeSkill(join(fixture.sharedSkillsDir, "logger"), "logger");
        await writeBoilerplate(
          fixture,
          "demo",
          boilerplateManifest("demo", [
            { name: "logger", source: "shared" },
            { name: "logger", source: "shared" },
          ]),
        );
      },
    },
    {
      title: "shared and local install-name collision",
      code: "SKILL_INSTALL_NAME_COLLISION",
      arrange: async (fixture) => {
        await writeSkill(join(fixture.sharedSkillsDir, "logger"), "logger");
        const dir = await writeBoilerplate(
          fixture,
          "demo",
          boilerplateManifest("demo", [
            { name: "logger", source: "shared" },
            { name: "logger", source: "local" },
          ]),
        );
        await writeSkill(join(dir, "skills", "logger"), "logger");
      },
    },
    {
      title: "missing declared workflow",
      code: "MISSING_DECLARED_WORKFLOW",
      arrange: async (fixture) => {
        await writeBoilerplate(
          fixture,
          "demo",
          boilerplateManifest("demo", [], { name: "delivery", source: "shared" }),
        );
      },
    },
    {
      title: "directory and manifest mismatch",
      code: "BOILERPLATE_NAME_MISMATCH",
      arrange: async (fixture) => {
        await writeBoilerplate(fixture, "folder-name", boilerplateManifest("manifest-name"));
      },
    },
  ])("reports $title", async ({ arrange, code }) => {
    const fixture = await createCatalogFixture(await newRoot());
    await arrange(fixture);

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(code);
  });

  it("allows equal local skill names in different boilerplates", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    for (const boilerplateName of ["alpha", "beta"]) {
      const dir = await writeBoilerplate(
        fixture,
        boilerplateName,
        boilerplateManifest(boilerplateName, [{ name: "logger", source: "local" }]),
      );
      await writeSkill(join(dir, "skills", "logger"), "logger");
    }

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.valid).toBe(true);
    expect(snapshot.skills.map((skill) => skill.id)).toEqual(
      expect.arrayContaining(["boilerplate:alpha/skills/logger", "boilerplate:beta/skills/logger"]),
    );
  });

  it("resolves valid shared workflow metadata", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    await writeWorkflow(join(fixture.sharedWorkflowsDir, "delivery"), "delivery");
    await writeBoilerplate(
      fixture,
      "demo",
      boilerplateManifest("demo", [], { name: "delivery", source: "shared" }),
    );

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.valid).toBe(true);
    expect(snapshot.workflows[0]?.id).toBe("shared:workflows/delivery");
    expect(snapshot.boilerplates[0]?.workflow?.id).toBe("shared:workflows/delivery");
  });

  it("rejects a boilerplate without a template directory", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    const dir = await writeBoilerplate(fixture, "demo", boilerplateManifest("demo"));
    await rm(join(dir, "template"), { recursive: true, force: true });

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain("MISSING_TEMPLATE");
    expect(snapshot.boilerplates).toHaveLength(0);
  });

  it("reports duplicate canonical artifact identities", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    await writeBoilerplate(fixture, "demo", boilerplateManifest("demo"));
    await writeBoilerplate(fixture, "duplicate-folder", boilerplateManifest("demo"));

    const snapshot = await loadCatalogSnapshot(fixture);

    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "DUPLICATE_ARTIFACT_IDENTITY",
    );
  });

  it("orders diagnostics by path and code and exposes all errors from the gate", async () => {
    const fixture = await createCatalogFixture(await newRoot());
    await writeBoilerplate(
      fixture,
      "zeta",
      boilerplateManifest("wrong", [{ name: "absent", source: "shared" }]),
    );
    const localDir = await writeBoilerplate(fixture, "alpha", boilerplateManifest("alpha"));
    await writeSkill(join(localDir, "skills", "orphan"), "orphan");

    const snapshot = await loadCatalogSnapshot(fixture);
    const sorted = [...snapshot.diagnostics].sort(
      (a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code),
    );

    expect(snapshot.diagnostics).toEqual(sorted);
    expect(() => assertValidCatalog(snapshot)).toThrow(CatalogValidationError);
    try {
      assertValidCatalog(snapshot);
    } catch (error) {
      expect((error as CatalogValidationError).diagnostics).toHaveLength(
        snapshot.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
      );
    }
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCatalogSnapshot } from "../src/catalog-snapshot.js";
import {
  boilerplateManifest,
  createCatalogFixture,
  writeBoilerplate,
  writeSkill,
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
});

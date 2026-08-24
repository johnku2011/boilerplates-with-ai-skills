import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CatalogValidationError,
  formatCatalogError,
  loadCatalogSnapshot,
} from "../src/catalog-snapshot.js";
import { runListBoilerplates } from "../src/list-boilerplates-command.js";
import { boilerplateManifest, createCatalogFixture, writeBoilerplate } from "./catalog-fixture.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("runListBoilerplates", () => {
  it("prints valid entries and diagnostics, then returns failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "bwai-cli-list-"));
    roots.push(root);
    const fixture = await createCatalogFixture(root);
    await writeBoilerplate(fixture, "demo", boilerplateManifest("demo"));
    const broken = join(fixture.boilerplatesDir, "broken");
    await mkdir(broken, { recursive: true });
    await writeFile(join(broken, "boilerplate.json"), "{bad-json", "utf8");
    const snapshot = await loadCatalogSnapshot(fixture);
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runListBoilerplates({
      loadSnapshot: async () => snapshot,
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
    });

    expect(stdout.join("\n")).toContain("demo");
    expect(stderr.join("\n")).toContain("INVALID_BOILERPLATE_MANIFEST");
    expect(exitCode).toBe(1);
  });

  it("formats every diagnostic for strict command catches", async () => {
    const root = await mkdtemp(join(tmpdir(), "bwai-cli-errors-"));
    roots.push(root);
    const fixture = await createCatalogFixture(root);
    await writeBoilerplate(
      fixture,
      "demo",
      boilerplateManifest("wrong", [{ name: "missing", source: "shared" }]),
    );
    const snapshot = await loadCatalogSnapshot(fixture);
    expect(formatCatalogError(new CatalogValidationError(snapshot.diagnostics))).toEqual(
      snapshot.diagnostics.map((d) => `${d.code} ${d.path}: ${d.message}`),
    );
  });
});

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertValidCatalog,
  catalogRootsFromOptions,
  loadCatalogSnapshot,
  type CatalogRoots,
} from "./catalog-snapshot.js";
import {
  buildRegistryFromCatalog,
  loadRegistryIfExists,
  saveRegistry,
  type RegistrySkill,
  type SkillsIndex,
} from "./registry.js";
import { defaultBoilerplatesDir, defaultRegistryPath } from "./paths.js";
import type { BoilerplateManifest } from "./schema.js";

export interface SyncSkillsOptions {
  registryPath?: string;
  boilerplatesDir?: string;
  sharedSkillsDir?: string;
  sharedWorkflowsDir?: string;
  catalogRoots?: Partial<CatalogRoots>;
  dryRun?: boolean;
}

export interface SyncSkillsResult {
  registryPath: string;
  addedToBoilerplates: Array<{ boilerplate: string; skill: string }>;
  registrySkillCount: number;
  dryRun: boolean;
}

function manifestHasSkill(
  manifest: { readonly skills: readonly { readonly name: string }[] },
  skillName: string,
): boolean {
  return manifest.skills.some((s) => s.name === skillName);
}

function skillsToBundle(skill: RegistrySkill, allBoilerplateNames: string[]): string[] {
  if (skill.catalogLocation !== "shared") return skill.bundledIn;
  if (skill.bundleAll) return allBoilerplateNames;
  return skill.bundledIn;
}

export async function syncSkills(opts: SyncSkillsOptions = {}): Promise<SyncSkillsResult> {
  const registryPath = opts.registryPath ?? defaultRegistryPath();
  const dryRun = Boolean(opts.dryRun);
  const catalogRoots = catalogRootsFromOptions(opts);
  let snapshot = await loadCatalogSnapshot(catalogRoots);
  assertValidCatalog(snapshot);

  const index: SkillsIndex =
    (await loadRegistryIfExists(registryPath)) ??
    (await buildRegistryFromCatalog({ registryPath, snapshot }));

  const boilerplates = snapshot.boilerplates;
  const allNames = boilerplates.map((b) => b.manifest.name);
  const addedToBoilerplates: SyncSkillsResult["addedToBoilerplates"] = [];

  for (const bp of boilerplates) {
    let changed = false;
    const manifest = { ...bp.manifest, skills: [...bp.manifest.skills] };

    for (const skill of index.skills) {
      if (skill.catalogLocation !== "shared") continue;
      const targets = skillsToBundle(skill, allNames);
      if (!targets.includes(bp.manifest.name)) continue;
      if (manifestHasSkill(manifest, skill.name)) continue;

      manifest.skills.push({ name: skill.name, source: "shared" });
      addedToBoilerplates.push({ boilerplate: bp.manifest.name, skill: skill.name });
      changed = true;
    }

    if (changed && !dryRun) {
      const manifestPath = join(bp.dir, "boilerplate.json");
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
  }

  if (!dryRun) {
    snapshot = await loadCatalogSnapshot(catalogRoots);
    assertValidCatalog(snapshot);
  }
  const rebuilt = await buildRegistryFromCatalog({ registryPath, existing: index, snapshot });
  if (!dryRun) {
    await saveRegistry(rebuilt, registryPath);
  }

  return {
    registryPath,
    addedToBoilerplates,
    registrySkillCount: rebuilt.skills.length,
    dryRun,
  };
}

/** Read boilerplate manifest from disk (for tests). */
export async function readBoilerplateManifest(
  boilerplateName: string,
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<BoilerplateManifest> {
  const snapshot = await loadCatalogSnapshot({ boilerplatesDir });
  assertValidCatalog(snapshot);
  const bp = snapshot.boilerplates.find((b) => b.manifest.name === boilerplateName);
  if (!bp) throw new Error(`Unknown boilerplate: ${boilerplateName}`);
  const raw = await readFile(join(bp.dir, "boilerplate.json"), "utf8");
  return JSON.parse(raw) as BoilerplateManifest;
}

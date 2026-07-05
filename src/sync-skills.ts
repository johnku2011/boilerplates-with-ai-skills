import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listBoilerplates } from "./catalog.js";
import {
  buildRegistryFromCatalog,
  loadRegistry,
  saveRegistry,
  type RegistrySkill,
  type SkillsIndex,
} from "./registry.js";
import { defaultBoilerplatesDir, defaultRegistryPath } from "./paths.js";
import type { BoilerplateManifest } from "./schema.js";

export interface SyncSkillsOptions {
  registryPath?: string;
  boilerplatesDir?: string;
  dryRun?: boolean;
}

export interface SyncSkillsResult {
  registryPath: string;
  addedToBoilerplates: Array<{ boilerplate: string; skill: string }>;
  registrySkillCount: number;
  dryRun: boolean;
}

function manifestHasSkill(manifest: BoilerplateManifest, skillName: string): boolean {
  return manifest.skills.some((s) => s.name === skillName);
}

function skillsToBundle(skill: RegistrySkill, allBoilerplateNames: string[]): string[] {
  if (skill.catalogLocation !== "shared") return skill.bundledIn;
  if (skill.bundleAll) return allBoilerplateNames;
  return skill.bundledIn;
}

export async function syncSkills(opts: SyncSkillsOptions = {}): Promise<SyncSkillsResult> {
  const registryPath = opts.registryPath ?? defaultRegistryPath();
  const boilerplatesDir = opts.boilerplatesDir ?? defaultBoilerplatesDir();
  const dryRun = Boolean(opts.dryRun);

  let index: SkillsIndex;
  try {
    index = await loadRegistry(registryPath);
  } catch {
    index = await buildRegistryFromCatalog({ registryPath });
  }

  const boilerplates = await listBoilerplates(boilerplatesDir);
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

  const rebuilt = await buildRegistryFromCatalog({ registryPath, existing: index });
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
  const bp = (await listBoilerplates(boilerplatesDir)).find(
    (b) => b.manifest.name === boilerplateName,
  );
  if (!bp) throw new Error(`Unknown boilerplate: ${boilerplateName}`);
  const raw = await readFile(join(bp.dir, "boilerplate.json"), "utf8");
  return JSON.parse(raw) as BoilerplateManifest;
}

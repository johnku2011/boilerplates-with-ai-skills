import { join } from "node:path";
import { stat } from "node:fs/promises";
import type { BoilerplateManifest } from "./schema.js";
import { defaultSharedSkillsDir } from "./paths.js";

export type SkillRef = BoilerplateManifest["skills"][number];

export interface SkillCatalogPaths {
  boilerplateName: string;
  boilerplateSkillsDir: string;
  sharedSkillsDir?: string;
}

/**
 * Resolve the on-disk directory for a skill declared in boilerplate.json.
 * `local` → boilerplates/<name>/skills/<skill>
 * `shared` → shared/skills/<skill>
 */
export function resolveSkillDirectory(skill: SkillRef, paths: SkillCatalogPaths): string {
  const sharedDir = paths.sharedSkillsDir ?? defaultSharedSkillsDir();
  if (skill.source === "shared") {
    return join(sharedDir, skill.name);
  }
  return join(paths.boilerplateSkillsDir, skill.name);
}

/** Provenance string recorded in skills.lock for each installed skill. */
export function skillLockSource(skill: SkillRef, boilerplateName: string): string {
  if (skill.source === "shared") {
    return `shared:${skill.name}`;
  }
  return `boilerplate:${boilerplateName}/skills/${skill.name}`;
}

export async function assertSkillExists(skillDir: string, skillName: string): Promise<void> {
  const skillMd = join(skillDir, "SKILL.md");
  try {
    await stat(skillMd);
  } catch {
    throw new Error(`Skill not found: ${skillName} (expected ${skillMd})`);
  }
}

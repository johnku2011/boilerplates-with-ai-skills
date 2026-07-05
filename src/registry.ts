import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { listCatalogSkillTargets } from "./catalog-scan.js";
import { listBoilerplates } from "./catalog.js";
import { sha256 } from "./provenance.js";
import { defaultRegistryPath } from "./paths.js";
import { scanStatusSchema } from "./schema.js";
import type { ScanStatus } from "./schema.js";

const upstreamSchema = z.object({
  url: z.string().url(),
  /** Path within the upstream repo to the skill directory (contains SKILL.md). */
  path: z.string().optional(),
  ref: z.string().optional(),
});

export const registrySkillSchema = z.object({
  name: z.string(),
  /** Where the skill lives in this repo catalog. */
  catalogLocation: z.enum(["shared", "local"]),
  catalogPath: z.string(),
  description: z.string().optional(),
  upstream: upstreamSchema.optional(),
  promotedAt: z.string(),
  promotedFrom: z.string().optional(),
  sha256: z.string(),
  scan: z.object({
    status: scanStatusSchema,
    riskScore: z.number().nullable(),
    scannedAt: z.string().nullable(),
    threshold: z.number(),
  }),
  /** When true, sync-skills adds this shared skill to every boilerplate manifest. */
  bundleAll: z.boolean().default(false),
  /** Boilerplate names that bundle this skill (ignored when bundleAll is true). */
  bundledIn: z.array(z.string()).default([]),
});

export type RegistrySkill = z.infer<typeof registrySkillSchema>;

export const skillsIndexSchema = z.object({
  indexVersion: z.literal(1),
  updatedAt: z.string(),
  skills: z.array(registrySkillSchema),
});

export type SkillsIndex = z.infer<typeof skillsIndexSchema>;

export interface RegistryOptions {
  registryPath?: string;
}

function parseSkillDescription(skillMd: string): string | undefined {
  const match = skillMd.match(/^---\s*\n[\s\S]*?description:\s*(.+?)\s*\n[\s\S]*?---/m);
  return match?.[1]?.trim();
}

/** Build a fresh index by walking the on-disk catalog and boilerplate manifests. */
export async function buildRegistryFromCatalog(
  opts: RegistryOptions & {
    existing?: SkillsIndex;
    defaultThreshold?: number;
  } = {},
): Promise<SkillsIndex> {
  const registryPath = opts.registryPath ?? defaultRegistryPath();
  const existing = opts.existing ?? (await loadRegistry(registryPath).catch(() => null));
  const existingByName = new Map(existing?.skills.map((s) => [s.name, s]) ?? []);
  const defaultThreshold = opts.defaultThreshold ?? 30;

  const boilerplates = await listBoilerplates();
  const bundledInBySkill = new Map<string, Set<string>>();
  for (const bp of boilerplates) {
    for (const skill of bp.manifest.skills) {
      const set = bundledInBySkill.get(skill.name) ?? new Set<string>();
      set.add(bp.manifest.name);
      bundledInBySkill.set(skill.name, set);
    }
  }

  const targets = await listCatalogSkillTargets();
  const skills: RegistrySkill[] = [];

  for (const target of targets) {
    const skillName = target.dir.split("/").pop() ?? target.id;
    const isShared = target.label.startsWith("shared/");
    const catalogLocation = isShared ? ("shared" as const) : ("local" as const);
    const catalogPath = isShared
      ? `shared/skills/${skillName}`
      : target.label
          .replace(/^boilerplate\//, "boilerplates/")
          .replace(/\/[^/]+$/, `/skills/${skillName}`);

    const skillMd = await readFile(join(target.dir, "SKILL.md"), "utf8");
    const prev = existingByName.get(skillName);

    skills.push({
      name: skillName,
      catalogLocation,
      catalogPath,
      description: parseSkillDescription(skillMd) ?? prev?.description,
      upstream: prev?.upstream,
      promotedAt: prev?.promotedAt ?? existing?.updatedAt ?? new Date().toISOString(),
      promotedFrom: prev?.promotedFrom,
      sha256: sha256(skillMd),
      scan: prev?.scan ?? {
        status: "pending",
        riskScore: null,
        scannedAt: null,
        threshold: defaultThreshold,
      },
      bundleAll: prev?.bundleAll ?? false,
      bundledIn: prev?.bundleAll
        ? boilerplates.map((b) => b.manifest.name)
        : [...(bundledInBySkill.get(skillName) ?? [])].sort(),
    });
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return {
    indexVersion: 1,
    updatedAt: new Date().toISOString(),
    skills,
  };
}

export async function loadRegistry(registryPath = defaultRegistryPath()): Promise<SkillsIndex> {
  const raw = await readFile(registryPath, "utf8");
  return skillsIndexSchema.parse(JSON.parse(raw));
}

export async function saveRegistry(
  index: SkillsIndex,
  registryPath = defaultRegistryPath(),
): Promise<void> {
  const validated = skillsIndexSchema.parse(index);
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

/** Merge scan results from catalog scan into the registry index. */
export function applyCatalogScanToRegistry(
  index: SkillsIndex,
  scanResults: Array<{ id: string; label: string; riskScore: number | null; status: string }>,
): SkillsIndex {
  const byLabel = new Map(scanResults.map((r) => [r.label, r]));
  const skills = index.skills.map((skill) => {
    const label =
      skill.catalogLocation === "shared"
        ? `shared/${skill.name}`
        : skill.bundledIn[0]
          ? `boilerplate/${skill.bundledIn[0]}/${skill.name}`
          : null;
    if (!label) return skill;
    const scan = byLabel.get(label);
    if (!scan || scan.riskScore === null) return skill;
    const status: ScanStatus =
      scan.status === "passed" ? "passed" : scan.status === "failed" ? "failed" : "skipped";
    return {
      ...skill,
      scan: {
        status,
        riskScore: scan.riskScore,
        scannedAt: new Date().toISOString(),
        threshold: skill.scan.threshold,
      },
    };
  });
  return { ...index, updatedAt: new Date().toISOString(), skills };
}

export function findRegistrySkill(index: SkillsIndex, name: string): RegistrySkill | undefined {
  return index.skills.find((s) => s.name === name);
}

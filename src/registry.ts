import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  assertValidCatalog,
  loadCatalogSnapshot,
  type CatalogRoots,
  type CatalogSnapshot,
} from "./catalog-snapshot.js";
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

const registrySkillV1Schema = z.object({
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

export const registrySkillSchema = registrySkillV1Schema.extend({
  /** Stable, scope-qualified identity from the catalog snapshot. */
  id: z.string().min(1),
});

export type RegistrySkill = z.infer<typeof registrySkillSchema>;

const skillsIndexV1Schema = z.object({
  indexVersion: z.literal(1),
  updatedAt: z.string(),
  skills: z.array(registrySkillV1Schema),
});

export const skillsIndexSchema = z.object({
  indexVersion: z.literal(2),
  updatedAt: z.string(),
  skills: z.array(registrySkillSchema),
});

export type SkillsIndex = z.infer<typeof skillsIndexSchema>;

export interface RegistryOptions {
  registryPath?: string;
}

function migrateSkillId(skill: z.infer<typeof registrySkillV1Schema>): string {
  if (skill.catalogLocation === "shared") return `shared:${skill.name}`;

  const pathMatch = skill.catalogPath.match(/^boilerplates[/\\]([^/\\]+)[/\\]skills[/\\]/);
  const onlyBundledOwner = skill.bundledIn.length === 1 ? skill.bundledIn.at(0) : undefined;
  const boilerplateName = pathMatch?.[1] ?? onlyBundledOwner;
  if (!boilerplateName) {
    throw new Error(
      `Cannot migrate local registry skill "${skill.name}": catalogPath does not identify a boilerplate and bundledIn is ambiguous`,
    );
  }
  return `boilerplate:${boilerplateName}/skills/${skill.name}`;
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
    snapshot?: CatalogSnapshot;
    catalogRoots?: Partial<CatalogRoots>;
  } = {},
): Promise<SkillsIndex> {
  const registryPath = opts.registryPath ?? defaultRegistryPath();
  const existing = opts.existing ?? (await loadRegistry(registryPath).catch(() => null));
  const existingById = new Map(existing?.skills.map((skill) => [skill.id, skill]) ?? []);
  const defaultThreshold = opts.defaultThreshold ?? 30;
  const snapshot = opts.snapshot ?? (await loadCatalogSnapshot(opts.catalogRoots));
  assertValidCatalog(snapshot);
  const skills: RegistrySkill[] = [];

  for (const skill of snapshot.skills) {
    const catalogLocation = skill.scope === "shared" ? ("shared" as const) : ("local" as const);
    const catalogPath =
      skill.scope === "shared"
        ? `shared/skills/${skill.name}`
        : `boilerplates/${skill.boilerplateName}/skills/${skill.name}`;
    const declaredIn = snapshot.boilerplates
      .filter((boilerplate) =>
        boilerplate.manifest.skills.some(
          (declaration) =>
            declaration.name === skill.name &&
            declaration.source === skill.scope &&
            (skill.scope === "shared" || boilerplate.manifest.name === skill.boilerplateName),
        ),
      )
      .map((boilerplate) => boilerplate.manifest.name)
      .sort();
    const skillMd = await readFile(join(skill.dir, "SKILL.md"), "utf8");
    const prev = existingById.get(skill.id);

    skills.push({
      id: skill.id,
      name: skill.name,
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
        ? snapshot.boilerplates.map((boilerplate) => boilerplate.manifest.name).sort()
        : declaredIn,
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));
  return {
    indexVersion: 2,
    updatedAt: new Date().toISOString(),
    skills,
  };
}

export async function loadRegistry(registryPath = defaultRegistryPath()): Promise<SkillsIndex> {
  const raw = await readFile(registryPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const version = z.object({ indexVersion: z.number() }).parse(parsed).indexVersion;
  if (version === 2) return skillsIndexSchema.parse(parsed);
  if (version === 1) {
    const legacy = skillsIndexV1Schema.parse(parsed);
    return skillsIndexSchema.parse({
      indexVersion: 2,
      updatedAt: legacy.updatedAt,
      skills: legacy.skills.map((skill) => ({ ...skill, id: migrateSkillId(skill) })),
    });
  }
  throw new Error(`Unsupported registry index version: ${version}`);
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
  const byId = new Map(scanResults.map((result) => [result.id, result]));
  const skills = index.skills.map((skill) => {
    const scan = byId.get(skill.id);
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

export function findRegistrySkill(index: SkillsIndex, id: string): RegistrySkill | undefined {
  return index.skills.find((skill) => skill.id === id);
}

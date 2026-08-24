import { cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanupClone, cloneGitRepo, findSkillDirectory } from "./git.js";
import { sha256 } from "./provenance.js";
import { defaultRegistryPath } from "./paths.js";
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
import { scanSkillDirectory, type SkillScanner } from "./scan.js";

export interface UpstreamSyncOptions {
  registryPath?: string;
  sharedSkillsDir?: string;
  boilerplatesDir?: string;
  sharedWorkflowsDir?: string;
  catalogRoots?: Partial<CatalogRoots>;
  scanner: SkillScanner;
  threshold?: number;
  requireScanner?: boolean;
  /** When false (default), only report drift without writing files. */
  apply?: boolean;
  dryRun?: boolean;
  skillName?: string;
}

export interface UpstreamSyncEntry {
  name: string;
  status: "unchanged" | "drift" | "updated" | "skipped" | "failed";
  localSha256?: string;
  upstreamSha256?: string;
  resolvedRef?: string;
  riskScore?: number | null;
  message?: string;
}

export interface UpstreamSyncResult {
  entries: UpstreamSyncEntry[];
  registryPath: string;
  applied: boolean;
}

function skillHasUpstream(skill: RegistrySkill): boolean {
  return Boolean(skill.upstream?.url);
}

async function readSkillSha(skillDir: string): Promise<string> {
  const content = await readFile(join(skillDir, "SKILL.md"), "utf8");
  return sha256(content);
}

export async function syncUpstreamSkills(opts: UpstreamSyncOptions): Promise<UpstreamSyncResult> {
  const registryPath = opts.registryPath ?? defaultRegistryPath();
  const threshold = opts.threshold ?? 30;
  const apply = Boolean(opts.apply);
  const dryRun = Boolean(opts.dryRun);
  const catalogRoots = catalogRootsFromOptions(opts);
  let snapshot = await loadCatalogSnapshot(catalogRoots);
  assertValidCatalog(snapshot);

  const index: SkillsIndex =
    (await loadRegistryIfExists(registryPath)) ??
    (await buildRegistryFromCatalog({ registryPath, snapshot }));

  const selectedSkills = index.skills.filter(
    (skill) =>
      skill.catalogLocation === "shared" &&
      skill.id === `shared:${skill.name}` &&
      (!opts.skillName || skill.name === opts.skillName),
  );
  if (opts.skillName && selectedSkills.length > 1) {
    throw new Error(`Ambiguous shared skill name: ${opts.skillName}`);
  }

  const available = await opts.scanner.isAvailable();
  if (opts.requireScanner && !available) {
    throw new Error(
      "SkillSpector is required but not installed. " +
        "Install with: uv tool install git+https://github.com/NVIDIA/skillspector.git",
    );
  }

  const entries: UpstreamSyncEntry[] = [];
  let indexChanged = false;

  for (const skill of selectedSkills) {
    if (!skillHasUpstream(skill)) continue;

    const upstream = skill.upstream!;
    const catalogSkill = snapshot.skills.find((entry) => entry.id === skill.id);
    if (!catalogSkill) {
      throw new Error(`Registry skill is missing from the catalog snapshot: ${skill.id}`);
    }
    const localDir = catalogSkill.dir;
    let localDigest: string;
    try {
      localDigest = await readSkillSha(localDir);
    } catch {
      localDigest = "";
    }

    let cloneDir: string | undefined;
    try {
      const cloned = await cloneGitRepo(upstream.url, upstream.ref);
      cloneDir = cloned.dir;
      const upstreamSkillDir = await findSkillDirectory(cloned.dir, upstream.path);
      const upstreamDigest = await readSkillSha(upstreamSkillDir);

      if (upstreamDigest === localDigest) {
        entries.push({
          name: skill.name,
          status: "unchanged",
          localSha256: localDigest,
          upstreamSha256: upstreamDigest,
          resolvedRef: cloned.resolvedRef,
        });
        continue;
      }

      entries.push({
        name: skill.name,
        status: "drift",
        localSha256: localDigest,
        upstreamSha256: upstreamDigest,
        resolvedRef: cloned.resolvedRef,
        message: apply ? undefined : "upstream differs; pass --apply to pull after scan",
      });

      if (!apply || dryRun) continue;

      let riskScore: number | null = null;
      if (available) {
        const scan = await scanSkillDirectory(opts.scanner, upstreamSkillDir, { useLlm: false });
        riskScore = scan.riskScore;
        if (riskScore > threshold) {
          entries[entries.length - 1] = {
            name: skill.name,
            status: "failed",
            localSha256: localDigest,
            upstreamSha256: upstreamDigest,
            resolvedRef: cloned.resolvedRef,
            riskScore,
            message: `upstream risk score ${riskScore} exceeds threshold ${threshold}`,
          };
          continue;
        }
      }

      await cp(upstreamSkillDir, localDir, { recursive: true, force: true });
      const now = new Date().toISOString();
      skill.sha256 = upstreamDigest;
      skill.upstream = { ...upstream, ref: cloned.resolvedRef };
      skill.scan = {
        status: available ? "passed" : "skipped",
        riskScore,
        scannedAt: available ? now : null,
        threshold,
      };
      indexChanged = true;

      entries[entries.length - 1] = {
        name: skill.name,
        status: "updated",
        localSha256: localDigest,
        upstreamSha256: upstreamDigest,
        resolvedRef: cloned.resolvedRef,
        riskScore,
      };
    } catch (error) {
      entries.push({
        name: skill.name,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (cloneDir) await cleanupClone(cloneDir);
    }
  }

  if (indexChanged && !dryRun) {
    snapshot = await loadCatalogSnapshot(catalogRoots);
    assertValidCatalog(snapshot);
    const rebuilt = await buildRegistryFromCatalog({ registryPath, existing: index, snapshot });
    await saveRegistry(rebuilt, registryPath);
  }

  return { entries, registryPath, applied: apply && !dryRun && indexChanged };
}

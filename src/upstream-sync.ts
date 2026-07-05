import { cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanupClone, cloneGitRepo, findSkillDirectory } from "./git.js";
import { sha256 } from "./provenance.js";
import { defaultRegistryPath, defaultSharedSkillsDir } from "./paths.js";
import {
  buildRegistryFromCatalog,
  loadRegistry,
  saveRegistry,
  type RegistrySkill,
  type SkillsIndex,
} from "./registry.js";
import { scanSkillDirectory, type SkillScanner } from "./scan.js";

export interface UpstreamSyncOptions {
  registryPath?: string;
  sharedSkillsDir?: string;
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
  const sharedSkillsDir = opts.sharedSkillsDir ?? defaultSharedSkillsDir();
  const threshold = opts.threshold ?? 30;
  const apply = Boolean(opts.apply);
  const dryRun = Boolean(opts.dryRun);

  let index: SkillsIndex;
  try {
    index = await loadRegistry(registryPath);
  } catch {
    index = await buildRegistryFromCatalog({ registryPath });
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

  for (const skill of index.skills) {
    if (opts.skillName && skill.name !== opts.skillName) continue;
    if (!skillHasUpstream(skill)) continue;
    if (skill.catalogLocation !== "shared") {
      entries.push({
        name: skill.name,
        status: "skipped",
        message: "upstream sync applies to shared catalog skills only",
      });
      continue;
    }

    const upstream = skill.upstream!;
    const localDir = join(sharedSkillsDir, skill.name);
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

      const targetDir = join(sharedSkillsDir, skill.name);
      await cp(upstreamSkillDir, targetDir, { recursive: true, force: true });
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
    const rebuilt = await buildRegistryFromCatalog({ registryPath, existing: index });
    await saveRegistry(rebuilt, registryPath);
  }

  return { entries, registryPath, applied: apply && !dryRun && indexChanged };
}

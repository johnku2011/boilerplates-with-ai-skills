import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { getBoilerplate, listBoilerplates } from "./catalog.js";
import {
  buildRegistryFromCatalog,
  findRegistrySkill,
  loadRegistry,
  saveRegistry,
  type RegistrySkill,
  type SkillsIndex,
} from "./registry.js";
import { defaultBoilerplatesDir, defaultRegistryPath, defaultSharedSkillsDir } from "./paths.js";
import { sha256 } from "./provenance.js";
import { assertSkillExists } from "./skills.js";
import { scanSkillDirectory, type SkillScanner } from "./scan.js";

export type PromoteTarget = { kind: "shared" } | { kind: "boilerplate"; name: string };

export interface PromoteOptions {
  skillName: string;
  fromPath?: string;
  fromUrl?: string;
  target?: PromoteTarget;
  threshold?: number;
  scanner: SkillScanner;
  requireScanner?: boolean;
  dryRun?: boolean;
  promotedFrom?: string;
  registryPath?: string;
  sharedSkillsDir?: string;
  boilerplatesDir?: string;
}

export interface PromoteResult {
  skillName: string;
  targetDir: string;
  target: PromoteTarget;
  riskScore: number | null;
  sha256: string;
  registryPath: string;
  dryRun: boolean;
}

function runGitClone(url: string, dest: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("git", ["clone", "--depth", "1", url, dest], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`git clone failed with exit code ${code}`));
    });
  });
}

async function findSkillMdRoot(dir: string): Promise<string> {
  const direct = join(dir, "SKILL.md");
  try {
    await stat(direct);
    return dir;
  } catch {
    // search one level deep
  }
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nested = join(dir, entry.name, "SKILL.md");
    try {
      await stat(nested);
      return join(dir, entry.name);
    } catch {
      // continue
    }
  }
  throw new Error(`No SKILL.md found under ${dir}`);
}

async function resolveSourceDir(opts: PromoteOptions): Promise<{ dir: string; cleanup?: string }> {
  if (opts.fromPath) {
    const dir = resolve(opts.fromPath);
    await assertSkillExists(dir, opts.skillName);
    return { dir };
  }
  if (opts.fromUrl) {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const temp = await mkdtemp(join(tmpdir(), "bwai-promote-"));
    await runGitClone(opts.fromUrl, temp);
    const skillRoot = await findSkillMdRoot(temp);
    return { dir: skillRoot, cleanup: temp };
  }
  throw new Error("Provide --from <path> or --from-url <git-url> for the skill source.");
}

function resolveTargetDir(opts: PromoteOptions): string {
  const target = opts.target ?? { kind: "shared" };
  if (target.kind === "shared") {
    return join(opts.sharedSkillsDir ?? defaultSharedSkillsDir(), opts.skillName);
  }
  const boilerplatesDir = opts.boilerplatesDir ?? defaultBoilerplatesDir();
  return join(boilerplatesDir, target.name, "skills", opts.skillName);
}

function parsePromoteTarget(raw: string | undefined): PromoteTarget {
  if (!raw || raw === "shared") return { kind: "shared" };
  if (raw.startsWith("boilerplate:")) {
    return { kind: "boilerplate", name: raw.slice("boilerplate:".length) };
  }
  throw new Error(`Invalid --target: ${raw} (expected shared or boilerplate:<name>)`);
}

export { parsePromoteTarget };

export async function promoteSkill(opts: PromoteOptions): Promise<PromoteResult> {
  const threshold = opts.threshold ?? 30;
  const target = opts.target ?? { kind: "shared" };
  const registryPath = opts.registryPath ?? defaultRegistryPath();

  if (target.kind === "boilerplate") {
    await getBoilerplate(target.name, opts.boilerplatesDir);
  }

  const { dir: sourceDir, cleanup } = await resolveSourceDir(opts);
  try {
    const available = await opts.scanner.isAvailable();
    if (!available && opts.requireScanner) {
      throw new Error(
        "SkillSpector is required but not installed. " +
          "Install with: uv tool install git+https://github.com/NVIDIA/skillspector.git",
      );
    }

    let riskScore: number | null = null;
    let scanStatus: RegistrySkill["scan"]["status"] = "pending";
    if (available) {
      const scan = await scanSkillDirectory(opts.scanner, sourceDir, { useLlm: false });
      riskScore = scan.riskScore;
      if (riskScore > threshold) {
        throw new Error(
          `Skill risk score ${riskScore} exceeds threshold ${threshold}. Promotion blocked.`,
        );
      }
      scanStatus = "passed";
    } else if (opts.requireScanner) {
      throw new Error("SkillSpector is required but not available.");
    } else {
      scanStatus = "skipped";
    }

    const targetDir = resolveTargetDir({ ...opts, target });
    const skillMd = await readFile(join(sourceDir, "SKILL.md"), "utf8");
    const digest = sha256(skillMd);

    if (!opts.dryRun) {
      await mkdir(targetDir, { recursive: true });
      await cp(sourceDir, targetDir, { recursive: true, force: true });

      if (target.kind === "boilerplate") {
        await addSkillToBoilerplateManifest(target.name, opts.skillName, opts.boilerplatesDir);
      }

      let index: SkillsIndex;
      try {
        index = await loadRegistry(registryPath);
      } catch {
        index = await buildRegistryFromCatalog({ registryPath });
      }

      const now = new Date().toISOString();
      const catalogPath =
        target.kind === "shared"
          ? `shared/skills/${opts.skillName}`
          : `boilerplates/${target.name}/skills/${opts.skillName}`;

      const entry: RegistrySkill = {
        name: opts.skillName,
        catalogLocation: target.kind === "shared" ? "shared" : "local",
        catalogPath,
        description: skillMd.match(/description:\s*(.+)/)?.[1]?.trim(),
        promotedAt: now,
        promotedFrom: opts.promotedFrom ?? opts.fromUrl ?? opts.fromPath,
        sha256: digest,
        scan: {
          status: scanStatus,
          riskScore,
          scannedAt: available ? now : null,
          threshold,
        },
        bundleAll: false,
        bundledIn: target.kind === "boilerplate" ? [target.name] : [],
      };

      const others = index.skills.filter((s) => s.name !== opts.skillName);
      others.push(entry);
      others.sort((a, b) => a.name.localeCompare(b.name));
      await saveRegistry({ ...index, updatedAt: now, skills: others }, registryPath);
    }

    return {
      skillName: opts.skillName,
      targetDir,
      target,
      riskScore,
      sha256: digest,
      registryPath,
      dryRun: Boolean(opts.dryRun),
    };
  } finally {
    if (cleanup) await rm(cleanup, { recursive: true, force: true });
  }
}

async function addSkillToBoilerplateManifest(
  boilerplateName: string,
  skillName: string,
  boilerplatesDir?: string,
): Promise<void> {
  const bp = await getBoilerplate(boilerplateName, boilerplatesDir);
  const manifestPath = join(bp.dir, "boilerplate.json");
  const manifest = bp.manifest;
  if (manifest.skills.some((s) => s.name === skillName)) return;
  manifest.skills.push({ name: skillName, source: "local" });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

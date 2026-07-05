import { cp, mkdir, readdir, rename, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { getBoilerplate } from "./catalog.js";
import { AGENT_TARGETS, type AgentId } from "./agents.js";
import { sha256, writeLock } from "./provenance.js";
import type { LockedSkill, SkillsLock } from "./schema.js";
import { defaultBoilerplatesDir, defaultSharedSkillsDir } from "./paths.js";
import { assertSkillExists, resolveSkillDirectory, skillLockSource } from "./skills.js";

export interface ScaffoldOptions {
  boilerplateName: string;
  targetDir: string;
  agents: AgentId[];
  boilerplatesDir?: string;
}

export interface ScaffoldResult {
  targetDir: string;
  boilerplate: string;
  agents: AgentId[];
  skills: string[];
  lock: SkillsLock;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function assertUsableTarget(targetDir: string): Promise<void> {
  if (!(await pathExists(targetDir))) return;
  const entries = await readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { boilerplateName, targetDir, agents } = options;
  const boilerplatesDir = options.boilerplatesDir ?? defaultBoilerplatesDir();
  const boilerplate = await getBoilerplate(boilerplateName, boilerplatesDir);

  await assertUsableTarget(targetDir);
  await mkdir(targetDir, { recursive: true });

  // 1. Copy the template files into the new project.
  await cp(boilerplate.templateDir, targetDir, { recursive: true });

  // Templates ship `.gitignore` as `gitignore` so it is not swallowed by
  // tooling; restore the dotfile name in the generated project.
  const templatedGitignore = join(targetDir, "gitignore");
  if (await pathExists(templatedGitignore)) {
    await rename(templatedGitignore, join(targetDir, ".gitignore"));
  }

  // 2. Install skills: keep a canonical copy under `.bwai/skills/` and mirror
  //    into each requested agent's skill target.
  const canonicalRoot = join(targetDir, ".bwai", "skills");
  await mkdir(canonicalRoot, { recursive: true });

  const lockedSkills: LockedSkill[] = [];

  const catalogPaths = {
    boilerplateName: boilerplate.manifest.name,
    boilerplateSkillsDir: boilerplate.skillsDir,
    sharedSkillsDir: defaultSharedSkillsDir(),
  };

  for (const skill of boilerplate.manifest.skills) {
    const sourceSkillDir = resolveSkillDirectory(skill, catalogPaths);
    await assertSkillExists(sourceSkillDir, skill.name);
    const canonicalDir = join(canonicalRoot, skill.name);
    await cp(sourceSkillDir, canonicalDir, { recursive: true });

    const skillMd = await readFile(join(canonicalDir, "SKILL.md"), "utf8");

    const installedTo: string[] = [];
    const seenTargets = new Set<string>();
    for (const agent of agents) {
      const agentSkillsDir = join(targetDir, AGENT_TARGETS[agent]);
      const destination = join(agentSkillsDir, skill.name);
      if (seenTargets.has(destination)) continue;
      seenTargets.add(destination);
      await mkdir(agentSkillsDir, { recursive: true });
      await cp(canonicalDir, destination, { recursive: true });
      installedTo.push(relative(targetDir, destination));
    }

    lockedSkills.push({
      name: skill.name,
      source: skillLockSource(skill, boilerplate.manifest.name),
      sha256: sha256(skillMd),
      installedTo,
      scan: {
        status: "pending",
        riskScore: null,
        scanMode: null,
        threshold: 50,
        scannedAt: null,
      },
    });
  }

  const lock: SkillsLock = {
    lockfileVersion: 1,
    boilerplate: boilerplate.manifest.name,
    generatedAt: new Date().toISOString(),
    agents,
    skills: lockedSkills,
  };
  await writeLock(targetDir, lock);

  return {
    targetDir,
    boilerplate: boilerplate.manifest.name,
    agents,
    skills: lockedSkills.map((s) => s.name),
    lock,
  };
}

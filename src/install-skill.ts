import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentId } from "./agents.js";
import { defaultSharedSkillsDir } from "./paths.js";
import { assertSkillExists } from "./skills.js";

/** Global install roots (under the user's home directory). */
export const GLOBAL_AGENT_TARGETS: Record<AgentId, string> = {
  claude: ".claude/skills",
  cursor: ".cursor/skills",
  codex: ".codex/skills",
  copilot: ".agents/skills",
  opencode: ".agents/skills",
};

/** Companion skills that should install with a primary skill when --with-deps. */
export const SKILL_DEPENDENCIES: Record<string, string[]> = {
  "bwai-advisor": ["startup-goal"],
};

export interface InstallSkillOptions {
  skillName: string;
  agents: AgentId[];
  /** Override home directory (tests). Defaults to os.homedir(). */
  homeDir?: string;
  /** Also install SKILL_DEPENDENCIES for this skill. Default true for CLI. */
  withDeps?: boolean;
  sharedSkillsDir?: string;
}

export interface InstalledSkillPath {
  skill: string;
  agent: AgentId;
  path: string;
}

export interface InstallSkillResult {
  installed: InstalledSkillPath[];
}

export async function listInstallableSkills(
  sharedSkillsDir: string = defaultSharedSkillsDir(),
): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(sharedSkillsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await stat(join(sharedSkillsDir, entry.name, "SKILL.md"));
      names.push(entry.name);
    } catch {
      // skip non-skill dirs
    }
  }
  return names.sort();
}

async function copySkillToAgents(
  skillName: string,
  sourceDir: string,
  agents: AgentId[],
  homeDir: string,
): Promise<InstalledSkillPath[]> {
  const installed: InstalledSkillPath[] = [];
  const seenDest = new Set<string>();

  for (const agent of agents) {
    const relative = GLOBAL_AGENT_TARGETS[agent];
    const destination = join(homeDir, relative, skillName);
    if (seenDest.has(destination)) continue;
    seenDest.add(destination);

    await mkdir(join(homeDir, relative), { recursive: true });
    await cp(sourceDir, destination, { recursive: true });
    installed.push({ skill: skillName, agent, path: destination });
  }
  return installed;
}

/**
 * Install a shared catalog skill into the user's global agent skill directories.
 */
export async function installSkill(opts: InstallSkillOptions): Promise<InstallSkillResult> {
  const sharedDir = opts.sharedSkillsDir ?? defaultSharedSkillsDir();
  const homeDir = opts.homeDir ?? homedir();
  const withDeps = opts.withDeps ?? true;
  const available = await listInstallableSkills(sharedDir);

  if (!available.includes(opts.skillName)) {
    throw new Error(
      `Unknown skill: ${opts.skillName}. Installable shared skills: ${available.join(", ") || "(none)"}.`,
    );
  }

  const toInstall = [opts.skillName];
  if (withDeps) {
    for (const dep of SKILL_DEPENDENCIES[opts.skillName] ?? []) {
      if (!toInstall.includes(dep)) toInstall.push(dep);
    }
  }

  const installed: InstalledSkillPath[] = [];
  for (const name of toInstall) {
    const sourceDir = join(sharedDir, name);
    await assertSkillExists(sourceDir, name);
    installed.push(...(await copySkillToAgents(name, sourceDir, opts.agents, homeDir)));
  }

  return { installed };
}

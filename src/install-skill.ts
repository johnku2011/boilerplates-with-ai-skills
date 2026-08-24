import { cp, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentId } from "./agents.js";
import {
  assertValidCatalog,
  catalogRootsFromOptions,
  loadCatalogSnapshot,
  type CatalogRoots,
  type CatalogSnapshot,
} from "./catalog-snapshot.js";

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
  catalogRoots?: Partial<CatalogRoots>;
}

export interface InstalledSkillPath {
  skill: string;
  agent: AgentId;
  path: string;
}

export interface InstallSkillResult {
  installed: InstalledSkillPath[];
}

export interface InstallableSkillOptions {
  sharedSkillsDir?: string;
  catalogRoots?: Partial<CatalogRoots>;
}

async function loadInstallCatalog(options: InstallableSkillOptions = {}): Promise<CatalogSnapshot> {
  const snapshot = await loadCatalogSnapshot(catalogRootsFromOptions(options));
  assertValidCatalog(snapshot);
  return snapshot;
}

export async function listInstallableSkills(
  options: InstallableSkillOptions | string = {},
): Promise<string[]> {
  const normalized = typeof options === "string" ? { sharedSkillsDir: options } : options;
  const snapshot = await loadInstallCatalog(normalized);
  return snapshot.skills
    .filter((skill) => skill.scope === "shared")
    .map((skill) => skill.name)
    .sort();
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
  const homeDir = opts.homeDir ?? homedir();
  const withDeps = opts.withDeps ?? true;
  const snapshot = await loadInstallCatalog(opts);
  const sharedSkills = snapshot.skills.filter((skill) => skill.scope === "shared");
  const available = sharedSkills.map((skill) => skill.name).sort();

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
    const skill = sharedSkills.find((entry) => entry.name === name);
    if (!skill) throw new Error(`Missing companion skill in catalog: ${name}`);
    installed.push(...(await copySkillToAgents(name, skill.dir, opts.agents, homeDir)));
  }

  return { installed };
}

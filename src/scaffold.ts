import { cp, mkdir, readdir, rename, readFile, stat, appendFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { getBoilerplate } from "./catalog.js";
import { AGENT_TARGETS, type AgentId } from "./agents.js";
import { sha256, writeLock } from "./provenance.js";
import type { LockedSkill, SkillsLock } from "./schema.js";
import { defaultBoilerplatesDir, defaultSharedSkillsDir } from "./paths.js";
import { assertSkillExists, resolveSkillDirectory, skillLockSource } from "./skills.js";
import {
  assertWorkflowExists,
  resolveWorkflowDirectory,
  workflowAgentsSnippet,
} from "./workflows.js";

export interface ScaffoldOptions {
  boilerplateName: string;
  targetDir: string;
  agents: AgentId[];
  boilerplatesDir?: string;
  /** Override manifest workflow by name, or false to skip. */
  workflow?: string | false;
}

export interface ScaffoldResult {
  targetDir: string;
  boilerplate: string;
  agents: AgentId[];
  skills: string[];
  lock: SkillsLock;
  workflow?: string;
  workflowPath?: string;
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

async function installWorkflow(
  targetDir: string,
  workflowName: string,
  sourceDir: string,
): Promise<string> {
  await assertWorkflowExists(sourceDir, workflowName);
  const destDir = join(targetDir, "workflows", workflowName);
  await mkdir(join(targetDir, "workflows"), { recursive: true });
  await cp(sourceDir, destDir, { recursive: true });
  return relative(targetDir, destDir);
}

function resolveManifestWorkflow(
  boilerplate: Awaited<ReturnType<typeof getBoilerplate>>,
  workflowOverride: string | false | undefined,
): { name: string; sourceDir: string } | undefined {
  if (workflowOverride === false) return undefined;

  const manifestWorkflow = boilerplate.manifest.workflow;
  if (workflowOverride) {
    const source = manifestWorkflow?.source ?? "shared";
    const workflow = { name: workflowOverride, source };
    const sourceDir = resolveWorkflowDirectory(workflow, {
      boilerplateName: boilerplate.manifest.name,
      boilerplateDir: boilerplate.dir,
    });
    return { name: workflowOverride, sourceDir };
  }

  if (!manifestWorkflow) return undefined;

  const sourceDir = resolveWorkflowDirectory(manifestWorkflow, {
    boilerplateName: boilerplate.manifest.name,
    boilerplateDir: boilerplate.dir,
  });
  return { name: manifestWorkflow.name, sourceDir };
}

export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { boilerplateName, targetDir, agents } = options;
  const boilerplatesDir = options.boilerplatesDir ?? defaultBoilerplatesDir();
  const boilerplate = await getBoilerplate(boilerplateName, boilerplatesDir);

  await assertUsableTarget(targetDir);
  await mkdir(targetDir, { recursive: true });

  await cp(boilerplate.templateDir, targetDir, { recursive: true });

  const templatedGitignore = join(targetDir, "gitignore");
  if (await pathExists(templatedGitignore)) {
    await rename(templatedGitignore, join(targetDir, ".gitignore"));
  }

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

  let workflowPath: string | undefined;
  let workflowName: string | undefined;
  const resolved = resolveManifestWorkflow(boilerplate, options.workflow);
  if (resolved) {
    workflowName = resolved.name;
    workflowPath = await installWorkflow(targetDir, resolved.name, resolved.sourceDir);
    const agentsPath = join(targetDir, "AGENTS.md");
    if (await pathExists(agentsPath)) {
      await appendFile(agentsPath, workflowAgentsSnippet(resolved.name, workflowPath));
    }
  }

  return {
    targetDir,
    boilerplate: boilerplate.manifest.name,
    agents,
    skills: lockedSkills.map((s) => s.name),
    lock,
    workflow: workflowName,
    workflowPath,
  };
}

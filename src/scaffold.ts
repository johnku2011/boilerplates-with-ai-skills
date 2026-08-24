import { cp, mkdir, readdir, rename, readFile, stat, appendFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  assertValidCatalog,
  loadCatalogSnapshot,
  type CatalogBoilerplate,
  type CatalogRoots,
  type CatalogSnapshot,
} from "./catalog-snapshot.js";
import { AGENT_TARGETS, type AgentId } from "./agents.js";
import { sha256, writeLock } from "./provenance.js";
import type { LockedSkill, SkillsLock } from "./schema.js";
import { workflowAgentsSnippet } from "./workflows.js";
import {
  defaultPluginDir,
  listSkillSources,
  listWorkflowSkillSources,
  pluginNameForBoilerplate,
  readClientMcpFromProject,
  writeAgentPlugin,
  writeCopilotEnabledPlugins,
} from "./plugin.js";

export interface ScaffoldOptions {
  boilerplateName: string;
  targetDir: string;
  agents: AgentId[];
  boilerplatesDir?: string;
  catalogRoots?: Partial<CatalogRoots>;
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
  pluginPath?: string;
  copilotSettingsPath?: string;
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
  const destDir = join(targetDir, "workflows", workflowName);
  await mkdir(join(targetDir, "workflows"), { recursive: true });
  await cp(sourceDir, destDir, { recursive: true });
  return relative(targetDir, destDir);
}

function resolveManifestWorkflow(
  snapshot: CatalogSnapshot,
  boilerplate: CatalogBoilerplate,
  workflowOverride: string | false | undefined,
): { name: string; sourceDir: string } | undefined {
  if (workflowOverride === false) return undefined;

  const manifestWorkflow = boilerplate.manifest.workflow;
  if (workflowOverride) {
    const source = manifestWorkflow?.source ?? "shared";
    const id =
      source === "shared"
        ? `shared:workflows/${workflowOverride}`
        : `boilerplate:${boilerplate.manifest.name}/workflow/${workflowOverride}`;
    const workflow = snapshot.workflows.find((entry) => entry.id === id);
    if (!workflow) throw new Error(`Unknown workflow: ${id}`);
    return { name: workflow.name, sourceDir: workflow.dir };
  }

  return boilerplate.workflow
    ? { name: boilerplate.workflow.name, sourceDir: boilerplate.workflow.dir }
    : undefined;
}

export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { boilerplateName, targetDir, agents } = options;
  const snapshot = await loadCatalogSnapshot({
    ...options.catalogRoots,
    ...(options.boilerplatesDir ? { boilerplatesDir: options.boilerplatesDir } : {}),
  });
  assertValidCatalog(snapshot);
  const boilerplate = snapshot.boilerplates.find(
    (entry) => entry.manifest.name === boilerplateName,
  );
  if (!boilerplate) {
    const available =
      snapshot.boilerplates.map((entry) => entry.manifest.name).join(", ") || "(none)";
    throw new Error(`Unknown boilerplate: "${boilerplateName}". Available: ${available}.`);
  }

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

  for (const skill of boilerplate.skills) {
    const canonicalDir = join(canonicalRoot, skill.name);
    await cp(skill.dir, canonicalDir, { recursive: true });

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
      source: skill.id,
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
  const resolved = resolveManifestWorkflow(snapshot, boilerplate, options.workflow);
  if (resolved) {
    workflowName = resolved.name;
    workflowPath = await installWorkflow(targetDir, resolved.name, resolved.sourceDir);
    const agentsPath = join(targetDir, "AGENTS.md");
    if (await pathExists(agentsPath)) {
      await appendFile(agentsPath, workflowAgentsSnippet(resolved.name, workflowPath));
    }
  }

  // Portable Agent Plugins package (skills + typed MCP). Keeps .bwai/skills mirrors.
  const pluginSkills = await listSkillSources(canonicalRoot);
  if (workflowName) {
    for (const s of await listWorkflowSkillSources(targetDir, workflowName)) {
      if (!pluginSkills.some((x) => x.name === s.name)) pluginSkills.push(s);
    }
  }

  let pluginPath: string | undefined;
  let copilotSettingsPath: string | undefined;
  if (pluginSkills.length > 0) {
    const pluginDir = defaultPluginDir(targetDir);
    const clientMcp = await readClientMcpFromProject(targetDir);
    await writeAgentPlugin({
      pluginDir,
      name: pluginNameForBoilerplate(boilerplate.manifest.name),
      version: boilerplate.manifest.version,
      description: boilerplate.manifest.description,
      license: "MIT",
      keywords: ["bwai", boilerplate.manifest.stack, "agent-plugins"],
      skills: pluginSkills,
      clientMcp,
    });
    pluginPath = relative(targetDir, pluginDir);
    copilotSettingsPath = await writeCopilotEnabledPlugins(targetDir, `./${pluginPath}`);

    const agentsPath = join(targetDir, "AGENTS.md");
    if (await pathExists(agentsPath)) {
      const mcpNote = clientMcp ? " + `mcp.json`" : "";
      await appendFile(
        agentsPath,
        `

## Agent Plugins

Portable package at \`${pluginPath}/\` (\`plugin.json\` + \`skills/\`${mcpNote}). Client-native MCP remains in \`.mcp.json\` / \`.cursor/mcp.json\` when present. Trust stays in \`skills.lock\` + SkillSpector — Agent Plugins does not define provenance.

Copilot cloud/CLI can enable the local plugin via \`.github/copilot/settings.json\`. Maintainers can also drop the folder under \`~/.cursor/plugins/local/\` for a Cursor smoke path.
`,
      );
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
    pluginPath,
    copilotSettingsPath,
  };
}

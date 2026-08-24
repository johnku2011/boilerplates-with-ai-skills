import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  assertValidCatalog,
  loadCatalogSnapshot,
  type CatalogBoilerplate,
  type CatalogRoots,
} from "./catalog-snapshot.js";
import {
  defaultPluginDir,
  listSkillSources,
  listWorkflowSkillSources,
  pluginNameForBoilerplate,
  readClientMcpFromProject,
  writeAgentPlugin,
  writeCopilotEnabledPlugins,
  type WriteAgentPluginResult,
} from "./plugin.js";
import { readLock } from "./provenance.js";

export interface ExportPluginOptions {
  /** Boilerplate name, or path to a bwai-scaffolded project. */
  source: string;
  /** Destination plugin directory (created). */
  outDir: string;
  /** When exporting a project into itself, also write Copilot settings. */
  writeCopilotSettings?: boolean;
  boilerplatesDir?: string;
  catalogRoots?: Partial<CatalogRoots>;
}

export interface ExportPluginResult extends WriteAgentPluginResult {
  sourceKind: "boilerplate" | "project";
  sourceName: string;
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

async function exportFromBoilerplate(
  boilerplate: CatalogBoilerplate,
  outDir: string,
): Promise<ExportPluginResult> {
  const skills = boilerplate.skills.map((skill) => ({ name: skill.name, dir: skill.dir }));

  // Include delivery workflow skills when the boilerplate declares a workflow (P1-5).
  if (boilerplate.workflow) {
    const wfSkills = await listSkillSources(join(boilerplate.workflow.dir, "skills"));
    for (const s of wfSkills) {
      if (!skills.some((x) => x.name === s.name)) skills.push(s);
    }
  }

  let clientMcp: unknown | null = null;
  for (const rel of [".mcp.json", join(".cursor", "mcp.json")]) {
    const path = join(boilerplate.templateDir, rel);
    if (!(await pathExists(path))) continue;
    clientMcp = JSON.parse(await readFile(path, "utf8")) as unknown;
    break;
  }

  const result = await writeAgentPlugin({
    pluginDir: outDir,
    name: pluginNameForBoilerplate(boilerplate.manifest.name),
    version: boilerplate.manifest.version,
    description: boilerplate.manifest.description,
    license: "MIT",
    keywords: ["bwai", boilerplate.manifest.stack, "agent-plugins"],
    skills,
    clientMcp,
  });

  return {
    ...result,
    sourceKind: "boilerplate",
    sourceName: boilerplate.manifest.name,
  };
}

async function exportFromProject(
  projectDir: string,
  outDir: string,
  writeCopilotSettings: boolean,
): Promise<ExportPluginResult> {
  const skillsRoot = join(projectDir, ".bwai", "skills");
  if (!(await pathExists(skillsRoot))) {
    throw new Error(
      `Not a bwai project (missing .bwai/skills): ${projectDir}. Pass a boilerplate name or scaffold with \`bwai new\`.`,
    );
  }

  let boilerplateName = "project";
  try {
    const lock = await readLock(projectDir);
    boilerplateName = lock.boilerplate;
  } catch {
    // fall through with generic name
  }

  const skills = await listSkillSources(skillsRoot);

  // Attach workflow skills if present (delivery pack travels with the plugin).
  try {
    const workflowsDir = join(projectDir, "workflows");
    if (await pathExists(workflowsDir)) {
      const entries = await readdir(workflowsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const wfSkills = await listWorkflowSkillSources(projectDir, entry.name);
        for (const s of wfSkills) {
          if (!skills.some((x) => x.name === s.name)) skills.push(s);
        }
      }
    }
  } catch {
    // optional
  }

  const clientMcp = await readClientMcpFromProject(projectDir);
  const result = await writeAgentPlugin({
    pluginDir: outDir,
    name: pluginNameForBoilerplate(boilerplateName),
    description: `bwai curated skills for ${boilerplateName}`,
    license: "MIT",
    keywords: ["bwai", "agent-plugins"],
    skills,
    clientMcp,
  });

  let copilotSettingsPath: string | undefined;
  if (writeCopilotSettings) {
    const rel =
      outDir === defaultPluginDir(projectDir)
        ? join(".bwai", "plugin")
        : outDir.startsWith(projectDir)
          ? outDir.slice(projectDir.length).replace(/^\//, "")
          : outDir;
    const normalized = rel.startsWith(".") ? rel : `./${rel}`;
    copilotSettingsPath = await writeCopilotEnabledPlugins(projectDir, normalized);
  }

  return {
    ...result,
    sourceKind: "project",
    sourceName: boilerplateName,
    copilotSettingsPath,
  };
}

/**
 * Export a portable Agent Plugins directory from a catalog boilerplate or
 * an existing bwai-scaffolded project.
 */
export async function exportPlugin(options: ExportPluginOptions): Promise<ExportPluginResult> {
  const outDir = resolve(options.outDir);
  const source = options.source;
  const snapshot = await loadCatalogSnapshot({
    ...options.catalogRoots,
    ...(options.boilerplatesDir ? { boilerplatesDir: options.boilerplatesDir } : {}),
  });
  assertValidCatalog(snapshot);
  const boilerplate = snapshot.boilerplates.find((entry) => entry.manifest.name === source);
  if (boilerplate) {
    await mkdir(outDir, { recursive: true });
    return exportFromBoilerplate(boilerplate, outDir);
  }

  const projectDir = resolve(source);
  if (!(await pathExists(projectDir))) {
    throw new Error(
      `Unknown source "${source}" — not a catalog boilerplate and path does not exist`,
    );
  }

  await mkdir(outDir, { recursive: true });
  return exportFromProject(projectDir, outDir, Boolean(options.writeCopilotSettings));
}

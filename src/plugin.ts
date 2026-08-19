import { cp, mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

/** Canonical Agent Plugins 1.0.0 schema URLs. */
export const AGENT_PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const AGENT_PLUGIN_MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

/** Default in-project plugin root (compose with `.bwai/skills`, do not replace it). */
export const DEFAULT_PLUGIN_DIRNAME = join(".bwai", "plugin");

const PLUGIN_NAME_RE = /^[a-z0-9]([a-z0-9.-]{0,62}[a-z0-9])?$/;

export interface AgentPluginManifest {
  $schema: typeof AGENT_PLUGIN_SCHEMA;
  name: string;
  version?: string;
  description?: string;
  license?: string;
  keywords?: string[];
  homepage?: string;
  repository?: string;
}

export type StdioMcpServer = {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export type HttpMcpServer = {
  type: "streamable-http" | "sse";
  url: string;
  headers?: Record<string, string>;
};

export type AgentPluginMcpServer = StdioMcpServer | HttpMcpServer;

export interface AgentPluginMcpConfig {
  $schema: typeof AGENT_PLUGIN_MCP_SCHEMA;
  mcpServers: Record<string, AgentPluginMcpServer>;
}

export interface SkillSource {
  name: string;
  dir: string;
}

export interface WriteAgentPluginOptions {
  pluginDir: string;
  name: string;
  version?: string;
  description?: string;
  license?: string;
  keywords?: string[];
  homepage?: string;
  repository?: string;
  skills: SkillSource[];
  /** Client-native MCP JSON (e.g. from `.mcp.json`). Translated when present. */
  clientMcp?: unknown | null;
}

export interface WriteAgentPluginResult {
  pluginDir: string;
  skillNames: string[];
  hasMcp: boolean;
  manifest: AgentPluginManifest;
}

export interface PluginValidationIssue {
  path: string;
  message: string;
}

export interface PluginValidationResult {
  ok: boolean;
  errors: PluginValidationIssue[];
  warnings: PluginValidationIssue[];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Agent Plugins name: lowercase alphanumerics, hyphens, periods; 1–64 chars; no `--` / `..`. */
export function isValidPluginName(name: string): boolean {
  if (name.length < 1 || name.length > 64) return false;
  if (name.includes("--") || name.includes("..")) return false;
  return PLUGIN_NAME_RE.test(name);
}

/** Stable plugin id for a catalog boilerplate (`bwai.nextjs-app`). */
export function pluginNameForBoilerplate(boilerplateName: string): string {
  const name = `bwai.${boilerplateName}`;
  if (!isValidPluginName(name)) {
    throw new Error(`Invalid plugin name derived from boilerplate: ${boilerplateName}`);
  }
  return name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "string") {
      throw new Error(`MCP env/headers values must be strings (key ${k})`);
    }
    if (k === "PLUGIN_ROOT" || k === "PLUGIN_DATA") {
      throw new Error(`MCP env must not set reserved key ${k}`);
    }
    out[k] = v;
  }
  return out;
}

/**
 * Translate client-native MCP configs (command/args without `type`) into
 * Agent Plugins `mcp.json` (closed schema + explicit transport type).
 */
export function translateClientMcp(raw: unknown): AgentPluginMcpConfig {
  if (!isRecord(raw)) {
    throw new Error("MCP config must be a JSON object");
  }
  const serversRaw = raw.mcpServers;
  if (!isRecord(serversRaw)) {
    throw new Error('MCP config must include an "mcpServers" object');
  }

  const mcpServers: Record<string, AgentPluginMcpServer> = {};
  for (const [id, entry] of Object.entries(serversRaw)) {
    if (!isRecord(entry)) {
      throw new Error(`MCP server "${id}" must be an object`);
    }

    const declaredType = entry.type;
    if (declaredType === "stdio" || (typeof entry.command === "string" && !declaredType)) {
      if (typeof entry.command !== "string" || entry.command.length === 0) {
        throw new Error(`MCP server "${id}" requires a non-empty command`);
      }
      const server: StdioMcpServer = {
        type: "stdio",
        command: entry.command,
      };
      if (Array.isArray(entry.args)) {
        if (!entry.args.every((a) => typeof a === "string")) {
          throw new Error(`MCP server "${id}" args must be strings`);
        }
        server.args = entry.args as string[];
      }
      const env = stringRecord(entry.env);
      if (env) server.env = env;
      if (typeof entry.cwd === "string") server.cwd = entry.cwd;
      mcpServers[id] = server;
      continue;
    }

    if (
      declaredType === "streamable-http" ||
      declaredType === "sse" ||
      (typeof entry.url === "string" && !declaredType)
    ) {
      if (typeof entry.url !== "string" || entry.url.length === 0) {
        throw new Error(`MCP server "${id}" requires a non-empty url`);
      }
      const type: "streamable-http" | "sse" = declaredType === "sse" ? "sse" : "streamable-http";
      const server: HttpMcpServer = { type, url: entry.url };
      const headers = stringRecord(entry.headers);
      if (headers) server.headers = headers;
      mcpServers[id] = server;
      continue;
    }

    throw new Error(
      `MCP server "${id}" needs type "stdio" | "streamable-http" | "sse", or a command/url to infer from`,
    );
  }

  return {
    $schema: AGENT_PLUGIN_MCP_SCHEMA,
    mcpServers,
  };
}

/** Prefer project-root `.mcp.json`, then `.cursor/mcp.json`. */
export async function readClientMcpFromProject(projectDir: string): Promise<unknown | null> {
  for (const rel of [".mcp.json", join(".cursor", "mcp.json")]) {
    const path = join(projectDir, rel);
    if (!(await pathExists(path))) continue;
    try {
      return JSON.parse(await readFile(path, "utf8")) as unknown;
    } catch (err) {
      throw new Error(
        `Invalid JSON in ${rel}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return null;
}

/** List immediate child dirs that contain SKILL.md. */
export async function listSkillSources(skillsRoot: string): Promise<SkillSource[]> {
  if (!(await pathExists(skillsRoot))) return [];
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const sources: SkillSource[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(skillsRoot, entry.name);
    if (await pathExists(join(dir, "SKILL.md"))) {
      sources.push({ name: entry.name, dir });
    }
  }
  return sources.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Collect workflow skill dirs (e.g. `workflows/bwai-delivery/skills/*`) so
 * GetSuperpower delivery skills travel inside the portable plugin (P1-5).
 */
export async function listWorkflowSkillSources(
  projectDir: string,
  workflowName: string,
): Promise<SkillSource[]> {
  return listSkillSources(join(projectDir, "workflows", workflowName, "skills"));
}

/** Write an Agent Plugins directory: plugin.json + skills/ + optional mcp.json. */
export async function writeAgentPlugin(
  options: WriteAgentPluginOptions,
): Promise<WriteAgentPluginResult> {
  const { pluginDir, name, skills } = options;
  if (!isValidPluginName(name)) {
    throw new Error(
      `Invalid plugin name "${name}" (1–64 chars, lowercase alphanumerics/hyphens/periods, no -- or ..)`,
    );
  }
  if (skills.length === 0) {
    throw new Error("Agent Plugins package requires at least one skill");
  }

  await mkdir(pluginDir, { recursive: true });
  const skillsRoot = join(pluginDir, "skills");
  await mkdir(skillsRoot, { recursive: true });

  const seen = new Set<string>();
  const skillNames: string[] = [];
  for (const skill of skills) {
    if (seen.has(skill.name)) continue;
    seen.add(skill.name);
    if (!(await pathExists(join(skill.dir, "SKILL.md")))) {
      throw new Error(`Skill "${skill.name}" missing SKILL.md at ${skill.dir}`);
    }
    const dest = join(skillsRoot, skill.name);
    await cp(skill.dir, dest, { recursive: true });
    skillNames.push(skill.name);
  }

  const manifest: AgentPluginManifest = {
    $schema: AGENT_PLUGIN_SCHEMA,
    name,
  };
  if (options.version) manifest.version = options.version;
  if (options.description) manifest.description = options.description;
  if (options.license) manifest.license = options.license;
  if (options.keywords?.length) manifest.keywords = options.keywords;
  if (options.homepage) manifest.homepage = options.homepage;
  if (options.repository) manifest.repository = options.repository;

  await writeFile(join(pluginDir, "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  let hasMcp = false;
  if (options.clientMcp != null) {
    const mcp = translateClientMcp(options.clientMcp);
    await writeFile(join(pluginDir, "mcp.json"), `${JSON.stringify(mcp, null, 2)}\n`, "utf8");
    hasMcp = true;
  } else {
    // Remove stale mcp.json if regenerating without MCP.
    // (Leave alone if absent.)
  }

  return { pluginDir, skillNames, hasMcp, manifest };
}

/** Validate a plugin directory against Agent Plugins 1.0.0 portable rules. */
export async function validateAgentPlugin(pluginDir: string): Promise<PluginValidationResult> {
  const errors: PluginValidationIssue[] = [];
  const warnings: PluginValidationIssue[] = [];

  const manifestPath = join(pluginDir, "plugin.json");
  if (!(await pathExists(manifestPath))) {
    errors.push({ path: "plugin.json", message: "missing plugin.json" });
    return { ok: false, errors, warnings };
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
  } catch (err) {
    errors.push({
      path: "plugin.json",
      message: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { ok: false, errors, warnings };
  }

  if (!isRecord(manifest)) {
    errors.push({ path: "plugin.json", message: "manifest must be an object" });
    return { ok: false, errors, warnings };
  }

  if (manifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    errors.push({
      path: "plugin.json#$schema",
      message: `expected ${AGENT_PLUGIN_SCHEMA}`,
    });
  }
  if (typeof manifest.name !== "string" || !isValidPluginName(manifest.name)) {
    errors.push({
      path: "plugin.json#name",
      message: "missing or invalid plugin name",
    });
  }

  const known = new Set([
    "$schema",
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "extensions",
  ]);
  for (const key of Object.keys(manifest)) {
    if (!known.has(key)) {
      warnings.push({
        path: `plugin.json#${key}`,
        message: "unknown top-level field (clients ignore; prefer extensions)",
      });
    }
  }

  const skillsRoot = join(pluginDir, "skills");
  if (!(await pathExists(skillsRoot))) {
    errors.push({ path: "skills/", message: "skills/ directory missing" });
  } else {
    const skillSources = await listSkillSources(skillsRoot);
    if (skillSources.length === 0) {
      errors.push({ path: "skills/", message: "no skill subdirectories with SKILL.md" });
    }
  }

  const mcpPath = join(pluginDir, "mcp.json");
  if (await pathExists(mcpPath)) {
    try {
      const raw = JSON.parse(await readFile(mcpPath, "utf8")) as unknown;
      if (!isRecord(raw)) {
        errors.push({ path: "mcp.json", message: "must be an object" });
      } else {
        if (raw.$schema !== AGENT_PLUGIN_MCP_SCHEMA) {
          errors.push({
            path: "mcp.json#$schema",
            message: `expected ${AGENT_PLUGIN_MCP_SCHEMA}`,
          });
        }
        // Round-trip through translator to enforce typed servers.
        translateClientMcp(raw);
      }
    } catch (err) {
      errors.push({
        path: "mcp.json",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Repo-level Copilot cloud/CLI settings enabling the local plugin path.
 * Spec keys are `plugin@marketplace` or `./relative` / absolute paths.
 */
export async function writeCopilotEnabledPlugins(
  projectDir: string,
  pluginRelPath: string,
): Promise<string> {
  const settingsDir = join(projectDir, ".github", "copilot");
  await mkdir(settingsDir, { recursive: true });
  const settingsPath = join(settingsDir, "settings.json");
  const rel = pluginRelPath.startsWith(".") ? pluginRelPath : `./${pluginRelPath}`;
  const settings = {
    enabledPlugins: {
      [rel]: true,
    },
  };
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return relative(projectDir, settingsPath);
}

export function defaultPluginDir(projectDir: string): string {
  return join(projectDir, DEFAULT_PLUGIN_DIRNAME);
}

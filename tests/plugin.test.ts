import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AGENT_PLUGIN_MCP_SCHEMA,
  AGENT_PLUGIN_SCHEMA,
  isValidPluginName,
  pluginNameForBoilerplate,
  translateClientMcp,
  validateAgentPlugin,
  writeAgentPlugin,
  writeCopilotEnabledPlugins,
} from "../src/plugin.js";

describe("plugin", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bwai-plugin-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("validates plugin names", () => {
    expect(isValidPluginName("bwai.nextjs-app")).toBe(true);
    expect(isValidPluginName("My-Plugin")).toBe(false);
    expect(isValidPluginName("has--double")).toBe(false);
  });

  it("derives boilerplate plugin names", () => {
    expect(pluginNameForBoilerplate("nextjs-app")).toBe("bwai.nextjs-app");
  });

  it("translates client-native Playwright MCP to typed Agent Plugins mcp.json", () => {
    const mcp = translateClientMcp({
      mcpServers: {
        playwright: {
          command: "npx",
          args: ["-y", "@playwright/mcp@latest"],
        },
      },
    });
    expect(mcp.$schema).toBe(AGENT_PLUGIN_MCP_SCHEMA);
    expect(mcp.mcpServers.playwright).toEqual({
      type: "stdio",
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
    });
  });

  it("writes plugin.json, skills, and mcp.json", async () => {
    const skillDir = join(dir, "src-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: demo-skill\ndescription: Demo\n---\n\n# Demo\n",
      "utf8",
    );

    const pluginDir = join(dir, "plugin");
    const result = await writeAgentPlugin({
      pluginDir,
      name: "bwai.demo",
      version: "1.0.0",
      description: "Demo plugin",
      skills: [{ name: "demo-skill", dir: skillDir }],
      clientMcp: {
        mcpServers: {
          playwright: { command: "npx", args: ["-y", "@playwright/mcp@latest"] },
        },
      },
    });

    expect(result.hasMcp).toBe(true);
    expect(result.skillNames).toEqual(["demo-skill"]);

    const manifest = JSON.parse(await readFile(join(pluginDir, "plugin.json"), "utf8")) as {
      $schema: string;
      name: string;
    };
    expect(manifest.$schema).toBe(AGENT_PLUGIN_SCHEMA);
    expect(manifest.name).toBe("bwai.demo");

    const mcp = JSON.parse(await readFile(join(pluginDir, "mcp.json"), "utf8")) as {
      mcpServers: { playwright: { type: string } };
    };
    expect(mcp.mcpServers.playwright.type).toBe("stdio");

    const validation = await validateAgentPlugin(pluginDir);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("writes Copilot enabledPlugins for a local path", async () => {
    const path = await writeCopilotEnabledPlugins(dir, "./.bwai/plugin");
    expect(path).toBe(join(".github", "copilot", "settings.json"));
    const settings = JSON.parse(
      await readFile(join(dir, ".github", "copilot", "settings.json"), "utf8"),
    ) as { enabledPlugins: Record<string, boolean> };
    expect(settings.enabledPlugins["./.bwai/plugin"]).toBe(true);
  });
});

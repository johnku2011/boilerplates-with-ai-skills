import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportPlugin } from "../src/export-plugin.js";
import { scaffold } from "../src/scaffold.js";
import { validateAgentPlugin } from "../src/plugin.js";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("export-plugin", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bwai-export-plugin-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("exports a portable plugin from a UI boilerplate with MCP", async () => {
    const out = join(dir, "bwai.nextjs-app");
    const result = await exportPlugin({ source: "nextjs-app", outDir: out });

    expect(result.sourceKind).toBe("boilerplate");
    expect(result.manifest.name).toBe("bwai.nextjs-app");
    expect(result.hasMcp).toBe(true);
    expect(result.skillNames).toContain("nextjs-app-router");
    expect(result.skillNames).toContain("bwai-delivery");
    expect(await exists(join(out, "plugin.json"))).toBe(true);
    expect(await exists(join(out, "mcp.json"))).toBe(true);

    const mcp = JSON.parse(await readFile(join(out, "mcp.json"), "utf8")) as {
      mcpServers: { playwright: { type: string; command: string } };
    };
    expect(mcp.mcpServers.playwright.type).toBe("stdio");
    expect(mcp.mcpServers.playwright.command).toBe("npx");

    const validation = await validateAgentPlugin(out);
    expect(validation.ok).toBe(true);
  });

  it("exports from a scaffolded project", async () => {
    const project = join(dir, "proj");
    await scaffold({
      boilerplateName: "node-service",
      targetDir: project,
      agents: ["claude"],
    });

    const out = join(dir, "exported");
    const result = await exportPlugin({ source: project, outDir: out });
    expect(result.sourceKind).toBe("project");
    expect(result.manifest.name).toBe("bwai.node-service");
    expect(result.skillNames.length).toBeGreaterThan(0);
    expect(await exists(join(out, "skills", "code-review", "SKILL.md"))).toBe(true);
  });
});

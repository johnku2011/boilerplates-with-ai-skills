import { describe, it, expect } from "vitest";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { listBoilerplates, getBoilerplate } from "../src/catalog.js";
import { resolveSkillDirectory } from "../src/skills.js";
import { defaultSharedSkillsDir } from "../src/paths.js";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("catalog", () => {
  it("discovers the node-service boilerplate", async () => {
    const all = await listBoilerplates();
    const names = all.map((b) => b.manifest.name);
    expect(names).toContain("node-service");
  });

  it("includes the Vercel-style boilerplates", async () => {
    const names = (await listBoilerplates()).map((b) => b.manifest.name);
    expect(names).toEqual(
      expect.arrayContaining(["nextjs-app", "express-api", "node-service", "react-native-app"]),
    );
  });

  it("every declared skill resolves to a SKILL.md (local or shared)", async () => {
    const sharedDir = defaultSharedSkillsDir();
    const all = await listBoilerplates();
    expect(all.length).toBeGreaterThan(0);
    for (const b of all) {
      expect(await exists(b.templateDir), `${b.manifest.name} template`).toBe(true);
      for (const skill of b.manifest.skills) {
        const skillDir = resolveSkillDirectory(skill, {
          boilerplateName: b.manifest.name,
          boilerplateSkillsDir: b.skillsDir,
          sharedSkillsDir: sharedDir,
        });
        expect(
          await exists(join(skillDir, "SKILL.md")),
          `${b.manifest.name} skill ${skill.name} (${skill.source})`,
        ).toBe(true);
      }
    }
  });

  it("loads node-service with shared-only skills", async () => {
    const b = await getBoilerplate("node-service");
    expect(b.manifest.skills).toEqual([
      { name: "test-driven-development", source: "shared" },
      { name: "code-review", source: "shared" },
      { name: "project-security", source: "shared" },
    ]);
  });

  it("loads nextjs-app with mixed local and shared skills", async () => {
    const b = await getBoilerplate("nextjs-app");
    expect(b.manifest.skills).toEqual([
      { name: "nextjs-app-router", source: "local" },
      { name: "code-review", source: "shared" },
      { name: "project-security", source: "shared" },
      { name: "deploy-vercel", source: "shared" },
    ]);
  });

  it("throws for an unknown boilerplate", async () => {
    await expect(getBoilerplate("does-not-exist")).rejects.toThrow(/Unknown boilerplate/);
  });
});

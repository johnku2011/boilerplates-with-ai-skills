import { describe, it, expect } from "vitest";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { listBoilerplates, getBoilerplate } from "../src/catalog.js";

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

  it("every boilerplate has a template dir and all declared skills on disk", async () => {
    const all = await listBoilerplates();
    expect(all.length).toBeGreaterThan(0);
    for (const b of all) {
      expect(await exists(b.templateDir), `${b.manifest.name} template`).toBe(true);
      for (const skill of b.manifest.skills) {
        const skillMd = join(b.skillsDir, skill.name, "SKILL.md");
        expect(await exists(skillMd), `${b.manifest.name} skill ${skill.name}`).toBe(true);
      }
    }
  });

  it("loads a valid manifest with skills", async () => {
    const b = await getBoilerplate("node-service");
    expect(b.manifest.stack).toBe("node-esm");
    expect(b.manifest.skills.map((s) => s.name)).toEqual([
      "test-driven-development",
      "code-review",
    ]);
  });

  it("throws for an unknown boilerplate", async () => {
    await expect(getBoilerplate("does-not-exist")).rejects.toThrow(/Unknown boilerplate/);
  });
});

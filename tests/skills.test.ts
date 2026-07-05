import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { resolveSkillDirectory, skillLockSource } from "../src/skills.js";
import { defaultSharedSkillsDir, defaultBoilerplatesDir } from "../src/paths.js";
import { getBoilerplate } from "../src/catalog.js";

describe("skill resolution", () => {
  it("resolves shared skills from shared/skills/", () => {
    const dir = resolveSkillDirectory(
      { name: "code-review", source: "shared" },
      {
        boilerplateName: "node-service",
        boilerplateSkillsDir: join(defaultBoilerplatesDir(), "node-service", "skills"),
      },
    );
    expect(dir).toBe(join(defaultSharedSkillsDir(), "code-review"));
  });

  it("resolves local skills from boilerplates/<name>/skills/", async () => {
    const b = await getBoilerplate("express-api");
    const dir = resolveSkillDirectory(
      { name: "express-api-design", source: "local" },
      {
        boilerplateName: b.manifest.name,
        boilerplateSkillsDir: b.skillsDir,
      },
    );
    expect(dir).toBe(join(b.skillsDir, "express-api-design"));
  });

  it("records provenance sources for lockfile", () => {
    expect(skillLockSource({ name: "code-review", source: "shared" }, "nextjs-app")).toBe(
      "shared:code-review",
    );
    expect(skillLockSource({ name: "nextjs-app-router", source: "local" }, "nextjs-app")).toBe(
      "boilerplate:nextjs-app/skills/nextjs-app-router",
    );
  });
});

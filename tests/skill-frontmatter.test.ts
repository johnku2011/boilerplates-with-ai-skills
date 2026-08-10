import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  assertSkillCompliant,
  parseSkillFrontmatter,
  SkillFrontmatterError,
} from "../src/skill-frontmatter.js";
import { defaultBoilerplatesDir, defaultSharedSkillsDir } from "../src/paths.js";

describe("skill frontmatter", () => {
  it("parses required and optional enrichment fields", () => {
    const md = `---
name: example-skill
description: Use when testing frontmatter parsing for catalog compliance.
license: MIT
compatibility: Requires Node 20+ and network for npm.
allowed-tools: Read Bash
metadata:
  author: bwai
  version: "1.0"
---

# Body
`;
    const fm = parseSkillFrontmatter(md);
    expect(fm.name).toBe("example-skill");
    expect(fm.description).toContain("frontmatter");
    expect(fm.license).toBe("MIT");
    expect(fm.compatibility).toContain("Node 20");
    expect(fm["allowed-tools"]).toBe("Read Bash");
    expect(fm.metadata).toEqual({ author: "bwai", version: "1.0" });
  });

  it("rejects missing name", () => {
    expect(() =>
      parseSkillFrontmatter(`---
description: Only a description.
---
`),
    ).toThrow(SkillFrontmatterError);
  });

  it("rejects name/directory mismatch when required", () => {
    expect(() =>
      assertSkillCompliant(
        `---
name: wrong-name
description: Use when checking directory name alignment.
---
`,
        { directoryName: "right-name" },
      ),
    ).toThrow(/must match directory name/);
  });

  it("every catalog skill passes enrichment compliance", async () => {
    const dirs: Array<{ name: string; dir: string }> = [];

    for (const name of await readdir(defaultSharedSkillsDir())) {
      dirs.push({ name, dir: join(defaultSharedSkillsDir(), name) });
    }

    const boilerplatesDir = defaultBoilerplatesDir();
    for (const bp of await readdir(boilerplatesDir, { withFileTypes: true })) {
      if (!bp.isDirectory()) continue;
      const skillsRoot = join(boilerplatesDir, bp.name, "skills");
      let skillNames: string[];
      try {
        skillNames = await readdir(skillsRoot);
      } catch {
        continue;
      }
      for (const name of skillNames) {
        dirs.push({ name, dir: join(skillsRoot, name) });
      }
    }

    expect(dirs.length).toBeGreaterThan(0);
    for (const { name, dir } of dirs) {
      const skillMd = await readFile(join(dir, "SKILL.md"), "utf8");
      expect(() =>
        assertSkillCompliant(skillMd, { directoryName: name, requireEnrichment: true }),
      ).not.toThrow();
    }
  });
});

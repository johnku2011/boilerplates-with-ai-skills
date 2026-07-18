import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installSkill, listInstallableSkills, SKILL_DEPENDENCIES } from "../src/install-skill.js";

describe("installSkill", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "bwai-install-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("lists shared skills that can be installed", async () => {
    const names = await listInstallableSkills();
    expect(names).toContain("bwai-advisor");
    expect(names).toContain("startup-goal");
  });

  it("installs a skill globally for the requested agents", async () => {
    const result = await installSkill({
      skillName: "bwai-advisor",
      agents: ["claude", "cursor"],
      homeDir: home,
      withDeps: false,
    });

    expect(result.installed).toEqual([
      {
        skill: "bwai-advisor",
        agent: "claude",
        path: join(home, ".claude", "skills", "bwai-advisor"),
      },
      {
        skill: "bwai-advisor",
        agent: "cursor",
        path: join(home, ".cursor", "skills", "bwai-advisor"),
      },
    ]);

    const skillMd = await readFile(
      join(home, ".claude", "skills", "bwai-advisor", "SKILL.md"),
      "utf8",
    );
    expect(skillMd).toContain("name: bwai-advisor");
    await access(join(home, ".cursor", "skills", "bwai-advisor", "SKILL.md"));
  });

  it("installs declared companion skills when withDeps is true", async () => {
    expect(SKILL_DEPENDENCIES["bwai-advisor"]).toContain("startup-goal");

    const result = await installSkill({
      skillName: "bwai-advisor",
      agents: ["claude"],
      homeDir: home,
      withDeps: true,
    });

    const skills = result.installed.map((i) => i.skill);
    expect(skills).toContain("bwai-advisor");
    expect(skills).toContain("startup-goal");
    await access(join(home, ".claude", "skills", "startup-goal", "SKILL.md"));
  });

  it("throws for an unknown skill with a helpful list", async () => {
    await expect(
      installSkill({
        skillName: "does-not-exist",
        agents: ["claude"],
        homeDir: home,
        withDeps: false,
      }),
    ).rejects.toThrow(/Unknown skill.*bwai-advisor/s);
  });
});

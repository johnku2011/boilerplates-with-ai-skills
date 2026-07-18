import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkGlobalAdvisorSkills } from "../src/global-skills-check.js";

describe("checkGlobalAdvisorSkills", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "bwai-doctor-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("warns when nothing is installed globally", async () => {
    const check = await checkGlobalAdvisorSkills({ homeDir: home, agents: ["claude"] });
    expect(check.name).toBe("global-advisor");
    expect(check.status).toBe("warn");
    expect(check.message).toContain("install-skill bwai-advisor --global");
  });

  it("is ok when both skills exist for the agent", async () => {
    for (const skill of ["bwai-advisor", "startup-goal"]) {
      const dir = join(home, ".claude", "skills", skill);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "SKILL.md"), `---\nname: ${skill}\n---\n`);
    }

    const check = await checkGlobalAdvisorSkills({ homeDir: home, agents: ["claude"] });
    expect(check.status).toBe("ok");
    expect(check.message).toContain("bwai-advisor");
  });

  it("warns on partial install", async () => {
    const dir = join(home, ".claude", "skills", "bwai-advisor");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), "---\nname: bwai-advisor\n---\n");

    const check = await checkGlobalAdvisorSkills({ homeDir: home, agents: ["claude"] });
    expect(check.status).toBe("warn");
    expect(check.message).toContain("startup-goal");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { syncUpstreamSkills } from "../src/upstream-sync.js";
import { saveRegistry } from "../src/registry.js";
import type { SkillScanner } from "../src/scan.js";

function fakeScanner(risk = 0): SkillScanner {
  return {
    name: "fake",
    async isAvailable() {
      return true;
    },
    async scan() {
      return { riskScore: risk, scanMode: "static", findings: 0 };
    },
  };
}

async function initGitRepo(dir: string): Promise<void> {
  await runGit(dir, ["init"]);
  await runGit(dir, ["config", "user.email", "test@test.com"]);
  await runGit(dir, ["config", "user.name", "test"]);
  await runGit(dir, ["add", "."]);
  await runGit(dir, ["commit", "-m", "init"]);
}

function runGit(cwd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`git ${args.join(" ")} failed`)),
    );
  });
}

describe("syncUpstreamSkills", () => {
  let root: string;
  let upstreamRepo: string;
  let sharedDir: string;
  let registryPath: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "bwai-upstream-"));
    upstreamRepo = join(root, "upstream.git");
    sharedDir = join(root, "shared", "skills");
    registryPath = join(root, "registry.json");

    await mkdir(join(upstreamRepo, "skills", "demo-skill"), { recursive: true });
    await writeFile(
      join(upstreamRepo, "skills", "demo-skill", "SKILL.md"),
      "---\nname: demo-skill\ndescription: upstream\n---\n\n# Upstream v2\n",
    );
    await initGitRepo(upstreamRepo);

    await mkdir(join(sharedDir, "demo-skill"), { recursive: true });
    await writeFile(
      join(sharedDir, "demo-skill", "SKILL.md"),
      "---\nname: demo-skill\ndescription: local\n---\n\n# Local v1\n",
    );

    await saveRegistry(
      {
        indexVersion: 1,
        updatedAt: new Date().toISOString(),
        skills: [
          {
            name: "demo-skill",
            catalogLocation: "shared",
            catalogPath: "shared/skills/demo-skill",
            promotedAt: new Date().toISOString(),
            sha256: "local",
            upstream: {
              url: `file://${upstreamRepo}`,
              path: "skills/demo-skill",
            },
            scan: { status: "pending", riskScore: null, scannedAt: null, threshold: 30 },
            bundleAll: false,
            bundledIn: [],
          },
        ],
      },
      registryPath,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reports drift without --apply", async () => {
    const result = await syncUpstreamSkills({
      registryPath,
      sharedSkillsDir: sharedDir,
      scanner: fakeScanner(),
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.status).toBe("drift");
    const local = await readFile(join(sharedDir, "demo-skill", "SKILL.md"), "utf8");
    expect(local).toContain("Local v1");
  });

  it("applies upstream content when --apply and scan passes", async () => {
    const result = await syncUpstreamSkills({
      registryPath,
      sharedSkillsDir: sharedDir,
      scanner: fakeScanner(0),
      apply: true,
    });
    expect(result.entries[0]?.status).toBe("updated");
    const content = await readFile(join(sharedDir, "demo-skill", "SKILL.md"), "utf8");
    expect(content).toContain("Upstream v2");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../src/scaffold.js";
import { readLock } from "../src/provenance.js";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("scaffold", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bwai-scaffold-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("copies the template, restores .gitignore, and installs skills per agent", async () => {
    const target = join(dir, "proj");
    const result = await scaffold({
      boilerplateName: "node-service",
      targetDir: target,
      agents: ["claude", "cursor"],
    });

    expect(result.skills).toEqual(["test-driven-development", "code-review"]);

    // Template files copied.
    expect(await exists(join(target, "package.json"))).toBe(true);
    expect(await exists(join(target, "src", "index.js"))).toBe(true);
    // gitignore renamed to .gitignore.
    expect(await exists(join(target, ".gitignore"))).toBe(true);
    expect(await exists(join(target, "gitignore"))).toBe(false);

    // Canonical + per-agent skill copies.
    expect(await exists(join(target, ".bwai", "skills", "code-review", "SKILL.md"))).toBe(true);
    expect(await exists(join(target, ".claude", "skills", "code-review", "SKILL.md"))).toBe(true);
    expect(await exists(join(target, ".cursor", "rules", "code-review", "SKILL.md"))).toBe(true);

    // Lockfile with provenance.
    const lock = await readLock(target);
    expect(lock.boilerplate).toBe("node-service");
    expect(lock.agents).toEqual(["claude", "cursor"]);
    const tdd = lock.skills.find((s) => s.name === "test-driven-development");
    expect(tdd?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(tdd?.scan.status).toBe("pending");
    expect(tdd?.installedTo).toContain(join(".claude", "skills", "test-driven-development"));
  });

  it("dedupes shared agent targets (copilot + opencode share .agents/skills)", async () => {
    const target = join(dir, "proj");
    await scaffold({
      boilerplateName: "node-service",
      targetDir: target,
      agents: ["copilot", "opencode"],
    });
    const lock = await readLock(target);
    const tdd = lock.skills.find((s) => s.name === "test-driven-development");
    const agentsPaths = tdd?.installedTo ?? [];
    expect(agentsPaths).toEqual([join(".agents", "skills", "test-driven-development")]);
  });

  it("refuses a non-empty target directory", async () => {
    const target = join(dir, "proj");
    await scaffold({ boilerplateName: "node-service", targetDir: target, agents: ["claude"] });
    await expect(
      scaffold({ boilerplateName: "node-service", targetDir: target, agents: ["claude"] }),
    ).rejects.toThrow(/not empty/);
  });

  it("produces a runnable project (SKILL.md content hashes are stable)", async () => {
    const target = join(dir, "proj");
    await scaffold({ boilerplateName: "node-service", targetDir: target, agents: ["claude"] });
    const canonical = await readFile(
      join(target, ".bwai", "skills", "code-review", "SKILL.md"),
      "utf8",
    );
    const installed = await readFile(
      join(target, ".claude", "skills", "code-review", "SKILL.md"),
      "utf8",
    );
    expect(installed).toBe(canonical);
  });
});

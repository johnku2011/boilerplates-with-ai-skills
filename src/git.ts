import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface GitCloneResult {
  dir: string;
  resolvedRef: string;
}

function runGit(
  cwd: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.on("data", (d) => (stdout += String(d)));
    child.stderr?.on("data", (d) => (stderr += String(d)));
    child.on("error", () => resolve({ code: 127, stdout, stderr }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

/** Shallow-clone a repo and optionally checkout a ref (branch, tag, or commit). */
export async function cloneGitRepo(url: string, ref?: string): Promise<GitCloneResult> {
  const dir = await mkdtemp(join(tmpdir(), "bwai-git-"));
  const init = await runGit(dir, ["init"]);
  if (init.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`git init failed: ${init.stderr}`);
  }

  const remote = await runGit(dir, ["remote", "add", "origin", url]);
  if (remote.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`git remote add failed: ${remote.stderr}`);
  }

  const fetchArgs = ref
    ? ["fetch", "--depth", "1", "origin", ref]
    : ["fetch", "--depth", "1", "origin"];
  const fetch = await runGit(dir, fetchArgs);
  if (fetch.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`git fetch failed: ${fetch.stderr}`);
  }

  const checkoutRef = ref ?? "FETCH_HEAD";
  const checkout = await runGit(dir, ["checkout", checkoutRef]);
  if (checkout.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`git checkout failed: ${checkout.stderr}`);
  }

  const rev = await runGit(dir, ["rev-parse", "HEAD"]);
  if (rev.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`git rev-parse failed: ${rev.stderr}`);
  }

  return { dir, resolvedRef: rev.stdout.trim() };
}

export async function cleanupClone(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

/** Resolve a skill directory inside a cloned repo. */
export async function findSkillDirectory(repoRoot: string, subpath?: string): Promise<string> {
  if (subpath) {
    const target = join(repoRoot, subpath);
    await assertSkillMd(target);
    return target;
  }
  await assertSkillMd(repoRoot);
  return repoRoot;
}

async function assertSkillMd(dir: string): Promise<void> {
  try {
    await stat(join(dir, "SKILL.md"));
  } catch {
    throw new Error(`No SKILL.md found at ${dir}`);
  }
}

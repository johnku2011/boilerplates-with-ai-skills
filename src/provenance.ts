import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { skillsLockSchema, type SkillsLock } from "./schema.js";

export const LOCK_FILENAME = "skills.lock";

export function lockPath(projectDir: string): string {
  return join(projectDir, LOCK_FILENAME);
}

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function writeLock(projectDir: string, lock: SkillsLock): Promise<void> {
  const validated = skillsLockSchema.parse(lock);
  const path = lockPath(projectDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

export async function readLock(projectDir: string): Promise<SkillsLock> {
  const raw = await readFile(lockPath(projectDir), "utf8");
  return skillsLockSchema.parse(JSON.parse(raw));
}

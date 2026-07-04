import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { boilerplateManifestSchema, type BoilerplateManifest } from "./schema.js";
import { defaultBoilerplatesDir } from "./paths.js";

export interface Boilerplate {
  manifest: BoilerplateManifest;
  /** Absolute path to the boilerplate directory in the catalog. */
  dir: string;
  /** Absolute path to the files copied into a new project. */
  templateDir: string;
  /** Absolute path to the bundled skills directory. */
  skillsDir: string;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function loadBoilerplate(dir: string): Promise<Boilerplate> {
  const manifestPath = join(dir, "boilerplate.json");
  const raw = await readFile(manifestPath, "utf8");
  const manifest = boilerplateManifestSchema.parse(JSON.parse(raw));
  return {
    manifest,
    dir,
    templateDir: join(dir, "template"),
    skillsDir: join(dir, "skills"),
  };
}

export async function listBoilerplates(
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<Boilerplate[]> {
  let entries: string[];
  try {
    entries = await readdir(boilerplatesDir);
  } catch {
    return [];
  }
  const found: Boilerplate[] = [];
  for (const entry of entries.sort()) {
    const dir = join(boilerplatesDir, entry);
    if (!(await isDirectory(dir))) continue;
    try {
      found.push(await loadBoilerplate(dir));
    } catch {
      // Skip directories without a valid boilerplate.json.
    }
  }
  return found;
}

export async function getBoilerplate(
  name: string,
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<Boilerplate> {
  const all = await listBoilerplates(boilerplatesDir);
  const match = all.find((b) => b.manifest.name === name);
  if (!match) {
    const available = all.map((b) => b.manifest.name).join(", ") || "(none)";
    throw new Error(`Unknown boilerplate: "${name}". Available: ${available}.`);
  }
  return match;
}

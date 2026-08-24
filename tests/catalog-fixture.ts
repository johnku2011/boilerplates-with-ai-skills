import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface CatalogFixture {
  root: string;
  boilerplatesDir: string;
  sharedSkillsDir: string;
  sharedWorkflowsDir: string;
}

export async function createCatalogFixture(root: string): Promise<CatalogFixture> {
  const fixture = {
    root,
    boilerplatesDir: join(root, "boilerplates"),
    sharedSkillsDir: join(root, "shared", "skills"),
    sharedWorkflowsDir: join(root, "shared", "workflows"),
  };
  await Promise.all([
    mkdir(fixture.boilerplatesDir, { recursive: true }),
    mkdir(fixture.sharedSkillsDir, { recursive: true }),
    mkdir(fixture.sharedWorkflowsDir, { recursive: true }),
  ]);
  return fixture;
}

export async function writeSkill(dir: string, name: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Use when testing ${name} catalog behavior.\nlicense: MIT\n---\n\n# ${name}\n`,
    "utf8",
  );
}

export async function writeBoilerplate(
  fixture: CatalogFixture,
  directoryName: string,
  manifest: Record<string, unknown>,
): Promise<string> {
  const dir = join(fixture.boilerplatesDir, directoryName);
  await mkdir(join(dir, "template"), { recursive: true });
  await mkdir(join(dir, "skills"), { recursive: true });
  await writeFile(join(dir, "boilerplate.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return dir;
}

export function boilerplateManifest(
  name: string,
  skills: Array<{ name: string; source: "local" | "shared" }> = [],
  workflow?: { name: string; source: "local" | "shared" },
): Record<string, unknown> {
  return {
    name,
    description: `${name} test boilerplate`,
    stack: "test",
    version: "1.0.0",
    defaultAgents: ["claude"],
    skills,
    ...(workflow ? { workflow } : {}),
  };
}

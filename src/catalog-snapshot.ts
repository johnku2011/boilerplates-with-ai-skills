import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  boilerplateManifestSchema,
  type BoilerplateManifest,
  type WorkflowManifest,
} from "./schema.js";
import { assertSkillCompliant } from "./skill-frontmatter.js";
import {
  defaultBoilerplatesDir,
  defaultSharedSkillsDir,
  defaultSharedWorkflowsDir,
} from "./paths.js";

export interface CatalogRoots {
  boilerplatesDir: string;
  sharedSkillsDir: string;
  sharedWorkflowsDir: string;
}

export type CatalogArtifactIdentity =
  | `boilerplate:${string}`
  | `shared:${string}`
  | `boilerplate:${string}/skills/${string}`
  | `shared:workflows/${string}`
  | `boilerplate:${string}/workflow/${string}`;

export type CatalogDiagnosticCode =
  | "CATALOG_ROOT_UNREADABLE"
  | "INVALID_BOILERPLATE_MANIFEST"
  | "BOILERPLATE_NAME_MISMATCH"
  | "DUPLICATE_ARTIFACT_IDENTITY"
  | "MISSING_TEMPLATE"
  | "INVALID_SKILL_METADATA"
  | "MISSING_DECLARED_SKILL"
  | "UNDECLARED_LOCAL_SKILL"
  | "DUPLICATE_SKILL_DECLARATION"
  | "SKILL_INSTALL_NAME_COLLISION"
  | "INVALID_WORKFLOW_METADATA"
  | "MISSING_DECLARED_WORKFLOW";

export interface CatalogDiagnostic {
  code: CatalogDiagnosticCode;
  severity: "error" | "warning";
  kind: "catalog" | "boilerplate" | "skill" | "workflow";
  path: string;
  identity?: CatalogArtifactIdentity;
  message: string;
}

export interface CatalogArtifactRecord {
  kind: "boilerplate" | "skill" | "workflow";
  path: string;
  identity?: CatalogArtifactIdentity;
  valid: boolean;
}

export interface CatalogSkill {
  id: CatalogArtifactIdentity;
  name: string;
  scope: "shared" | "local";
  dir: string;
  boilerplateName?: string;
}

export interface CatalogWorkflow {
  id: CatalogArtifactIdentity;
  name: string;
  scope: "shared" | "local";
  dir: string;
  manifest: WorkflowManifest;
  boilerplateName?: string;
}

export interface CatalogBoilerplate {
  id: CatalogArtifactIdentity;
  manifest: BoilerplateManifest;
  dir: string;
  templateDir: string;
  skillsDir: string;
  skills: CatalogSkill[];
  workflow?: CatalogWorkflow;
}

export interface CatalogSnapshot {
  roots: Readonly<CatalogRoots>;
  artifacts: readonly CatalogArtifactRecord[];
  boilerplates: readonly CatalogBoilerplate[];
  skills: readonly CatalogSkill[];
  workflows: readonly CatalogWorkflow[];
  diagnostics: readonly CatalogDiagnostic[];
  valid: boolean;
}

export class CatalogValidationError extends Error {
  constructor(readonly diagnostics: readonly CatalogDiagnostic[]) {
    super(`Catalog validation failed with ${diagnostics.length} error(s)`);
    this.name = "CatalogValidationError";
  }
}

export function assertValidCatalog(snapshot: CatalogSnapshot): void {
  const errors = snapshot.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) throw new CatalogValidationError(errors);
}

async function directoryNames(root: string, diagnostics: CatalogDiagnostic[]): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    diagnostics.push({
      code: "CATALOG_ROOT_UNREADABLE",
      severity: "error",
      kind: "catalog",
      path: root,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function freezeSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  for (const item of snapshot.artifacts) Object.freeze(item);
  for (const item of snapshot.skills) Object.freeze(item);
  for (const item of snapshot.workflows) Object.freeze(item);
  for (const item of snapshot.boilerplates) {
    Object.freeze(item.skills);
    Object.freeze(item);
  }
  for (const item of snapshot.diagnostics) Object.freeze(item);
  Object.freeze(snapshot.roots);
  Object.freeze(snapshot.artifacts);
  Object.freeze(snapshot.skills);
  Object.freeze(snapshot.workflows);
  Object.freeze(snapshot.boilerplates);
  Object.freeze(snapshot.diagnostics);
  return Object.freeze(snapshot);
}

export async function loadCatalogSnapshot(
  options: Partial<CatalogRoots> = {},
): Promise<CatalogSnapshot> {
  const roots: CatalogRoots = {
    boilerplatesDir: options.boilerplatesDir ?? defaultBoilerplatesDir(),
    sharedSkillsDir: options.sharedSkillsDir ?? defaultSharedSkillsDir(),
    sharedWorkflowsDir: options.sharedWorkflowsDir ?? defaultSharedWorkflowsDir(),
  };
  const diagnostics: CatalogDiagnostic[] = [];
  const artifacts: CatalogArtifactRecord[] = [];
  const skills: CatalogSkill[] = [];
  const workflows: CatalogWorkflow[] = [];
  const boilerplates: CatalogBoilerplate[] = [];

  const sharedSkillNames = await directoryNames(roots.sharedSkillsDir, diagnostics);
  for (const name of sharedSkillNames) {
    const dir = join(roots.sharedSkillsDir, name);
    const id = `shared:${name}` as const;
    try {
      const content = await readFile(join(dir, "SKILL.md"), "utf8");
      assertSkillCompliant(content, { directoryName: name, requireEnrichment: true });
      skills.push({ id, name, scope: "shared", dir });
      artifacts.push({ kind: "skill", path: dir, identity: id, valid: true });
    } catch (error) {
      diagnostics.push({
        code: "INVALID_SKILL_METADATA",
        severity: "error",
        kind: "skill",
        path: dir,
        identity: id,
        message: error instanceof Error ? error.message : String(error),
      });
      artifacts.push({ kind: "skill", path: dir, identity: id, valid: false });
    }
  }

  await directoryNames(roots.sharedWorkflowsDir, diagnostics);
  const boilerplateDirectories = await directoryNames(roots.boilerplatesDir, diagnostics);
  for (const directoryName of boilerplateDirectories) {
    const dir = join(roots.boilerplatesDir, directoryName);
    try {
      const raw = await readFile(join(dir, "boilerplate.json"), "utf8");
      const manifest = boilerplateManifestSchema.parse(JSON.parse(raw));
      const id = `boilerplate:${manifest.name}` as const;
      const resolvedSkills = manifest.skills
        .map((ref) =>
          skills.find(
            (skill) =>
              skill.id ===
              (ref.source === "shared"
                ? `shared:${ref.name}`
                : `boilerplate:${manifest.name}/skills/${ref.name}`),
          ),
        )
        .filter((skill): skill is CatalogSkill => Boolean(skill));
      boilerplates.push({
        id,
        manifest,
        dir,
        templateDir: join(dir, "template"),
        skillsDir: join(dir, "skills"),
        skills: resolvedSkills,
      });
      artifacts.push({ kind: "boilerplate", path: dir, identity: id, valid: true });
    } catch (error) {
      diagnostics.push({
        code: "INVALID_BOILERPLATE_MANIFEST",
        severity: "error",
        kind: "boilerplate",
        path: dir,
        message: error instanceof Error ? error.message : String(error),
      });
      artifacts.push({ kind: "boilerplate", path: dir, valid: false });
    }
  }

  diagnostics.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
  return freezeSnapshot({
    roots,
    artifacts,
    boilerplates,
    skills,
    workflows,
    diagnostics,
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
  });
}

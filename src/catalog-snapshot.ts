import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  boilerplateManifestSchema,
  type BoilerplateManifest,
  workflowManifestSchema,
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

async function directoryNames(
  root: string,
  diagnostics: CatalogDiagnostic[],
  required = true,
): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (!required && (error as NodeJS.ErrnoException).code === "ENOENT") return [];
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

async function loadSkill(
  dir: string,
  id: CatalogArtifactIdentity,
  scope: "shared" | "local",
  diagnostics: CatalogDiagnostic[],
  boilerplateName?: string,
): Promise<{ skill?: CatalogSkill; artifact: CatalogArtifactRecord }> {
  const name = basename(dir);
  try {
    const content = await readFile(join(dir, "SKILL.md"), "utf8");
    assertSkillCompliant(content, { directoryName: name, requireEnrichment: true });
    return {
      skill: { id, name, scope, dir, boilerplateName },
      artifact: { kind: "skill", path: dir, identity: id, valid: true },
    };
  } catch (error) {
    diagnostics.push({
      code: "INVALID_SKILL_METADATA",
      severity: "error",
      kind: "skill",
      path: dir,
      identity: id,
      message: error instanceof Error ? error.message : String(error),
    });
    return { artifact: { kind: "skill", path: dir, identity: id, valid: false } };
  }
}

async function loadWorkflow(
  dir: string,
  id: CatalogArtifactIdentity,
  scope: "shared" | "local",
  diagnostics: CatalogDiagnostic[],
  boilerplateName?: string,
): Promise<{ workflow?: CatalogWorkflow; artifact: CatalogArtifactRecord }> {
  const directoryName = basename(dir);
  try {
    const raw = await readFile(join(dir, "workflow.json"), "utf8");
    const manifest = workflowManifestSchema.parse(JSON.parse(raw));
    if (manifest.name !== directoryName) {
      throw new Error(
        `workflow name "${manifest.name}" must match directory name "${directoryName}"`,
      );
    }
    return {
      workflow: { id, name: manifest.name, scope, dir, manifest, boilerplateName },
      artifact: { kind: "workflow", path: dir, identity: id, valid: true },
    };
  } catch (error) {
    diagnostics.push({
      code: "INVALID_WORKFLOW_METADATA",
      severity: "error",
      kind: "workflow",
      path: dir,
      identity: id,
      message: error instanceof Error ? error.message : String(error),
    });
    return { artifact: { kind: "workflow", path: dir, identity: id, valid: false } };
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
  const discoveredBoilerplates: CatalogBoilerplate[] = [];

  for (const name of await directoryNames(roots.sharedSkillsDir, diagnostics)) {
    const dir = join(roots.sharedSkillsDir, name);
    const loaded = await loadSkill(dir, `shared:${name}`, "shared", diagnostics);
    if (loaded.skill) skills.push(loaded.skill);
    artifacts.push(loaded.artifact);
  }

  for (const name of await directoryNames(roots.sharedWorkflowsDir, diagnostics)) {
    const dir = join(roots.sharedWorkflowsDir, name);
    const loaded = await loadWorkflow(dir, `shared:workflows/${name}`, "shared", diagnostics);
    if (loaded.workflow) workflows.push(loaded.workflow);
    artifacts.push(loaded.artifact);
  }

  for (const directoryName of await directoryNames(roots.boilerplatesDir, diagnostics)) {
    const dir = join(roots.boilerplatesDir, directoryName);
    try {
      const raw = await readFile(join(dir, "boilerplate.json"), "utf8");
      const manifest = boilerplateManifestSchema.parse(JSON.parse(raw));
      const id = `boilerplate:${manifest.name}` as const;
      let valid = true;
      if (manifest.name !== directoryName) {
        valid = false;
        diagnostics.push({
          code: "BOILERPLATE_NAME_MISMATCH",
          severity: "error",
          kind: "boilerplate",
          path: dir,
          identity: id,
          message: `manifest name "${manifest.name}" must match directory name "${directoryName}"`,
        });
      }

      const templateDir = join(dir, "template");
      try {
        if (!(await stat(templateDir)).isDirectory()) throw new Error("not a directory");
      } catch {
        valid = false;
        diagnostics.push({
          code: "MISSING_TEMPLATE",
          severity: "error",
          kind: "boilerplate",
          path: templateDir,
          identity: id,
          message: `Template directory not found: ${templateDir}`,
        });
      }

      for (const name of await directoryNames(join(dir, "skills"), diagnostics, false)) {
        const skillDir = join(dir, "skills", name);
        const loaded = await loadSkill(
          skillDir,
          `boilerplate:${manifest.name}/skills/${name}`,
          "local",
          diagnostics,
          manifest.name,
        );
        if (loaded.skill) skills.push(loaded.skill);
        artifacts.push(loaded.artifact);
      }

      for (const name of await directoryNames(join(dir, "workflow"), diagnostics, false)) {
        const workflowDir = join(dir, "workflow", name);
        const loaded = await loadWorkflow(
          workflowDir,
          `boilerplate:${manifest.name}/workflow/${name}`,
          "local",
          diagnostics,
          manifest.name,
        );
        if (loaded.workflow) workflows.push(loaded.workflow);
        artifacts.push(loaded.artifact);
      }

      discoveredBoilerplates.push({
        id,
        manifest,
        dir,
        templateDir,
        skillsDir: join(dir, "skills"),
        skills: [],
      });
      artifacts.push({ kind: "boilerplate", path: dir, identity: id, valid });
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

  const duplicateIds = new Set<CatalogArtifactIdentity>();
  const firstArtifactById = new Map<CatalogArtifactIdentity, CatalogArtifactRecord>();
  for (const artifact of artifacts) {
    if (!artifact.identity) continue;
    const previous = firstArtifactById.get(artifact.identity);
    if (!previous) {
      firstArtifactById.set(artifact.identity, artifact);
      continue;
    }
    previous.valid = false;
    artifact.valid = false;
    duplicateIds.add(artifact.identity);
    diagnostics.push({
      code: "DUPLICATE_ARTIFACT_IDENTITY",
      severity: "error",
      kind: artifact.kind,
      path: artifact.path,
      identity: artifact.identity,
      message: `Duplicate catalog artifact identity: ${artifact.identity}`,
    });
  }

  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
  const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const invalidBoilerplates = new Set<CatalogArtifactIdentity>(duplicateIds);
  const invalidSkills = new Set<CatalogArtifactIdentity>(duplicateIds);

  for (const boilerplate of discoveredBoilerplates) {
    const { manifest } = boilerplate;
    const resolvedSkills: CatalogSkill[] = [];
    const declaredLocalIds = new Set<CatalogArtifactIdentity>();
    const seenDeclarations = new Set<string>();
    const seenInstallNames = new Map<string, CatalogArtifactIdentity>();

    for (const ref of manifest.skills) {
      const id: CatalogArtifactIdentity =
        ref.source === "shared"
          ? `shared:${ref.name}`
          : `boilerplate:${manifest.name}/skills/${ref.name}`;
      const declarationKey = `${ref.source}:${ref.name}`;
      if (seenDeclarations.has(declarationKey)) {
        invalidBoilerplates.add(boilerplate.id);
        diagnostics.push({
          code: "DUPLICATE_SKILL_DECLARATION",
          severity: "error",
          kind: "boilerplate",
          path: boilerplate.dir,
          identity: boilerplate.id,
          message: `Duplicate skill declaration: ${declarationKey}`,
        });
      }
      seenDeclarations.add(declarationKey);

      const previous = seenInstallNames.get(ref.name);
      if (previous && previous !== id) {
        invalidBoilerplates.add(boilerplate.id);
        diagnostics.push({
          code: "SKILL_INSTALL_NAME_COLLISION",
          severity: "error",
          kind: "boilerplate",
          path: boilerplate.dir,
          identity: boilerplate.id,
          message: `Skill install name ${ref.name} resolves to both ${previous} and ${id}`,
        });
      }
      seenInstallNames.set(ref.name, id);
      if (ref.source === "local") declaredLocalIds.add(id);

      const skill = skillsById.get(id);
      if (!skill) {
        invalidBoilerplates.add(boilerplate.id);
        diagnostics.push({
          code: "MISSING_DECLARED_SKILL",
          severity: "error",
          kind: "boilerplate",
          path: boilerplate.dir,
          identity: boilerplate.id,
          message: `Declared skill not found: ${id}`,
        });
      } else {
        resolvedSkills.push(skill);
      }
    }

    for (const localSkill of skills.filter(
      (skill) => skill.scope === "local" && skill.boilerplateName === manifest.name,
    )) {
      if (!declaredLocalIds.has(localSkill.id)) {
        invalidBoilerplates.add(boilerplate.id);
        invalidSkills.add(localSkill.id);
        diagnostics.push({
          code: "UNDECLARED_LOCAL_SKILL",
          severity: "error",
          kind: "skill",
          path: localSkill.dir,
          identity: localSkill.id,
          message: `Local skill is not declared by boilerplate ${manifest.name}`,
        });
      }
    }

    let workflow: CatalogWorkflow | undefined;
    if (manifest.workflow) {
      const workflowId: CatalogArtifactIdentity =
        manifest.workflow.source === "shared"
          ? `shared:workflows/${manifest.workflow.name}`
          : `boilerplate:${manifest.name}/workflow/${manifest.workflow.name}`;
      workflow = workflowsById.get(workflowId);
      if (!workflow) {
        invalidBoilerplates.add(boilerplate.id);
        diagnostics.push({
          code: "MISSING_DECLARED_WORKFLOW",
          severity: "error",
          kind: "boilerplate",
          path: boilerplate.dir,
          identity: boilerplate.id,
          message: `Declared workflow not found: ${workflowId}`,
        });
      }
    }
    boilerplate.skills = resolvedSkills;
    boilerplate.workflow = workflow;
  }

  for (const artifact of artifacts) {
    if (
      artifact.identity &&
      (invalidBoilerplates.has(artifact.identity) || invalidSkills.has(artifact.identity))
    ) {
      artifact.valid = false;
    }
  }

  const boilerplates = discoveredBoilerplates.filter(
    (boilerplate) =>
      !invalidBoilerplates.has(boilerplate.id) &&
      artifacts.some((artifact) => artifact.identity === boilerplate.id && artifact.valid),
  );
  const validSkills = skills.filter((skill) => !invalidSkills.has(skill.id));

  diagnostics.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
  return freezeSnapshot({
    roots,
    artifacts,
    boilerplates,
    skills: validSkills,
    workflows,
    diagnostics,
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
  });
}

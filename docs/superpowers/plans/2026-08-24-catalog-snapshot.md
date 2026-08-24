# Validated Catalog Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented catalog discovery with one immutable Catalog Snapshot that assigns canonical identities, accumulates structured diagnostics, and supplies every catalog consumer.

**Architecture:** Add a deep `catalog-snapshot` module that discovers, parses, indexes, and relates catalog artifacts in four deterministic phases. Keep compatibility exports in `catalog.ts`, then migrate scan, registry, scaffold, export, doctor, promotion, and synchronization to consume snapshot data instead of reconstructing identity or relationships.

**Tech Stack:** TypeScript 6, Node.js 20+ ESM, Zod 4, Commander 15, Vitest 4, `node:fs/promises`.

## Global Constraints

- Canonical identities are `boilerplate:<name>`, `shared:<skill-name>`, `boilerplate:<boilerplate-name>/skills/<skill-name>`, `shared:workflows/<name>`, and `boilerplate:<boilerplate-name>/workflow/<name>`.
- Snapshot validation covers metadata and relationships only; do not run SkillSpector or execute templates while loading.
- Accumulate all expected catalog problems as diagnostics; do not fail at the first invalid artifact.
- Invalid discovered artifacts remain in `artifacts`; only valid artifacts enter typed collections.
- An undeclared Local Skill is an error; an unbundled Shared Skill is valid.
- Skill short names must be unique within each boilerplate install set, regardless of scope.
- Snapshots are immutable and never cached process-wide.
- Registry version 1 loads; every registry save writes version 2.
- Keep transactional mutation/rollback, safety-gate consolidation, plugin reconciliation, template execution, watch mode, and filesystem abstraction out of scope.

## File Map

- Create `src/catalog-snapshot.ts` — snapshot types, discovery phases, identity, diagnostics, validity gate.
- Create `tests/catalog-fixture.ts` — small complete temporary-catalog builder used by snapshot and consumer tests.
- Create `tests/catalog-snapshot.test.ts` — snapshot interface and diagnostic contract tests.
- Create `tests/cli-list.test.ts` — partial list output and non-zero result behavior.
- Create `src/list-boilerplates-command.ts` — testable CLI presentation and exit-result adapter.
- Modify `src/schema.ts` — workflow metadata schema.
- Modify `src/catalog.ts` — compatibility facade over the snapshot.
- Modify `src/cli.ts` — injectable list action that renders diagnostics and returns an exit result.
- Modify `src/catalog-scan.ts` — enumerate canonical snapshot skills.
- Modify `src/registry.ts` — registry v1 migration, v2 schema, identity-based construction and scan updates.
- Modify `src/scaffold.ts`, `src/export-plugin.ts`, `src/doctor.ts`, `src/promote.ts`, `src/sync-skills.ts`, and `src/upstream-sync.ts` — use snapshot-derived catalog state.
- Modify `src/index.ts` — export snapshot interface.
- Modify affected tests plus `docs/ARCHITECTURE.md` and `registry/skills-index.json`.

---

### Task 1: Build the snapshot foundation and workflow schema

**Files:**
- Create: `tests/catalog-fixture.ts`
- Create: `tests/catalog-snapshot.test.ts`
- Create: `src/catalog-snapshot.ts`
- Modify: `src/schema.ts`

**Interfaces:**
- Consumes: `boilerplateManifestSchema`, `assertSkillCompliant`, and default roots from `src/paths.ts`.
- Produces: `CatalogRoots`, `CatalogArtifactIdentity`, `CatalogDiagnostic`, `CatalogArtifactRecord`, `CatalogSkill`, `CatalogWorkflow`, `CatalogSnapshot`, `CatalogValidationError`, `loadCatalogSnapshot(options?)`, and `assertValidCatalog(snapshot)`.

- [ ] **Step 1: Add a reusable complete catalog fixture**

Create `tests/catalog-fixture.ts` with helpers that always create all three roots so missing-root behavior is intentional in individual tests:

```ts
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
```

- [ ] **Step 2: Write failing happy-path and invalid-record tests**

In `tests/catalog-snapshot.test.ts`, create one valid shared skill and boilerplate, then assert canonical identity and immutability. Add malformed-manifest and missing-root cases:

```ts
const snapshot = await loadCatalogSnapshot(fixture);
expect(snapshot.valid).toBe(true);
expect(snapshot.skills.map((skill) => skill.id)).toContain("shared:code-review");
expect(snapshot.boilerplates.map((bp) => bp.id)).toContain("boilerplate:demo");
expect(Object.isFrozen(snapshot)).toBe(true);

const malformed = await loadCatalogSnapshot(fixture);
expect(malformed.valid).toBe(false);
expect(malformed.artifacts).toEqual(
  expect.arrayContaining([expect.objectContaining({ kind: "boilerplate", valid: false })]),
);
expect(malformed.diagnostics.map((d) => d.code)).toContain("INVALID_BOILERPLATE_MANIFEST");
```

- [ ] **Step 3: Run the focused tests and verify red**

Run: `npm test -- tests/catalog-snapshot.test.ts`

Expected: FAIL because `src/catalog-snapshot.ts` and the workflow schema do not exist.

- [ ] **Step 4: Add the workflow schema**

In `src/schema.ts`, export schemas that match the approved metadata contract:

```ts
const catalogNameSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "name must be lowercase-hyphen-case");

export const workflowManifestSchema = z
  .object({
    schemaVersion: z.string().min(1),
    name: catalogNameSchema,
    version: z.string().min(1),
    description: z.string().min(1),
    skills: z.array(z.object({ source: z.string().min(1), repo: z.string().min(1).optional() })),
    steps: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        skill: z.string().min(1),
        gate: z.string().min(1).optional(),
      }),
    ),
  })
  .superRefine((workflow, ctx) => {
    const seen = new Set<string>();
    for (const [index, step] of workflow.steps.entries()) {
      if (seen.has(step.id)) {
        ctx.addIssue({ code: "custom", path: ["steps", index, "id"], message: "step id must be unique" });
      }
      seen.add(step.id);
    }
  });

export type WorkflowManifest = z.infer<typeof workflowManifestSchema>;
```

Reuse `catalogNameSchema` inside `boilerplateManifestSchema` so both metadata formats enforce the same names.

- [ ] **Step 5: Implement discovery, parsing, identity, and the validity gate**

Create `src/catalog-snapshot.ts` with the exact public shape:

```ts
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
```

Implement `loadCatalogSnapshot(options: Partial<CatalogRoots> = {})` using directory entries from `readdir(root, { withFileTypes: true })`, sorted by `entry.name`, plus `node:path` helpers, `boilerplateManifestSchema`, `workflowManifestSchema`, and `assertSkillCompliant(content, { directoryName, requireEnrichment: true })`. Convert JSON/Zod/frontmatter failures into artifact records plus diagnostics. Freeze returned arrays, roots, artifact objects, and the snapshot object.

- [ ] **Step 6: Run the focused tests and verify green**

Run: `npm test -- tests/catalog-snapshot.test.ts tests/workflows.test.ts tests/skill-frontmatter.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the foundation**

```bash
git add src/schema.ts src/catalog-snapshot.ts tests/catalog-fixture.ts tests/catalog-snapshot.test.ts
git commit -m "feat: add validated catalog snapshot foundation"
```

---

### Task 2: Add relationship validation and complete diagnostics

**Files:**
- Modify: `src/catalog-snapshot.ts`
- Modify: `tests/catalog-snapshot.test.ts`

**Interfaces:**
- Consumes: Task 1 snapshot types and loader.
- Produces: fully related `CatalogBoilerplate.skills`, `CatalogBoilerplate.workflow`, and the complete diagnostic-code behavior promised by Task 1.

- [ ] **Step 1: Write failing relationship tests**

Add table-driven fixture cases with explicit setup functions:

```ts
const cases: Array<{
  title: string;
  code: CatalogDiagnosticCode;
  arrange: (fixture: CatalogFixture) => Promise<void>;
}> = [
  {
    title: "missing declared shared skill",
    code: "MISSING_DECLARED_SKILL",
    arrange: async (fixture) => {
      await writeBoilerplate(
        fixture,
        "demo",
        boilerplateManifest("demo", [{ name: "absent", source: "shared" }]),
      );
    },
  },
  {
    title: "undeclared local skill",
    code: "UNDECLARED_LOCAL_SKILL",
    arrange: async (fixture) => {
      const dir = await writeBoilerplate(fixture, "demo", boilerplateManifest("demo"));
      await writeSkill(join(dir, "skills", "logger"), "logger");
    },
  },
  {
    title: "duplicate declaration",
    code: "DUPLICATE_SKILL_DECLARATION",
    arrange: async (fixture) => {
      await writeSkill(join(fixture.sharedSkillsDir, "logger"), "logger");
      await writeBoilerplate(
        fixture,
        "demo",
        boilerplateManifest("demo", [
          { name: "logger", source: "shared" },
          { name: "logger", source: "shared" },
        ]),
      );
    },
  },
  {
    title: "shared/local install-name collision",
    code: "SKILL_INSTALL_NAME_COLLISION",
    arrange: async (fixture) => {
      await writeSkill(join(fixture.sharedSkillsDir, "logger"), "logger");
      const dir = await writeBoilerplate(
        fixture,
        "demo",
        boilerplateManifest("demo", [
          { name: "logger", source: "shared" },
          { name: "logger", source: "local" },
        ]),
      );
      await writeSkill(join(dir, "skills", "logger"), "logger");
    },
  },
  {
    title: "missing declared workflow",
    code: "MISSING_DECLARED_WORKFLOW",
    arrange: async (fixture) => {
      await writeBoilerplate(
        fixture,
        "demo",
        boilerplateManifest("demo", [], { name: "delivery", source: "shared" }),
      );
    },
  },
  {
    title: "directory and manifest mismatch",
    code: "BOILERPLATE_NAME_MISMATCH",
    arrange: async (fixture) => {
      await writeBoilerplate(fixture, "folder-name", boilerplateManifest("manifest-name"));
    },
  },
];

it.each(cases)("reports $title", async ({ arrange, code }) => {
  const root = await mkdtemp(join(tmpdir(), "bwai-catalog-relation-"));
  try {
    const fixture = await createCatalogFixture(root);
    await arrange(fixture);
    const snapshot = await loadCatalogSnapshot(fixture);
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(code);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

Add a positive test proving `boilerplate:a/skills/logger` and `boilerplate:b/skills/logger` coexist, and a deterministic-order test comparing diagnostics to a copy sorted by `[path, code]`.

- [ ] **Step 2: Run the focused tests and verify red**

Run: `npm test -- tests/catalog-snapshot.test.ts`

Expected: FAIL on each relationship diagnostic not yet produced.

- [ ] **Step 3: Implement indexing and relation phases**

Inside `loadCatalogSnapshot`, build `Map<CatalogArtifactIdentity, CatalogSkill | CatalogWorkflow | CatalogBoilerplate>` indexes. For each valid boilerplate:

```ts
const seenDeclarations = new Set<string>();
const seenInstallNames = new Map<string, CatalogArtifactIdentity>();

for (const ref of manifest.skills) {
  const id = ref.source === "shared"
    ? (`shared:${ref.name}` as const)
    : (`boilerplate:${manifest.name}/skills/${ref.name}` as const);
  const declarationKey = `${ref.source}:${ref.name}`;
  if (seenDeclarations.has(declarationKey)) {
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
  const skill = skillsById.get(id);
  if (!skill) {
    diagnostics.push({
      code: "MISSING_DECLARED_SKILL",
      severity: "error",
      kind: "boilerplate",
      path: boilerplate.dir,
      identity: boilerplate.id,
      message: `Declared skill not found: ${id}`,
    });
  }
  else resolvedSkills.push(skill);
}
```

Compare every Local Skill discovered under a boilerplate to its declared local identities and emit `UNDECLARED_LOCAL_SKILL` for leftovers. Resolve workflow references the same way and verify workflow manifest name against declaration and shared directory name. Mark an artifact record invalid when any error directly targets that artifact.

- [ ] **Step 4: Verify the validity gate reports all errors**

Add and run:

```ts
expect(() => assertValidCatalog(snapshot)).toThrow(CatalogValidationError);
try {
  assertValidCatalog(snapshot);
} catch (error) {
  expect((error as CatalogValidationError).diagnostics).toHaveLength(snapshot.diagnostics.length);
}
```

Run: `npm test -- tests/catalog-snapshot.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit relationship validation**

```bash
git add src/catalog-snapshot.ts tests/catalog-snapshot.test.ts
git commit -m "feat: validate catalog artifact relationships"
```

---

### Task 3: Move catalog compatibility, listing, and doctor to the snapshot

**Files:**
- Modify: `src/catalog.ts`
- Create: `src/list-boilerplates-command.ts`
- Modify: `src/cli.ts`
- Modify: `src/doctor.ts`
- Modify: `src/index.ts`
- Modify: `tests/catalog.test.ts`
- Create: `tests/cli-list.test.ts`
- Modify: `tests/doctor.test.ts`

**Interfaces:**
- Consumes: `loadCatalogSnapshot`, `assertValidCatalog`, `CatalogSnapshot`, and `CatalogDiagnostic`.
- Produces: compatible `listBoilerplates`/`getBoilerplate`, testable `runListBoilerplates`, and public snapshot exports from `src/index.ts`.

- [ ] **Step 1: Write failing compatibility and list-action tests**

Add custom-root tests showing `getBoilerplate` throws `CatalogValidationError` for a broken catalog. In `tests/cli-list.test.ts`, import from `src/list-boilerplates-command.ts`, create one valid boilerplate plus one malformed boilerplate directory, and inject the loaded snapshot:

```ts
const stdout: string[] = [];
const stderr: string[] = [];
const snapshot = await loadCatalogSnapshot(fixture);
const exitCode = await runListBoilerplates({
  loadSnapshot: async () => snapshot,
  stdout: (line) => stdout.push(line),
  stderr: (line) => stderr.push(line),
});
expect(stdout.join("\n")).toContain("demo");
expect(stderr.join("\n")).toContain("INVALID_BOILERPLATE_MANIFEST");
expect(exitCode).toBe(1);
```

Add a doctor test injecting invalid snapshot roots and expecting a failed `catalog` check containing the diagnostic count.

- [ ] **Step 2: Run focused tests and verify red**

Run: `npm test -- tests/catalog.test.ts tests/cli-list.test.ts tests/doctor.test.ts`

Expected: FAIL because compatibility and list action still use legacy discovery.

- [ ] **Step 3: Replace silent catalog loading**

Implement `catalog.ts` as a compatibility facade:

```ts
export async function listBoilerplates(
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<Boilerplate[]> {
  const snapshot = await loadCatalogSnapshot({ boilerplatesDir });
  assertValidCatalog(snapshot);
  return [...snapshot.boilerplates];
}

export async function getBoilerplate(
  name: string,
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<Boilerplate> {
  const snapshot = await loadCatalogSnapshot({ boilerplatesDir });
  assertValidCatalog(snapshot);
  const match = snapshot.boilerplates.find((boilerplate) => boilerplate.manifest.name === name);
  if (!match) {
    const available = snapshot.boilerplates.map((boilerplate) => boilerplate.manifest.name).join(", ") || "(none)";
    throw new Error(`Unknown boilerplate: "${name}". Available: ${available}.`);
  }
  return match;
}
```

Keep the current unknown-boilerplate wording.

- [ ] **Step 4: Extract and wire the list action**

Create `src/list-boilerplates-command.ts` with:

```ts
export interface ListBoilerplatesIo {
  loadSnapshot: () => Promise<CatalogSnapshot>;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

function renderBoilerplate(boilerplate: CatalogBoilerplate, write: (line: string) => void): void {
  write(`${boilerplate.manifest.name}  (${boilerplate.manifest.stack})`);
  write(`  ${boilerplate.manifest.description}`);
  write(`  skills: ${boilerplate.skills.map((skill) => skill.name).join(", ") || "(none)"}`);
  if (boilerplate.workflow) write(`  workflow: ${boilerplate.workflow.id}`);
  write(`  default agents: ${boilerplate.manifest.defaultAgents.join(", ")}`);
}

export async function runListBoilerplates(io: ListBoilerplatesIo): Promise<0 | 1> {
  const snapshot = await io.loadSnapshot();
  for (const boilerplate of snapshot.boilerplates) renderBoilerplate(boilerplate, io.stdout);
  for (const diagnostic of snapshot.diagnostics) {
    io.stderr(`${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`);
  }
  return snapshot.valid ? 0 : 1;
}
```

The Commander action in `src/cli.ts` imports this function, calls it with default roots, and sets `process.exitCode = 1` only when the result is non-zero. Keep all current list output fields.

- [ ] **Step 5: Use snapshot diagnostics in doctor and export public types**

Make the doctor catalog check call `loadCatalogSnapshot`; mark it `fail` when `snapshot.valid` is false and include error count. Preserve `runDoctor(cwd)` and add an optional `runDoctor(cwd, { catalogRoots })` second argument for isolated tests. Export loader, assertion, validation error, and snapshot types from `src/index.ts`.

- [ ] **Step 6: Verify focused and full tests**

Run: `npm test -- tests/catalog.test.ts tests/cli-list.test.ts tests/doctor.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit compatibility migration**

```bash
git add src/catalog.ts src/list-boilerplates-command.ts src/cli.ts src/doctor.ts src/index.ts tests/catalog.test.ts tests/cli-list.test.ts tests/doctor.test.ts
git commit -m "refactor: route catalog reads through snapshot"
```

---

### Task 4: Make catalog scanning consume canonical snapshot skills

**Files:**
- Modify: `src/catalog-scan.ts`
- Modify: `tests/catalog-scan.test.ts`

**Interfaces:**
- Consumes: `CatalogSkill.id`, `CatalogSkill.dir`, `loadCatalogSnapshot`, and `assertValidCatalog`.
- Produces: scan results whose `id` is `CatalogArtifactIdentity`; no catalog identity originates in the scan module.

- [ ] **Step 1: Write failing scan identity tests**

Replace label-prefix assertions with canonical IDs:

```ts
const targets = await listCatalogSkillTargets();
expect(targets.map((target) => target.id)).toContain("shared:code-review");
expect(targets.some((target) => target.id.startsWith("boilerplate:"))).toBe(true);
```

Add a broken-catalog fixture and assert `scanCatalog` rejects with `CatalogValidationError` before `scanner.scan` is called.

- [ ] **Step 2: Run the scan tests and verify red**

Run: `npm test -- tests/catalog-scan.test.ts`

Expected: FAIL because current IDs are scanner-specific strings and invalid catalog state is skipped.

- [ ] **Step 3: Reimplement target enumeration as a snapshot projection**

```ts
export async function listCatalogSkillTargets(
  opts: Partial<CatalogRoots> = {},
): Promise<CatalogSkillTarget[]> {
  const snapshot = await loadCatalogSnapshot(opts);
  assertValidCatalog(snapshot);
  return snapshot.skills.map((skill) => ({
    id: skill.id,
    label: skill.scope === "shared" ? `shared/${skill.name}` : `boilerplate/${skill.boilerplateName}/${skill.name}`,
    dir: skill.dir,
  }));
}
```

Update `ScanCatalogOptions` to accept all snapshot roots. Keep labels for human output only. Continue sanitizing canonical IDs only when forming report filenames.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/catalog-scan.test.ts tests/scan.test.ts`

Expected: PASS.

```bash
git add src/catalog-scan.ts tests/catalog-scan.test.ts
git commit -m "refactor: scan canonical catalog skills"
```

---

### Task 5: Migrate registry identity to version 2

**Files:**
- Modify: `src/registry.ts`
- Modify: `tests/registry.test.ts`
- Modify: `tests/upstream-sync.test.ts`
- Modify: `registry/skills-index.json`

**Interfaces:**
- Consumes: `CatalogSnapshot` and canonical `CatalogSkill.id`.
- Produces: `RegistrySkill.id: CatalogArtifactIdentity`, `SkillsIndex.indexVersion: 2`, v1 input migration, and identity-based `findRegistrySkill`/`applyCatalogScanToRegistry`.

- [ ] **Step 1: Write failing version-migration and collision tests**

Add tests that load a minimal v1 registry and assert:

```ts
const migrated = await loadRegistry(registryPath);
expect(migrated.indexVersion).toBe(2);
expect(migrated.skills[0]?.id).toBe("shared:code-review");
await saveRegistry(migrated, registryPath);
expect(JSON.parse(await readFile(registryPath, "utf8")).indexVersion).toBe(2);
```

Add a snapshot fixture with Local Skills named `logger` in two boilerplates and assert both qualified IDs survive registry construction. Add a scan-application test proving results update by `id`, not `bundledIn[0]`.

- [ ] **Step 2: Run registry tests and verify red**

Run: `npm test -- tests/registry.test.ts tests/upstream-sync.test.ts`

Expected: FAIL because only registry version 1 and name lookup exist.

- [ ] **Step 3: Add explicit v1 and v2 schemas**

In `registry.ts`, preserve the old shape as `skillsIndexV1Schema`, define v2 with:

```ts
const registrySkillV2Schema = registrySkillV1Schema.extend({
  id: z.string().min(1),
});

export const skillsIndexSchema = z.object({
  indexVersion: z.literal(2),
  updatedAt: z.string(),
  skills: z.array(registrySkillV2Schema),
});
```

`loadRegistry` parses JSON, accepts either schema, and migrates v1 IDs from `catalogLocation`, `catalogPath`, and `bundledIn`. If a local v1 entry cannot identify exactly one boilerplate, throw a migration error naming that entry instead of guessing.

- [ ] **Step 4: Build and update registry by canonical identity**

Delete the `listCatalogSkillTargets` import from `registry.ts`. Change `buildRegistryFromCatalog` to accept an optional `snapshot` and otherwise load/assert one. Iterate `snapshot.skills`; use `skill.id` as the existing-entry map key. Change:

```ts
export function findRegistrySkill(index: SkillsIndex, id: string): RegistrySkill | undefined {
  return index.skills.find((skill) => skill.id === id);
}
```

Make `applyCatalogScanToRegistry` map scan results by `id`. Remove label reconstruction and `bundledIn[0]` lookup.

- [ ] **Step 5: Regenerate the committed registry**

Run: `npm run build && node dist/cli.js registry-refresh`

Expected: `registry/skills-index.json` has `indexVersion: 2`, every skill has `id`, and local skills have boilerplate-qualified IDs.

- [ ] **Step 6: Verify and commit registry migration**

Run: `npm test -- tests/registry.test.ts tests/catalog-scan.test.ts tests/upstream-sync.test.ts`

Expected: PASS.

```bash
git add src/registry.ts tests/registry.test.ts tests/upstream-sync.test.ts registry/skills-index.json
git commit -m "feat: migrate registry to canonical catalog identity"
```

---

### Task 6: Migrate remaining catalog consumers and remove duplicate resolution

**Files:**
- Modify: `src/scaffold.ts`
- Modify: `src/export-plugin.ts`
- Modify: `src/promote.ts`
- Modify: `src/sync-skills.ts`
- Modify: `src/upstream-sync.ts`
- Modify: `tests/scaffold.test.ts`
- Modify: `tests/export-plugin.test.ts`
- Modify: `tests/registry.test.ts`
- Modify: `tests/upstream-sync.test.ts`

**Interfaces:**
- Consumes: snapshot-loaded `CatalogBoilerplate.skills`, `CatalogBoilerplate.workflow`, and registry v2 identity.
- Produces: all catalog workflows operating through the snapshot; no caller invokes `resolveSkillDirectory` to rediscover a declared catalog relationship.

- [ ] **Step 1: Write failing consumer tests against invalid catalogs**

For scaffold and export, use a temporary fixture whose manifest declares a missing skill and assert `CatalogValidationError` before the target directory is written. For sync and promotion, assert invalid pre-existing catalog state blocks mutation. For upstream sync, assert registry lookup uses the shared identity:

```ts
await expect(scaffold({
  boilerplateName: "demo",
  targetDir,
  agents: ["claude"],
  catalogRoots: fixture,
})).rejects.toBeInstanceOf(CatalogValidationError);
expect(await exists(targetDir)).toBe(false);
```

Add `catalogRoots?: Partial<CatalogRoots>` to mutation/scaffold/export option types. Preserve existing `boilerplatesDir` and `sharedSkillsDir` fields and merge them into `catalogRoots` so current callers remain compatible.

- [ ] **Step 2: Run consumer tests and verify red**

Run: `npm test -- tests/scaffold.test.ts tests/export-plugin.test.ts tests/registry.test.ts tests/upstream-sync.test.ts`

Expected: FAIL because consumers do not accept or use snapshot roots.

- [ ] **Step 3: Load one validated snapshot before consumer side effects**

At the beginning of scaffold/export/promote/sync operations:

```ts
const snapshot = await loadCatalogSnapshot({
  ...options.catalogRoots,
  ...(options.boilerplatesDir ? { boilerplatesDir: options.boilerplatesDir } : {}),
});
assertValidCatalog(snapshot);
const boilerplate = snapshot.boilerplates.find((entry) => entry.manifest.name === boilerplateName);
if (!boilerplate) {
  const available = snapshot.boilerplates.map((entry) => entry.manifest.name).join(", ") || "(none)";
  throw new Error(`Unknown boilerplate: "${boilerplateName}". Available: ${available}.`);
}
```

Use `boilerplate.skills[].dir` when copying or packaging skills and `boilerplate.workflow?.dir` when copying workflows. Validate before creating output directories or copying catalog artifacts.

- [ ] **Step 4: Move sync and upstream lookups to identity**

For shared registry entries, use `shared:${skill.name}`. Preserve CLI `--skill <name>` as a display-name convenience but resolve it only among Shared Skills; throw an ambiguity error if future data produces more than one match. When a mutation needs a post-write registry rebuild, load a new snapshot and assert it before saving registry v2.

- [ ] **Step 5: Remove obsolete relationship reconstruction**

Delete caller imports of `resolveSkillDirectory`, `resolveWorkflowDirectory`, and scanner labels where they are no longer needed. Keep `skills.ts` and `workflows.ts` functions only if a remaining non-snapshot caller genuinely uses them; otherwise delete the unused exports and update `src/index.ts`.

- [ ] **Step 6: Verify consumer tests and the whole suite**

Run: `npm test -- tests/scaffold.test.ts tests/export-plugin.test.ts tests/registry.test.ts tests/upstream-sync.test.ts tests/catalog.test.ts`

Expected: PASS.

Run: `npm test && npm run typecheck && npm run lint`

Expected: all commands exit 0.

- [ ] **Step 7: Commit consumer migration**

```bash
git add src tests
git commit -m "refactor: consume validated catalog snapshots"
```

---

### Task 7: Document the seam and run release-level verification

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `README.md` only if command output or maintainer instructions changed.

**Interfaces:**
- Consumes: completed snapshot and registry v2 behavior.
- Produces: documented artifact identities, validation scope, diagnostics behavior, and verified release artifacts.

- [ ] **Step 1: Update architecture documentation**

Add a “Catalog Snapshot” section to `docs/ARCHITECTURE.md` containing:

```md
## Catalog Snapshot

Every catalog reader loads one immutable snapshot of boilerplates, skills, and workflows. The snapshot assigns scope-qualified identities, validates metadata and relationships, and accumulates diagnostics before strict commands perform work.

`list-boilerplates` prints valid entries plus diagnostics and exits non-zero for an invalid catalog. SkillSpector and runnable-template checks remain separate gates.
```

Document registry version 2 identity examples and the v1 read-migration guarantee.

- [ ] **Step 2: Run the complete repository verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
node dist/cli.js list-boilerplates
node dist/cli.js doctor
npm pack --dry-run --cache /tmp/bwai-catalog-snapshot-npm-cache
```

Expected:

- Vitest reports all test files and tests passing.
- TypeScript exits 0.
- Prettier reports all matched files formatted.
- `tsup` builds `dist/cli.js` successfully.
- `list-boilerplates` lists all seven current boilerplates and exits 0.
- Doctor reports the catalog check as `ok`.
- Package dry-run includes `dist`, `boilerplates`, `shared`, and registry version 2.

- [ ] **Step 3: Confirm no legacy identity reconstruction remains**

Run:

```bash
rg 'target\.dir\.split|label\.startsWith|bundledIn\[0\]' src tests
rg 'listCatalogSkillTargets' src/registry.ts
```

Expected: both commands return no matches.

- [ ] **Step 4: Review the final diff against the design**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended snapshot, consumer, registry, tests, and documentation files are changed.

- [ ] **Step 5: Commit documentation and final cleanup**

```bash
git add docs/ARCHITECTURE.md README.md
git commit -m "docs: explain validated catalog snapshots"
```

- [ ] **Step 6: Request code review**

Use the `requesting-code-review` skill against the design and this implementation plan. Address correctness findings before branch integration.

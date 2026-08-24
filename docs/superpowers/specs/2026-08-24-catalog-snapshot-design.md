# Validated Catalog Snapshot Design

**Date:** 2026-08-24
**Status:** Approved design

## Purpose

Replace fragmented catalog discovery with one immutable, validated Catalog Snapshot. Every catalog reader will share the same artifact identities, relationships, and diagnostics instead of reconstructing them from paths, labels, or partial directory walks.

## Problem

Catalog knowledge is currently spread across `catalog.ts`, `catalog-scan.ts`, `registry.ts`, `skills.ts`, and `workflows.ts`:

- `listBoilerplates` silently skips directories whose manifest is missing or invalid.
- Catalog scan invents string IDs and display labels that registry code later parses to recover identity.
- Registry construction derives skill names from filesystem separators and maps local scan results through `bundledIn[0]`.
- Declared and physical artifacts are validated independently by different callers.
- Boilerplate-local skill directories can exist without a manifest declaration.
- A local and shared skill with the same short name can collide at scaffold installation paths even though their catalog scopes differ.

This produces a shallow discovery interface: callers must understand filesystem layout, scope rules, identity encoding, and error behavior.

## Domain Decisions

The canonical language is recorded in `CONTEXT.md`.

### Complete snapshot with diagnostics

Loading returns a complete snapshot and accumulates all expected catalog problems as structured diagnostics. It does not fail at the first invalid artifact, and invalid discoveries remain represented in the snapshot.

Strict consumers reject a snapshot containing error diagnostics. `list-boilerplates` still prints valid boilerplates and diagnostics, then exits non-zero.

### Catalog validation scope

The snapshot validates catalog metadata and relationships:

- Manifest JSON and schema
- Directory and manifest name consistency
- Declared artifact existence
- Skill frontmatter compliance
- Workflow metadata structure and declared workflow identity
- Duplicate identities and declarations
- Local-skill ownership
- Per-boilerplate install-name uniqueness

The snapshot does not run SkillSpector, execute generated projects, install dependencies, or test templates. Those remain separate gates.

Workflow metadata validation initially requires:

- Non-empty `schemaVersion`, `name`, `version`, and `description` strings
- A lowercase-hyphen-case workflow `name`
- A `skills` array whose entries contain a non-empty `source` and optional string `repo`
- A `steps` array whose entries contain non-empty `id`, `title`, and `skill` strings plus an optional string `gate`
- Unique step IDs
- A workflow name matching its manifest declaration and, for shared workflows, its directory name

### Artifact identity

Canonical skill identity is scope-qualified:

- Shared Skill: `shared:<skill-name>`
- Local Skill: `boilerplate:<boilerplate-name>/skills/<skill-name>`

Other Catalog Artifacts use:

- Boilerplate: `boilerplate:<boilerplate-name>`
- Shared workflow: `shared:workflows/<workflow-name>`
- Local workflow: `boilerplate:<boilerplate-name>/workflow/<workflow-name>`

Short names and labels are presentation fields, not identity. Two boilerplates may own different Local Skills with the same short name. A single boilerplate may not declare a Local Skill and Shared Skill with the same short name because both install to the same destination.

The directory `boilerplates/<name>` and the manifest's `name` field must match exactly.

### Local and shared ownership

A Local Skill has exactly one owning boilerplate and must be declared by that boilerplate. An undeclared Local Skill is an error.

A Shared Skill may exist without being bundled by any boilerplate.

### Snapshot lifecycle

Snapshots are immutable and are not cached across operations. Each catalog read phase loads a fresh snapshot. A mutation command may load a second snapshot after writing to validate the resulting catalog state.

## Architecture

### New deep module

Add `src/catalog-snapshot.ts`. It owns:

1. Filesystem discovery beneath configurable catalog roots.
2. Metadata parsing for each discovered artifact.
3. Canonical identity construction.
4. Index construction and duplicate detection.
5. Manifest-to-artifact relationship resolution.
6. Deterministic Catalog Diagnostic creation.

The module exposes a small interface for loading a snapshot, inspecting artifacts and diagnostics, reading valid artifact collections, and asserting validity.

Its implementation may use existing parsing and path helpers internally, but callers must not need filesystem-layout knowledge to consume the snapshot.

### Snapshot data

The immutable Catalog Snapshot contains:

- Every discovered artifact record, including invalid records
- Valid boilerplates indexed by boilerplate name
- Valid skills indexed by Catalog Artifact Identity
- Valid workflows indexed by Catalog Artifact Identity
- A deterministically ordered list of Catalog Diagnostics
- A validity value derived from the absence of error diagnostics

Each discovered artifact record includes its kind, source path, validation state, and canonical identity when one can be derived safely.

Each diagnostic includes:

- Stable diagnostic code
- Severity
- Artifact kind
- Source path
- Canonical identity when known
- Human-readable message

Expected catalog problems become diagnostics. Unexpected programming failures may still throw.

### Initial diagnostic set

The initial error codes cover:

- Missing or unreadable catalog root
- Invalid manifest JSON or schema
- Boilerplate directory/name mismatch
- Duplicate artifact identity
- Missing template directory
- Missing or invalid declared skill
- Undeclared Local Skill
- Duplicate skill declaration
- Per-boilerplate skill install-name collision
- Missing or invalid workflow metadata

Stable codes are part of the snapshot interface; prose messages are not.

## Loading Flow

Snapshot loading runs four deterministic phases:

1. **Discover:** enumerate candidate artifact paths in sorted order.
2. **Parse:** parse each artifact independently and retain invalid records.
3. **Index:** assign canonical identities and detect duplicates or name mismatches.
4. **Relate:** resolve manifest declarations and detect missing, conflicting, or undeclared artifacts.

Diagnostics are sorted deterministically by source path, then diagnostic code. This keeps CLI output and tests stable across platforms.

Portable path operations must use `node:path` helpers. Identity must never be derived by splitting on `/` or parsing display labels.

## Consumer Migration

Migrate consumers in this order:

1. Make `catalog.ts` delegate existing list/get behavior to the snapshot.
2. Make catalog scanning enumerate snapshot skills and carry canonical identity in results.
3. Make registry construction consume snapshot artifacts directly.
4. Move scaffold, plugin export, doctor, promotion, and synchronization to snapshot-derived relationships.
5. Remove scanner-specific catalog discovery and legacy identity reconstruction after the last consumer migrates.

`listBoilerplates` and `getBoilerplate` remain exported for compatibility. They no longer silently hide invalid catalog state. Strict domain workflows assert snapshot validity before performing their work.

## Registry Migration

Increment `registry/skills-index.json` to `indexVersion: 2`.

Version 2 skill entries include canonical identity and retain `name` as a display field. Registry lookup and scan-result application use canonical identity.

The registry loader accepts version 1 and migrates it in memory. A subsequent save always writes version 2. The committed registry is regenerated as version 2 during implementation.

## Error Presentation

Strict CLI commands print every Catalog Diagnostic error to stderr and exit non-zero before domain work begins.

`list-boilerplates` is the exception for output behavior: it prints valid boilerplates to stdout, prints diagnostics to stderr, and exits non-zero when errors exist. This preserves useful discovery without representing a partial catalog as healthy.

## Testing

Use temporary catalog fixtures to verify the snapshot interface rather than private parsing functions.

Required cases:

- Multiple independent diagnostics collected in one load
- Invalid artifacts retained as discovery records
- Directory and manifest name mismatch
- Missing declared skill
- Missing declared workflow
- Invalid skill frontmatter
- Invalid workflow metadata
- Undeclared Local Skill
- Duplicate declaration
- Local/Shared Skill install-name collision
- Same Local Skill short name in different boilerplates remains valid
- Deterministic diagnostic ordering
- Portable identity construction without path-string splitting
- Partial `list-boilerplates` output with a non-zero exit status
- Registry version 1 migration and version 2 persistence
- Existing scaffold, scan, export, promotion, and synchronization behavior

The full repository test, typecheck, lint, build, CLI smoke, and package dry-run checks must pass.

## Out of Scope

- Transactional catalog writes or rollback
- SkillSpector policy consolidation
- Agent Plugin regeneration fixes
- Executing or dependency-installing scaffolded templates
- Watch mode or persistent snapshot caching
- A general filesystem seam without a second adapter

## Completion Criteria

- No catalog consumer reconstructs identity from labels or path separators.
- Invalid catalog artifacts cannot disappear silently.
- Strict commands report all catalog errors before domain work.
- Read-only listing preserves useful partial output and fails visibly.
- Registry version 1 loads and version 2 saves.
- All existing behavior remains covered and the full verification suite passes.

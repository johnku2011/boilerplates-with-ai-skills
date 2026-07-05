# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this repo is

`boilerplates-with-ai-skills` ships the **`bwai` CLI** and a catalog of
security-vetted, cross-agent project boilerplates. Each boilerplate scaffolds a
runnable project plus a curated `SKILL.md` skill set wired for Claude, Cursor,
Codex, and Copilot, with NVIDIA SkillSpector gating and a `skills.lock`
provenance file.

See `requirements.md` (v1.1) and `docs/landscape-and-differentiation.md` for
product scope and positioning.

## Commands (this repo)

```bash
npm install
npm run build          # bundle CLI → dist/cli.js
npm test               # vitest (tests/**/*.test.ts only)
npm run lint           # prettier --check on src/ + tests/
npm run typecheck
npm run dev -- --help  # run CLI from source (tsx)
```

CLI smoke checks:

```bash
node dist/cli.js list-boilerplates
node dist/cli.js new node-service /tmp/demo --agents claude
node dist/cli.js scan-catalog --threshold 30 --require-scanner
node dist/cli.js scan-project /tmp/demo --threshold 50
node dist/cli.js sync-skills
node dist/cli.js sync-upstream
node dist/cli.js search-skills testing --limit 5
```

## Layout

- `src/` — `bwai` CLI (`list-boilerplates`, `new`, `scan-catalog`, `scan-project`, `search-skills`, `promote`, `sync-skills`, `sync-upstream`)
- `registry/skills-index.json` — promoted skill metadata, upstream pins, bundle rules
- `docs/superpowers-upstream.md` — Superpowers alignment and upstream sync
- `shared/skills/` — catalog-wide skills (`source: "shared"` in manifests)
- `boilerplates/` — catalog (`<name>/boilerplate.json`, `template/`, local `skills/`)
- `tests/` — vitest unit/integration tests
- `.github/workflows/ci.yml` — build/test + catalog scan + SkillSpector safety-gate job

`bwai new` resolves `local` + `shared` skills into one `.bwai/skills/` bundle in the
generated project; end users only pick a boilerplate name.

## Conventions

- TypeScript (ESM), Commander CLI, Zod schemas, tsup bundle.
- Boilerplate templates store `.gitignore` as `gitignore`; `bwai new` restores the dotfile.
- Skill format: spec-compliant `SKILL.md` (agentskills.io). Every bundled skill must pass SkillSpector before promotion.
- Risk assessment uses **NVIDIA SkillSpector** only (`src/scan.ts`); do not invent a custom scanner.

## Cursor Cloud specific instructions

- **Update script:** `npm ci` (or `npm install` if no lockfile) — see Cloud VM startup config.
- **SkillSpector (optional locally):** `uv tool install git+https://github.com/NVIDIA/skillspector.git` — not on PyPI as `skillspector`. CI runs `scan-catalog --require-scanner` and `scan-project --require-scanner`; without SkillSpector locally, scans record skills as `skipped` unless `--require-scanner`.
- **Boilerplate template tests** under `boilerplates/**/template/` use `node:test`, not vitest — excluded in `vitest.config.ts`.
- Do not merge stale branches `cursor/document-spec-only-env-9690` or `cursor/landscape-and-differentiation-9690`; their PRs predate the full implementation (PR #2 content is already on `main`).

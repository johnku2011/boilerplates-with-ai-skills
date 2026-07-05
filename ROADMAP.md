# Roadmap

All major phases through **2D** are complete. This file tracks what shipped and
what could come next.

## Phase 2A — Trust & CI (done)

SkillSpector in CI, SARIF reports, `scan-catalog`, MIT LICENSE.

## Phase 2B — Discovery & promotion (done)

Registry, `promote`, `sync-skills`, daily discovery workflow, `project-security`.

## Phase 2C — Depth & upstream (done)

Deepened skills, `deploy-vercel`, `sync-upstream`, Superpowers alignment doc.

## Phase 2D — Distribution & community (done)

| Item | Status |
| --- | --- |
| npm package **`bwai-cli`** (v0.2.1, `prepublishOnly`, publish workflow) | Done |
| `fastify-api` boilerplate | Done |
| `python-service` boilerplate (FastAPI + pytest) | Done |
| `CONTRIBUTING.md` | Done |
| Close stale PRs #1, #2 | Done (superseded by main) |

## Possible follow-ups

| Item | Notes |
| --- | --- |
| First npm publish | Done — [`bwai-cli`](https://www.npmjs.com/package/bwai-cli); see [`docs/npm-publish.md`](./docs/npm-publish.md) |
| Landing page | **`site/`** — Vercel (repo root + `vercel.json`) or GitHub Pages — [`docs/landing-deploy.md`](./docs/landing-deploy.md) |
| `remix-app` boilerplate | Deferred; Fastify + Python added in 2D |
| Skill depth passes | Continue expanding shared skills on a schedule |
| GetSuperpower **`bwai-delivery`** workflow bundled on `bwai new` | Done — [`docs/getsuperpower-integration.md`](./docs/getsuperpower-integration.md) |
| Upstream PRs to Superpowers / getsuperpower | SkillSpector hook in getsuperpower `validate` (future) |

## Commands reference

npm package: **`bwai-cli`**. Use `npx bwai-cli …` without a global install. After `npm i -g bwai-cli`, **`bwai-cli`** and **`bwai`** are equivalent.

```bash
npx bwai-cli list-boilerplates
npx bwai-cli new <boilerplate> [dir] --agents claude,cursor
bwai scan-catalog --threshold 30 --require-scanner
bwai scan-project [dir] --threshold 50 --require-scanner
bwai search-skills [query] --source all --scan 5
bwai promote <name> --from ./path --target shared --require-scanner
bwai sync-skills
bwai sync-upstream [--apply] [--skill <name>] --require-scanner
bwai registry-refresh
```

SkillSpector: `uv tool install git+https://github.com/NVIDIA/skillspector.git`

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`docs/superpowers-upstream.md`](./docs/superpowers-upstream.md).

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
| npm package **`bwai`** (v0.2.0, `prepublishOnly`, publish workflow) | Done |
| `fastify-api` boilerplate | Done |
| `python-service` boilerplate (FastAPI + pytest) | Done |
| `CONTRIBUTING.md` | Done |
| Close stale PRs #1, #2 | Done (superseded by main) |

## Possible follow-ups

| Item | Notes |
| --- | --- |
| First npm publish | Maintainer adds `NPM_TOKEN`, runs publish workflow or `npm publish` |
| Landing page | **`site/`** — deploy on **Vercel** (root `site`) or GitHub Pages — [`docs/landing-deploy.md`](./docs/landing-deploy.md) |
| `remix-app` boilerplate | Deferred; Fastify + Python added in 2D |
| Skill depth passes | Continue expanding shared skills on a schedule |
| Upstream PRs to Superpowers | Contribute generic improvements back |

## Commands reference

```bash
npx bwai list-boilerplates
npx bwai new <boilerplate> [dir] --agents claude,cursor
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

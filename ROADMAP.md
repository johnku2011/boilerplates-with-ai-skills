# Roadmap

This document tracks what ships after each phase.

## Phase 2A — Trust & CI (done)

Goal: make the security gate real in CI and match the spec’s reporting shape.

| Item | Status |
| --- | --- |
| Fix SkillSpector install in CI (`uv tool install` from GitHub, not PyPI) | Done |
| `bwai scan-catalog` — scan `shared/skills/` + `boilerplates/*/skills/` | Done |
| SARIF output in `scan-project` and catalog scans (`safety-reports/*.sarif`) | Done |
| Stricter catalog threshold in CI (default 30) | Done |
| `LICENSE` (MIT) | Done |

## Phase 2B — Discovery & promotion (current)

Goal: close the loop from `search-skills` to curated catalog skills.

| Item | Status |
| --- | --- |
| `registry/skills-index.json` | Done |
| Daily GitHub Action (`.github/workflows/skill-discovery.yml`) | Done |
| `bwai promote` | Done |
| `bwai sync-skills` | Done |
| `bwai registry-refresh` | Done |
| `search-skills --json` for CI | Done |
| `project-security` shared skill (bundled in all boilerplates) | Done |

## Phase 2C — Depth & upstream (next)

Goal: richer agent guidance and upstream alignment.

| Item | Notes |
| --- | --- |
| Superpowers upstream | Align with [obra/superpowers](https://github.com/obra/superpowers) workflows where applicable |
| Deepen thin skills | Expand shared skills beyond ~30-line stubs |
| `deploy-vercel` shared skill | Deployment guidance for Next/Express boilerplates |
| Registry upstream sync | Pull pinned upstream refs into `shared/skills/` on schedule |

## Phase 2D — Distribution & community

| Item | Notes |
| --- | --- |
| npm publish `bwai` | Public CLI on npm |
| More boilerplates | e.g. Fastify, Remix, Python service |
| `CONTRIBUTING.md` | Promotion criteria, scan thresholds, skill authoring |
| Close stale PRs | #1 (spec-only AGENTS), #2 (landscape — already on main) |

## Commands reference

```bash
bwai list-boilerplates
bwai new <boilerplate> [dir] --agents claude,cursor
bwai scan-catalog --threshold 30 --require-scanner
bwai scan-project [dir] --threshold 50 --require-scanner
bwai search-skills [query] --source all --scan 5
bwai search-skills security --scan 5 --json   # CI / discovery
bwai promote <name> --from ./path --target shared --require-scanner
bwai sync-skills                              # apply registry bundle rules
bwai registry-refresh                         # rebuild index from disk
```

SkillSpector install:

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

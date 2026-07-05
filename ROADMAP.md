# Roadmap

This document tracks what ships after each phase. **Phase 2A is in progress on this branch.**

## Phase 2A — Trust & CI (current)

Goal: make the security gate real in CI and match the spec’s reporting shape.

| Item | Status |
| --- | --- |
| Fix SkillSpector install in CI (`uv tool install` from GitHub, not PyPI) | Done on branch |
| `bwai scan-catalog` — scan `shared/skills/` + `boilerplates/*/skills/` | Done on branch |
| SARIF output in `scan-project` and catalog scans (`safety-reports/*.sarif`) | Done on branch |
| Stricter catalog threshold in CI (default 30) | Done on branch |
| `LICENSE` (MIT) | Done on branch |

## Phase 2B — Discovery & promotion (next)

Goal: close the loop from `search-skills` to curated catalog skills.

| Item | Notes |
| --- | --- |
| `registry/skills-index.json` | Machine-readable index of promoted skills + metadata |
| Daily GitHub Action | Run `bwai search-skills --scan N`, open issues or PRs for high-signal candidates |
| `bwai promote <skill>` | Copy vetted skill into `shared/skills/` or a boilerplate with provenance |
| `bwai sync-skills` | Refresh shared skills across boilerplates from lock/index |
| `project-security` shared skill | Security review skill bundled with every boilerplate |

## Phase 2C — Depth & upstream (next’s next)

Goal: richer agent guidance and upstream alignment.

| Item | Notes |
| --- | --- |
| Superpowers upstream | Align with [obra/superpowers](https://github.com/obra/superpowers) workflows where applicable |
| Deepen thin skills | Expand shared skills beyond ~30-line stubs |
| `deploy-vercel` shared skill | Deployment guidance for Next/Express boilerplates |
| Baseline SARIF in repo | Optional committed `safety-reports/catalog/` from real scans |

## Phase 2D — Distribution & community

| Item | Notes |
| --- | --- |
| npm publish `bwai` | Public CLI on npm |
| More boilerplates | e.g. Fastify, Remix, Python service |
| `CONTRIBUTING.md` | Promotion criteria, scan thresholds, skill authoring |
| Close stale PRs | #1 (spec-only AGENTS), #2 (landscape — already on main) |

## Commands reference (today)

```bash
bwai list-boilerplates
bwai new <boilerplate> [dir] --agents claude,cursor
bwai scan-catalog --threshold 30 --require-scanner
bwai scan-project [dir] --threshold 50 --require-scanner
bwai search-skills [query] --source all --scan 5
```

SkillSpector install:

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

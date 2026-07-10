# Roadmap

Phases **2A–2D** shipped the core product. **2E** is polish and ops hygiene.

## Phase 2A — Trust & CI (done)

SkillSpector in CI, SARIF reports, `scan-catalog`, MIT LICENSE.

## Phase 2B — Discovery & promotion (done)

Registry, `promote`, `sync-skills`, daily discovery workflow, `project-security`.

## Phase 2C — Depth & upstream (done)

Deepened skills, `deploy-vercel`, `sync-upstream`, Superpowers alignment doc.

## Phase 2D — Distribution & community (done)

| Item | Status |
| --- | --- |
| npm package **`bwai-cli`** (`prepublishOnly`, publish workflow) | Done |
| `fastify-api` + `python-service` boilerplates | Done |
| `CONTRIBUTING.md` | Done |
| GetSuperpower **`bwai-delivery`** workflow (manifest-driven) | Done — [`docs/getsuperpower-integration.md`](./docs/getsuperpower-integration.md) |
| npm publish [`bwai-cli`](https://www.npmjs.com/package/bwai-cli) | Done — [`docs/npm-publish.md`](./docs/npm-publish.md) |

## Phase 2E — Polish (done)

| Item | Status |
| --- | --- |
| README badges (npm, CI, SkillSpector) | Done |
| Landing live on Vercel + `package.json` homepage | Done — https://boilerplates-with-ai-skills.vercel.app |
| Skill-discovery rolling queue (no duplicate issues) | Done — triage issues #8, #11 closed |
| Prettier / lint clean | Done |
| CI matrix: all boilerplates | Done |
| `bwai doctor` first-run checks | Done |
| Upstream: SkillSpector in getsuperpower `validate` | Planned |

**Current npm release:** `bwai-cli@0.2.5`

## Phase 2F — Scaffold CI (done)

| Item | Status |
| --- | --- |
| `skill-scan.yml` in every boilerplate `template/` | Done — canonical in `shared/ci/skill-scan.yml` |
| CI + tests assert workflow is scaffolded | Done |

## Possible follow-ups

| Item | Notes |
| --- | --- |
| `remix-app` boilerplate | Deferred |
| Stack-specific GetSuperpower workflows (`boilerplates/<name>/workflow/`) | Optional |
| Skill depth passes | Expand shared skills on a schedule |
| npm Trusted Publishing (OIDC) | Replace long-lived `NPM_TOKEN` |
| Upstream: SkillSpector in getsuperpower `validate` | Planned (from 2E) |

## Commands reference

npm package: **`bwai-cli`**. Use `npx bwai-cli …` without a global install. After `npm i -g bwai-cli`, **`bwai-cli`** and **`bwai`** are equivalent.

```bash
npx bwai-cli list-boilerplates
npx bwai-cli doctor
npx bwai-cli new <boilerplate> [dir] --agents claude,cursor
bwai scan-catalog --threshold 30 --require-scanner
bwai scan-project [dir] --threshold 50 --require-scanner
bwai search-skills [query] --source all --scan 5
bwai promote <name> --from ./path --target shared --require-scanner
bwai sync-skills
bwai sync-upstream [--apply] [--skill <name>] --require-scanner
bwai registry-refresh
bwai list-workflows
```

SkillSpector: `uv tool install git+https://github.com/NVIDIA/skillspector.git`

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), and [`docs/superpowers-upstream.md`](./docs/superpowers-upstream.md).

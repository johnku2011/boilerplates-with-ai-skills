# boilerplates-with-ai-skills

[![npm version](https://img.shields.io/npm/v/bwai-cli)](https://www.npmjs.com/package/bwai-cli)
[![CI](https://github.com/johnku2011/boilerplates-with-ai-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/johnku2011/boilerplates-with-ai-skills/actions/workflows/ci.yml)
[![catalog: SkillSpector ≤30](https://img.shields.io/badge/catalog%20skills-SkillSpector%20%E2%89%A430-green)](./safety-reports/catalog/summary.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**`npx` a stack starter that ships with curated, scanned agent skills** — wired for
Claude, Cursor, Codex, and Copilot, with NVIDIA SkillSpector gating and a
`skills.lock` provenance file.

Every generated project includes the [Omni-Skills](https://github.com/devos-ing/omni-skills)
startup workflow bench: `$startup-goal`, `$founding-engineer`, `$qa-lead`, `$cto`, and
`$product-manager` are ready the moment you scaffold.

```bash
npx bwai-cli new node-service ./my-app --agents claude,cursor
```

After global install, `bwai-cli` and the shorter alias `bwai` are the same CLI.

## Quick start

| | |
| --- | --- |
| **List starters** | `npx bwai-cli list-boilerplates` |
| **Check setup** | `npx bwai-cli doctor` |
| **Scaffold** | `npx bwai-cli new nextjs-app ./app --agents claude,cursor` |
| **Scan skills** | `bwai scan-project ./app --threshold 50` |

**Six boilerplates:** `nextjs-app`, `express-api`, `fastify-api`,
`python-service`, `node-service`, `react-native-app`.

## What you get on scaffold

```
my-app/
  src/ or app/              # runnable template for your stack
  .bwai/skills/             # canonical curated skills
    startup-goal/           # orchestrate a goal across role subagents
    founding-engineer/      # implement, test, debug, verify
    qa-lead/                # acceptance checks + release risk
    cto/                    # architecture + technical direction
    product-manager/        # PRDs, issue slicing, roadmap
    …                       # stack-specific skills (TDD, code-review, etc.)
  .claude/skills/ …         # mirrored for each --agents target
  skills.lock               # SHA-256 + scan status per skill
  .github/workflows/skill-scan.yml  # SkillSpector gate on push/PR
  workflows/bwai-delivery/  # delivery workflow bundle
```

Each skill is a spec-compliant [`SKILL.md`](https://agentskills.io/specification).
Role skills are vendored from [Omni-Skills](https://github.com/devos-ing/omni-skills)
and pinned in `registry/skills-index.json`. Run `bwai sync-upstream` to pull updates.

## Usage

```bash
bwai list-boilerplates
bwai doctor
bwai new node-service ./my-app --agents claude,cursor
bwai scan-project ./my-app --threshold 50
bwai scan-catalog --threshold 30 --require-scanner
bwai search-skills "code review"
bwai promote my-skill --from ./path/to/skill --target shared --require-scanner
bwai sync-upstream          # pull latest omni-skills content
bwai sync-skills
```

## The safety gate

`bwai scan-project` runs SkillSpector over each installed skill, updates
`skills.lock`, writes `safety-reports/` (JSON + SARIF), and **exits 1** when any
skill exceeds the threshold.

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
bwai scan-project --threshold 50 --require-scanner
```

Without SkillSpector locally, scans record `skipped` unless you pass `--require-scanner`.

## Repository layout

```
src/                     # bwai-cli (TypeScript)
shared/skills/           # catalog skills (source: "shared")
shared/workflows/        # GetSuperpower bundles (e.g. bwai-delivery)
boilerplates/<name>/     # boilerplate.json, template/, skills/, optional workflow/
registry/skills-index.json  # upstream pins + scan status
docs/
tests/
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for boilerplates vs skills vs workflows.

## Adding a boilerplate

Create `boilerplates/<name>/` with `boilerplate.json`, `template/` (ship `.gitignore`
as `gitignore`), optional local `skills/` and `workflow/`. Reference shared skills
with `{ "name": "code-review", "source": "shared" }`. Bundled skills must pass
SkillSpector in CI.

**Contributors:** clone, `npm install`, `npm run build`, `npm test` — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

**Landing page:** https://boilerplates-with-ai-skills.vercel.app

## Credits

- **[Omni-Skills](https://github.com/devos-ing/omni-skills)** by devos-ing — startup role workflow bench bundled in every project.
- **[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)** — safety scanner that gates every bundled skill.

## License

MIT

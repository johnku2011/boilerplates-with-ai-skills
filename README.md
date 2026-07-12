# boilerplates-with-ai-skills

[![npm version](https://img.shields.io/npm/v/bwai-cli)](https://www.npmjs.com/package/bwai-cli)
[![CI](https://github.com/johnku2011/boilerplates-with-ai-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/johnku2011/boilerplates-with-ai-skills/actions/workflows/ci.yml)
[![catalog: SkillSpector ≤30](https://img.shields.io/badge/catalog%20skills-SkillSpector%20%E2%89%A430-green)](./safety-reports/catalog/summary.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**`npx` a stack starter that ships with curated, scanned agent skills** — wired for
Claude, Cursor, Codex, and Copilot, with NVIDIA SkillSpector gating and a
`skills.lock` provenance file.

Not a skills marketplace. Not a replacement for [Superpowers](https://github.com/obra/superpowers) or
[getsuperpower](https://github.com/0xroylee/getsuperpower) — we bundle **runnable
projects + a small vetted skill set + a visible security gate**.

Every generated project ships with the [Omni-Skills](https://github.com/devos-ing/omni-skills)
startup workflow bench: `$startup-goal`, `$founding-engineer`, `$qa-lead`, `$cto`, and
`$product-manager` are ready to call the moment you scaffold.

**npm:** [`bwai-cli`](https://www.npmjs.com/package/bwai-cli) · **Try it:**

```bash
npx bwai-cli list-boilerplates
npx bwai-cli new node-service ./my-app --agents claude,cursor
cd my-app && bwai scan-project --threshold 50
```

After global install, `bwai-cli` and the shorter alias `bwai` are the same CLI.
(npm blocks the package name `bwai` — too similar to existing packages.)

## Quick start

| | |
| --- | --- |
| **List starters** | `npx bwai-cli list-boilerplates` |
| **Check setup** | `npx bwai-cli doctor` |
| **Scaffold** | `npx bwai-cli new nextjs-app ./app --agents claude,cursor` |
| **Scan skills** | `bwai scan-project ./app --threshold 50` |
| **Optional workflow** | `npx getsuperpower install ./workflows/bwai-delivery --agents claude,cursor` |

**Six boilerplates today:** `nextjs-app`, `express-api`, `fastify-api`,
`python-service`, `node-service`, `react-native-app`.

Most include a [GetSuperpower](https://github.com/0xroylee/getsuperpower) delivery
workflow (`shared:bwai-delivery` in the manifest). `react-native-app` is skills-only.

## What you get on scaffold

```
my-app/
  src/ or app/              # runnable template for your stack
  .bwai/skills/             # canonical curated skills
    startup-goal/           # omni-skills: orchestrate a full startup workflow
    founding-engineer/      # omni-skills: implement, test, debug, verify
    qa-lead/                # omni-skills: acceptance checks + release risk
    cto/                    # omni-skills: architecture + technical direction
    product-manager/        # omni-skills: PRDs, issue slicing, roadmap
    …                       # stack-specific skills (TDD, code-review, etc.)
  .claude/skills/ …         # mirrored for each --agents target
  skills.lock               # SHA-256 + scan status per skill
  .github/workflows/skill-scan.yml  # SkillSpector gate on push/PR
  workflows/bwai-delivery/  # when declared in boilerplate.json
```

Each skill is a spec-compliant [`SKILL.md`](https://agentskills.io/specification).
Catalog skills are scanned in CI with [SkillSpector](https://github.com/NVIDIA/SkillSpector)
(threshold 30); `scan-project` re-runs the gate in your repo.

The five role skills are vendored from [Omni-Skills](https://github.com/devos-ing/omni-skills)
and kept current via `bwai sync-upstream`.

## Install

```bash
npx bwai-cli list-boilerplates
npx bwai-cli new node-service ./my-app --agents claude,cursor

npm i -g bwai-cli
bwai list-boilerplates          # short alias
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — boilerplates vs skills vs workflows.

### bwai + Omni-Skills

The role skills (`$startup-goal`, `$founding-engineer`, etc.) are pre-installed in every project.
To keep them fresh as [Omni-Skills](https://github.com/devos-ing/omni-skills) ships updates:

```bash
bwai sync-upstream   # pull latest skill content from upstream pins
```

### bwai + GetSuperpower (optional)

```bash
npx bwai-cli new nextjs-app ./my-app --agents claude,cursor
cd my-app
npx getsuperpower install ./workflows/bwai-delivery --agents claude,cursor
```

Details: [`docs/getsuperpower-integration.md`](./docs/getsuperpower-integration.md).
Skip workflow: `--no-workflow`. List bundles: `bwai-cli list-workflows`.

**Contributors:** clone, `npm install`, `npm run build`, `npm test` — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

**Landing page:** https://boilerplates-with-ai-skills.vercel.app ([`site/`](./site/) — deploy via [`docs/landing-deploy.md`](./docs/landing-deploy.md)).

## Usage

```bash
bwai list-boilerplates
bwai doctor
bwai new node-service ./my-app --agents claude,cursor
bwai scan-project ./my-app --threshold 50
bwai scan-catalog --threshold 30 --require-scanner
bwai search-skills "code review" --scan 3
bwai promote my-skill --from ./path/to/skill --target shared --require-scanner
bwai sync-skills
bwai sync-upstream
bwai list-workflows
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
docs/ARCHITECTURE.md
tests/
```

Deep dives: [`requirements.md`](./requirements.md),
[`docs/landscape-and-differentiation.md`](./docs/landscape-and-differentiation.md),
[`ROADMAP.md`](./ROADMAP.md).

## Adding a boilerplate

Create `boilerplates/<name>/` with `boilerplate.json`, `template/` (ship `.gitignore`
as `gitignore`), optional local `skills/` and `workflow/`. Reference shared skills
with `{ "name": "code-review", "source": "shared" }`. Bundled skills must pass
SkillSpector in CI.

## Credits

- **[Omni-Skills](https://github.com/devos-ing/omni-skills)** by devos-ing — the startup role workflow bench (`startup-goal`, `founding-engineer`, `qa-lead`, `cto`, `product-manager`) vendored under MIT.
- **[Superpowers](https://github.com/obra/superpowers)** — source of the `test-driven-development` and `code-review` shared skills.
- **[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)** — the safety scanner that gates every bundled skill.
- **[GetSuperpower](https://github.com/0xroylee/getsuperpower)** — optional delivery workflow integration.

## License

MIT

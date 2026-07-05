# boilerplates-with-ai-skills

**`npx` a stack starter that ships with curated, scanned agent skills** — wired for
Claude, Cursor, Codex, and Copilot, with NVIDIA SkillSpector gating and a
`skills.lock` provenance file.

Not a skills marketplace. Not a replacement for [Superpowers](https://github.com/obra/superpowers) or
[getsuperpower](https://github.com/0xroylee/getsuperpower) — we bundle **runnable
projects + a small vetted skill set + a visible security gate**.

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
  .claude/skills/ …         # mirrored for each --agents target
  skills.lock               # SHA-256 + scan status per skill
  workflows/bwai-delivery/  # when declared in boilerplate.json
```

Each skill is a spec-compliant [`SKILL.md`](https://agentskills.io/specification).
Catalog skills are scanned in CI with [SkillSpector](https://github.com/NVIDIA/SkillSpector)
(threshold 30); `scan-project` re-runs the gate in your repo.

## Install

```bash
npx bwai-cli list-boilerplates
npx bwai-cli new node-service ./my-app --agents claude,cursor

npm i -g bwai-cli
bwai list-boilerplates          # short alias
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — boilerplates vs skills vs workflows.

### bwai + GetSuperpower (optional)

```bash
npx bwai-cli new nextjs-app ./my-app --agents claude,cursor
cd my-app
npx getsuperpower install ./workflows/bwai-delivery --agents claude,cursor
```

Details: [`docs/getsuperpower-integration.md`](./docs/getsuperpower-integration.md).
Skip workflow: `--no-workflow`. List bundles: `bwai-cli list-workflows`.

**Contributors:** clone, `npm install`, `npm run build`, `npm test` — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

**Landing page:** [`site/`](./site/) — deploy via Vercel (root `vercel.json`) or GitHub Pages
([`docs/landing-deploy.md`](./docs/landing-deploy.md)).

## Usage

```bash
bwai list-boilerplates
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

## License

MIT

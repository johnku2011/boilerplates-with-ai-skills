# boilerplates-with-ai-skills

**Security-vetted, cross-agent project boilerplates.** Scaffold a project for
your stack and get a working starter *plus* a small, curated set of AI-agent
skills that are wired for Claude, Cursor, Codex, and GitHub Copilot — with a
visible SkillSpector safety gate and a reproducible provenance lockfile.

See [`requirements.md`](./requirements.md) for the full spec and
[`docs/landscape-and-differentiation.md`](./docs/landscape-and-differentiation.md)
for why this project focuses on *bundling starters with vetted skills* and a
*security gate* rather than reinventing skill formats, installers, or directories.

> Status: Phase 2D — npm package **`bwai-cli`**, `CONTRIBUTING.md`, `fastify-api` and
> `python-service` boilerplates. See [`ROADMAP.md`](./ROADMAP.md).
>
> Boilerplates: `nextjs-app`, `express-api`, `fastify-api`, `python-service`,
> `react-native-app`, `node-service`.

## Install

**From npm** (recommended):

| | |
| --- | --- |
| **npm package** | [`bwai-cli`](https://www.npmjs.com/package/bwai-cli) |
| **One-off run** | `npx bwai-cli …` |
| **After global install** | `bwai-cli …` or `bwai …` (same CLI — `bwai` is a shorter alias) |

npm blocks the package name `bwai` (too similar to existing packages). The product is still **bwai**; only the npm package name is `bwai-cli`.

```bash
npx bwai-cli list-boilerplates
npx bwai-cli new node-service ./my-app --agents claude,cursor

npm i -g bwai-cli
bwai list-boilerplates          # short alias works too
```

### bwai scaffold + GetSuperpower workflow

Every `bwai-cli new` copies the **`bwai-delivery`** GetSuperpower workflow into
`workflows/bwai-delivery/`. After scaffold:

```bash
npx getsuperpower install ./workflows/bwai-delivery --agents claude,cursor
```

See [`docs/getsuperpower-integration.md`](./docs/getsuperpower-integration.md).
Skip with `--no-workflow`. List bundles with `bwai-cli list-workflows`.

**Landing page:** deploy from repo root on **Vercel** (root `vercel.json` serves `site/`) or GitHub Pages — see [`docs/landing-deploy.md`](./docs/landing-deploy.md).

**From source** (contributors):

```bash
npm install       # install dependencies
npm run build     # bundle the CLI to dist/cli.js
npm test          # run the vitest suite
npm run lint      # prettier --check
npm run typecheck # tsc --noEmit
npm run dev -- --help   # run the CLI from source (tsx)
```

## Usage

Examples use the short alias **`bwai`**. After `npm i -g bwai-cli`, **`bwai-cli`** runs the same commands.

```bash
# List available boilerplates
bwai list-boilerplates

# Scaffold a new project with skills wired for specific agents
bwai new node-service ./my-app --agents claude,cursor

# Run the SkillSpector safety gate over the project's skills
bwai scan-project ./my-app --threshold 50

# Scan all skills shipped in this repo (shared + boilerplate-local)
bwai scan-catalog --threshold 30 --require-scanner

# Discover recently-updated skills from public hubs (GitHub + SkillsMP)
bwai search-skills testing --limit 10
# ...and score the top results with SkillSpector while you browse
bwai search-skills "code review" --scan 3

# Promote a vetted skill into the catalog after manual review
bwai promote my-skill --from ./path/to/skill --target shared --require-scanner
bwai sync-skills   # apply registry bundle rules to boilerplate manifests
bwai sync-upstream # check pinned Superpowers refs; add --apply to pull
bwai list-workflows # GetSuperpower workflow bundles shipped with bwai-cli
```

`bwai new` copies the boilerplate template, installs the curated skills into a
canonical `.bwai/skills/` plus each agent's skill directory
(`.claude/skills/`, `.cursor/rules/`, `.codex/skills/`, `.agents/skills/`), and
writes `skills.lock` with each skill's source, SHA-256, install targets, and
scan status.

## Discovering skills

`bwai search-skills <query>` queries public hubs for recently-updated agent
skills and merges the results (newest first):

- **GitHub** repo search filtered by the `claude-skill` topic (works
  unauthenticated; set `GITHUB_TOKEN` for a higher rate limit).
- **SkillsMP** marketplace REST API (`sortBy=recent`; set `SKILLSMP_API_KEY`
  for higher limits).

Pass `--scan <n>` to run the SkillSpector scanner over the top `n` results and
print each one's risk score — useful for triaging newly-discovered skills before
promoting any into a boilerplate. Use `--source github|skillsmp|all` and
`--sort recent|stars` to tune the query.

## The safety gate

`bwai scan-project` runs the [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)
scanner over each installed skill, records the risk score in `skills.lock`,
writes reports to `safety-reports/` (JSON + SARIF when the scanner supports it), and **fails (exit 1) when any skill exceeds
the risk threshold**.

- Install the scanner: `uv tool install git+https://github.com/NVIDIA/skillspector.git`
- If the scanner is not installed, skills are recorded as `skipped` and the gate
  passes unless you pass `--require-scanner`.
- Use `--llm` to enable SkillSpector's semantic analysis and `--threshold <n>`
  to tune strictness (the spec suggests `<30` for high-assurance bundles).

## Repository layout

```
src/                     # the bwai CLI (TypeScript, bundled with tsup)
shared/skills/           # catalog-wide skills (resolved at scaffold; not picked separately)
boilerplates/            # the boilerplate catalog
  <name>/
    boilerplate.json     # manifest (skills declare source: local | shared)
    template/            # files copied into a new project
    skills/              # stack-specific local skills only
tests/                   # vitest unit/integration tests
.github/workflows/ci.yml # build/test + safety-gate jobs
```

### Shared vs local skills

- **`shared`** skills live once under `shared/skills/` (e.g. `test-driven-development`,
  `code-review`). Each boilerplate references them in `boilerplate.json`; `bwai new`
  copies them into the project automatically — users never install shared skills separately.
- **`local`** skills live under `boilerplates/<name>/skills/` for stack-specific guidance
  (e.g. `nextjs-app-router`, `express-api-design`).

## Adding a boilerplate

Create `boilerplates/<name>/` with a `boilerplate.json` manifest, a `template/`
directory (store `.gitignore` as `gitignore`; it is restored on scaffold), and
optional local `skills/` for stack-specific skills. Reference shared skills with
`{ "name": "code-review", "source": "shared" }`. Every bundled skill must pass
the SkillSpector gate in CI.

## License

MIT

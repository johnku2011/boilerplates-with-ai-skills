# boilerplates-with-ai-skills

**Security-vetted, cross-agent project boilerplates.** Scaffold a project for
your stack and get a working starter *plus* a small, curated set of AI-agent
skills that are wired for Claude, Cursor, Codex, and GitHub Copilot — with a
visible SkillSpector safety gate and a reproducible provenance lockfile.

See [`requirements.md`](./requirements.md) for the full spec and
[`docs/landscape-and-differentiation.md`](./docs/landscape-and-differentiation.md)
for why this project focuses on *bundling starters with vetted skills* and a
*security gate* rather than reinventing skill formats, installers, or directories.

> Status: Phase 1 foundation — the `bwai` CLI (`list-boilerplates`, `new`,
> `search-skills`, `scan-project`), a `skills.lock` provenance file, and a
> SkillSpector safety gate wired into CI.
>
> Boilerplates: `nextjs-app` (Next.js App Router + React + TS), `express-api`
> (Express.js on Vercel), `react-native-app` (Expo / React Native + TS), and
> `node-service` (minimal Node ESM).

## Install / develop

```bash
npm install       # install dependencies
npm run build     # bundle the CLI to dist/cli.js
npm test          # run the vitest suite
npm run lint      # prettier --check
npm run typecheck # tsc --noEmit
npm run dev -- --help   # run the CLI from source (tsx)
```

## Usage

```bash
# List available boilerplates
bwai list-boilerplates

# Scaffold a new project with skills wired for specific agents
bwai new node-service ./my-app --agents claude,cursor

# Run the SkillSpector safety gate over the project's skills
bwai scan-project ./my-app --threshold 50

# Discover recently-updated skills from public hubs (GitHub + SkillsMP)
bwai search-skills testing --limit 10
# ...and score the top results with SkillSpector while you browse
bwai search-skills "code review" --scan 3
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
writes reports to `safety-reports/`, and **fails (exit 1) when any skill exceeds
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

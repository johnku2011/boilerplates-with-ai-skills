# getsuperpower — Install & Verification Notes

Evaluation of `https://github.com/0xroylee/getsuperpower.git`, installed and run
end-to-end to understand the closest existing tool to parts of our spec. See
`docs/landscape-and-differentiation.md` for the strategic comparison.

## What it is

`getsuperpower` (npm `getsuperpower`, v0.3.3) is a **Bun + TypeScript CLI** that
packages an entire agent workflow as one callable **skill tree**. A
`workflow.json` declares an entry skill plus ordered sub-skill `steps` (with
optional `human_approval` gates); the CLI installs the required skills across
multiple agents and records the installed workflow under `.getsuperpower/`.

- Runtime: Bun; deps are minimal (`commander`, `zod`, `@clack/prompts`,
  `picocolors`).
- Supported agent targets: Claude (`.claude/skills`), Codex/opencode/Copilot
  (`.agents/skills`, Codex mirror `.codex/skills`), Cursor (`.cursor/rules`).
- Skill sources: bundled, local dirs, Superpowers plugin cache,
  Matt Pocock installs, and external git packages.
- Commands: `init`, `validate`, `deps`, `install`/`clone`, `list`, `skills
  install|update`, `onboard`, plus `bundle`/`workflow` compatibility aliases.

## How to install & run (Bun required)

```bash
curl -fsSL https://bun.sh/install | bash      # if bun is not present
export PATH="$HOME/.bun/bin:$PATH"
bun install
bun run build
bun run ci:test         # non-e2e test suite
./node_modules/.bin/biome check .
bun run typecheck
bun run dev -- --help   # run the CLI
```

## Verification results (this environment)

- `bun install` → 15 packages installed, exit 0.
- `bun run build` → bundled 100 modules → `dist/cli.js` (~0.71 MB).
- `bun run ci:test` → **111 pass / 0 fail** (522 assertions, 12 files).
- `biome check .` → **58 files, no issues**.
- `tsc --noEmit` → clean.
- End-to-end `init` → `validate` (valid, 3 steps / 4 skills) → `deps` →
  `install --agents claude` (fetched Superpowers skills, wrote skills into
  `~/.claude/skills`, created `.getsuperpower/workflows/<name>.json`) → `list`
  (shows the installed workflow). All succeeded.

## Gotchas observed

- `validate`/`install` expect a **path-like** source; a bare relative name is
  treated as an unsupported source. Use `./name` or an absolute path.
- The install flag is `--agents` (plural), not `--agent`.
- Some non-Claude agent targets ("PromptScript") reject global skill installs;
  Claude/Codex/Cursor targets work.
- AGENTS.md documents an `rtk`-prefixed command convention used by the project's
  own Codex setup; plain `bun run ...` works fine locally.

## Relevance to us

Closest existing implementation of our **CLI + cross-agent skill install +
authoring** goals. It does **not** scaffold project boilerplates and has **no
security scanning** — those remain our differentiators (see the landscape doc).

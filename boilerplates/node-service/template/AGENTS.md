# AGENTS.md

Guidance for AI coding agents working in this project.

## Commands

- `npm test` — run tests (uses the built-in `node:test` runner; no dependencies).
- `npm start` — run the service entry point (`src/index.js`).

## Conventions

- ES modules (`"type": "module"`); use `import`/`export`.
- Keep `src/` focused on domain logic and add a matching test under `test/`.

## Skills

Curated agent skills are installed under `.bwai/skills/` (canonical) and mirrored
into agent-specific directories. Prefer the installed skills (e.g.
`test-driven-development`, `code-review`) for those workflows. Re-validate skills
with `bwai scan-project` before trusting new or edited ones.

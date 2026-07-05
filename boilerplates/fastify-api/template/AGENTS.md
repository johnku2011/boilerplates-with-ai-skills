# AGENTS.md

Guidance for AI coding agents working in this Fastify project.

## Commands

- `npm install` — install dependencies (Fastify).
- `npm test` — run HTTP tests (`node:test`; ephemeral port).
- `npm start` — serve the API on `PORT` (default 3000).

## Conventions

- ES modules (`"type": "module"`).
- Export `createApp()` from `src/app.js`; keep `src/server.js` as a thin entry.
- Add a test under `test/` for each new route.

## Skills

Curated skills live under `.bwai/skills/`. Prefer `fastify-api-design` and
`test-driven-development` for API work; re-validate with `bwai scan-project`.

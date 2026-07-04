# AGENTS.md

Guidance for AI coding agents working in this Express.js project.

## Commands

- `npm install` — install dependencies (Express).
- `npm test` — run HTTP tests (built-in `node:test`; starts the app on an
  ephemeral port and asserts responses).
- `npm start` — serve the API on `PORT` (default 3000).

## Conventions

- ES modules (`"type": "module"`).
- Keep route/handler logic in `src/app.js` (exports `createApp()`), and keep
  `src/server.js` as a thin entry point so tests can mount the app without a
  fixed port.
- Add a test under `test/` for each new route.

## Skills

Curated skills live under `.bwai/skills/` (canonical) and are mirrored into each
agent's directory. Prefer `express-api-design` and `test-driven-development` for
those workflows; re-validate skills with `bwai scan-project`.

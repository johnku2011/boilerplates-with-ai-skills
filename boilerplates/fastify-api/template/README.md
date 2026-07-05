# fastify-api

Minimal Fastify (ESM) API starter with HTTP tests and AI agent skills pre-wired.

## Quick start

```bash
npm install
npm test
npm start
```

## Layout

- `src/app.js` — `createApp()` factory (routes + plugins)
- `src/server.js` — listens on `PORT` (default 3000)
- `test/` — integration tests with `node:test`

Skills are installed under `.bwai/skills/` when scaffolded with `bwai new`.

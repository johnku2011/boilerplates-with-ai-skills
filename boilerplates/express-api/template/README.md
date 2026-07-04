# express-api

Express.js (ESM) API starter, scaffolded by
[`boilerplates-with-ai-skills`](https://github.com/johnku2011/boilerplates-with-ai-skills)
and deployable to Vercel. Ships with AI-agent config and a curated,
security-vetted skill set.

## Quick start

```bash
npm install
npm test        # zero-dependency HTTP tests via node:test
npm start       # serves http://localhost:3000
```

Endpoints:

- `GET /` — greeting
- `GET /api/health` — `{ "status": "ok" }`
- `POST /api/echo` — echoes the JSON body

## Deploy

`vercel.json` routes all traffic to `src/server.js` via `@vercel/node`.

## AI agent skills

Curated skills (`express-api-design`, `test-driven-development`) were installed
into `.bwai/skills/` and each agent's directory during scaffolding. Re-validate
with `bwai scan-project`.

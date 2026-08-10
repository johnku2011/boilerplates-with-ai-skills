# nextjs-ai-app

Next.js (App Router) AI product starter with the Vercel AI SDK, Zod tool
schemas, and a streaming chat demo. Scaffolded by
[`boilerplates-with-ai-skills`](https://github.com/johnku2011/boilerplates-with-ai-skills)
and deployable to Vercel. Ships with AI-agent config and a curated,
security-vetted skill set.

## Quick start

```bash
cp .env.example .env.local   # set OPENAI_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm test
npm run build
npm run typecheck
```

## What's included

- `app/api/chat/route.ts` — streaming chat via AI SDK + OpenAI
- `lib/tools.ts` — demo Zod-validated tool (`getWeather`)
- Playwright MCP configs (`.mcp.json`, `.cursor/mcp.json`) for UI smoke checks

## AI agent skills

Curated skills (`nextjs-ai-sdk`, `project-security`, …) were installed into
`.bwai/skills/` and each agent's directory during scaffolding. Re-validate with
`bwai scan-project`.

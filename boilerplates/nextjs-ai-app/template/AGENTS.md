# AGENTS.md

Guidance for AI coding agents working in this Next.js AI product.

## Commands

- `npm install` — install dependencies (Next.js, AI SDK, Zod).
- `npm run dev` — start the dev server at `http://localhost:3000`.
- `npm test` — Zod schema unit tests (`node:test`).
- `npm run build` — production build (also the best correctness check).
- `npm run typecheck` — `tsc --noEmit`.

## Environment

- Copy `.env.example` to `.env.local`.
- Set `OPENAI_API_KEY` (server-only). Never use `NEXT_PUBLIC_*` for model keys.

## Conventions

- App Router under `app/`; keep model calls in Route Handlers (`app/api/**`).
- Define LLM tools with Zod schemas under `lib/`.
- Client UI may use `ai/react` hooks; secrets stay on the server.
- Prefer structured outputs when the UI needs a fixed shape.

## MCP

Least-privilege Playwright MCP is configured in `.mcp.json` and
`.cursor/mcp.json` for browser smoke checks of the chat UI. MCP is not a
security boundary — approve tool calls carefully; prefer headless local runs.

## Skills

Curated skills live under `.bwai/skills/` (canonical) and are mirrored into each
agent's directory. Prefer `nextjs-ai-sdk` and `project-security`; re-validate
skills with `bwai scan-project`.

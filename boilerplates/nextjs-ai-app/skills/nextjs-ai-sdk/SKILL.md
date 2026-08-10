---
name: nextjs-ai-sdk
description: Use when adding chat routes, LLM tools, structured outputs, or streaming UI with the Vercel AI SDK in this Next.js AI app.
license: MIT
compatibility: Next.js App Router + AI SDK + Zod; requires OPENAI_API_KEY (or compatible provider env)
allowed-tools: Read Bash
metadata:
  stack: nextjs-ai
---

# Next.js AI SDK

## Overview

Build AI product features with the Vercel AI SDK: server route handlers for
streaming, Zod-validated tool schemas, and thin client UI. Keep secrets and
model calls on the server.

## Process

1. Add or extend `app/api/chat/route.ts` with `streamText` (or equivalent) — never
   call providers from client components with secret keys.
2. Define tools with Zod schemas in `lib/tools.ts` (or colocated modules); return
   typed, small results agents/UI can render.
3. Prefer structured outputs (`generateObject` / schema) when the UI needs a
   known shape instead of free-form prose.
4. Keep `app/page.tsx` (or chat UI) as a client leaf; pass messages to the API
   route only.
5. Verify with `npm run typecheck` and `npm run build`. Smoke the chat UI with
   `npm run dev` when changing streaming behavior.

## Guidelines

- Read `OPENAI_API_KEY` (or provider env) only on the server.
- Validate all tool arguments with Zod; reject unknown keys.
- Document model id and provider choice in code comments when non-default.
- For browser QA of the chat UI, use the project Playwright MCP (see AGENTS.md).
- Re-check secrets and data exposure with `project-security` before shipping.

## Anti-patterns

- Exposing API keys via `NEXT_PUBLIC_*`.
- Untyped tool arguments or free-form JSON without a schema.
- Doing privileged tool work in the browser.
- Giant route handlers mixing UI strings, prompts, and business logic.

---
name: deploy-vercel
description: Use when deploying or configuring this project on Vercel — env vars, build settings, serverless limits, and production checks for Next.js or Express.
---

# Deploy on Vercel

## Overview

Ship this project to Vercel with correct env vars, build settings, and production
checks. Applies to **Next.js App Router** and **Express API** boilerplates in
this catalog.

## Pre-deploy Checklist

- [ ] `npm run build` passes locally
- [ ] `npm test` passes
- [ ] Secrets are in Vercel project settings, not in git
- [ ] No debug logging of tokens or PII
- [ ] Production URL and env documented in README

## Next.js App Router

1. Connect the Git repo in the Vercel dashboard (or `vercel link` + `vercel deploy`).
2. Framework preset: **Next.js** (auto-detected).
3. Set server-only env vars in Vercel — never prefix secrets with `NEXT_PUBLIC_`.
4. Use Server Components and Route Handlers for privileged logic.
5. After deploy, smoke-test critical routes and API handlers.

**Common issues:**
- Build fails on server/client boundary — find `"use client"` leaks of server modules.
- Missing env at build time — set vars for Production **and** Preview if needed.

## Express API (serverless)

1. This boilerplate ships `vercel.json` routing to the Express app.
2. Set `NODE_ENV=production` and API secrets in Vercel env settings.
3. Keep handlers stateless — no in-memory session stores across invocations.
4. Run integration tests against `vercel dev` before promoting to production.

**Common issues:**
- Cold starts — keep startup lean; lazy-load heavy deps.
- Body size / timeout — respect Vercel function limits; return 413/504 gracefully.

## Environment Variables

| Kind | Where |
| --- | --- |
| Secrets (API keys, DB URLs) | Vercel → Settings → Environment Variables (Production) |
| Public config (analytics ID) | `NEXT_PUBLIC_*` only when safe for browsers |
| Local dev | `.env.local` (gitignored) — never commit |

## Post-deploy

1. Hit health or home route; confirm expected status.
2. Check Vercel function logs for startup errors.
3. Run `bwai scan-project` on the deployed repo clone if skills changed.

## Rollback

Use Vercel instant rollback to the previous production deployment if smoke tests fail.
Fix forward only after identifying root cause.

## Anti-patterns

- Committing `.env` or Vercel tokens to git.
- Using production secrets in Preview without understanding exposure.
- Deploying with a red test suite or skipped security review on auth changes.

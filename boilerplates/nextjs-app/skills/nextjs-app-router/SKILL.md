---
name: nextjs-app-router
description: Use when adding pages, layouts, route handlers, or data fetching in this Next.js App Router project, to follow server-first conventions correctly.
---

# Next.js App Router

## Overview

Build features the App Router way: server components by default, client
components only when needed, and colocated routes under `app/`.

## Process

1. Add a route by creating `app/<segment>/page.tsx`; add `layout.tsx` for shared
   UI and `loading.tsx`/`error.tsx` for states.
2. Keep components as React Server Components unless they need state, effects, or
   browser APIs. Add `"use client"` only to those leaf components.
3. Fetch data in server components with `async`/`await`; avoid client-side
   fetching for initial render when the server can do it.
4. Put API endpoints in `app/api/<name>/route.ts` using the Web `Request`/
   `Response` APIs.
5. Verify with `npm run build` (catches server/client boundary and type errors).

## Data Fetching

- Prefer `fetch` in Server Components with Next.js caching options (`cache`,
  `next.revalidate`) documented in code comments when non-default.
- Use `loading.tsx` for slow segments; avoid blocking the entire page.
- Mutations: Server Actions or Route Handlers — validate input server-side.

## Route Handlers

- Export named HTTP functions (`GET`, `POST`, …) from `route.ts`.
- Return `Response.json()` with correct status codes.
- Never import client-only modules into `route.ts`.

## Guidelines

- Never import server-only modules (fs, secrets, DB clients) into client
  components.
- Read secrets from environment variables on the server only; never expose them
  via `NEXT_PUBLIC_*` unless they are truly public.
- Keep `page.tsx` thin; move logic into small, typed functions under `src/` or
  colocated `lib/`.
- Prefer `next/link` and `next/image` over raw anchors/images.
- Colocate tests for pure helpers; run `npm run build` before claiming done.

## Deployment

See the shared `deploy-vercel` skill when shipping to Vercel.

## Anti-patterns

- Marking entire pages `"use client"` to avoid thinking about server boundaries.
- Fetching secrets or private APIs from the browser.
- Giant `page.tsx` files mixing UI, data access, and validation.

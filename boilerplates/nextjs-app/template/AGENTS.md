# AGENTS.md

Guidance for AI coding agents working in this Next.js project.

## Commands

- `npm install` — install dependencies (Next.js, React).
- `npm run dev` — start the dev server at `http://localhost:3000`.
- `npm run build` — production build (also the best correctness check).
- `npm run typecheck` — `tsc --noEmit`.

## Conventions

- App Router under `app/` (React Server Components by default; add
  `"use client"` only when a component needs browser APIs or state).
- TypeScript throughout; keep components small and typed.
- Co-locate route segments and their UI under `app/`.

## Skills

Curated skills live under `.bwai/skills/` (canonical) and are mirrored into each
agent's directory. Prefer `nextjs-app-router` and `code-review`; re-validate
skills with `bwai scan-project`.

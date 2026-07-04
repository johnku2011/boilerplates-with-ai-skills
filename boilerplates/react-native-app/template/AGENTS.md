# AGENTS.md

Guidance for AI coding agents working in this Expo / React Native project.

## Commands

- `npm install` — install dependencies (Expo, React Native).
- `npm test` — run pure-function tests via `node:test` (no simulator needed).
- `npm run typecheck` — `tsc --noEmit`.
- `npm start` — Expo dev server (`i` / `a` / `w` for iOS / Android / web).

## Conventions

- TypeScript for UI (`App.tsx`); keep testable logic in small pure modules under
  `src/` (plain `.js` is fine for helpers that `node:test` imports directly).
- Use React Native core components (`View`, `Text`, `Pressable`, etc.) and
  `StyleSheet.create` for styles.
- Platform-specific code: `Platform.OS` or `.ios.ts` / `.android.ts` suffixes.
- Do not add native modules without documenting the Expo config plugin requirement.

## Skills

Curated skills live under `.bwai/skills/` (canonical) and are mirrored into each
agent's directory. Prefer `react-native-development` and
`test-driven-development`; re-validate skills with `bwai scan-project`.

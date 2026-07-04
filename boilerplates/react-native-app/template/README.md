# react-native-app

Expo (React Native) + TypeScript mobile starter, scaffolded by
[`boilerplates-with-ai-skills`](https://github.com/johnku2011/boilerplates-with-ai-skills).
Targets iOS, Android, and web from one codebase, with AI-agent config and a
curated, security-vetted skill set.

## Quick start

```bash
npm install
npm test           # pure-function tests (node:test; no simulator required)
npm run typecheck
npm start          # Expo dev server (scan QR with Expo Go, or press i/a/w)
```

Platform shortcuts (with simulators/emulators installed):

```bash
npm run ios
npm run android
npm run web
```

## Project layout

- `App.tsx` — root screen (React Native components).
- `src/greeting.js` — small pure helper, tested without mounting native UI.
- `app.json` — Expo config (name, slug, platforms).

## AI agent skills

Curated skills (`react-native-development`, `test-driven-development`) were
installed into `.bwai/skills/` and each agent's directory during scaffolding.
Re-validate with `bwai scan-project`.

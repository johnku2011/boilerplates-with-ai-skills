---
name: react-native-development
description: Use when building screens, navigation, styling, or platform behavior in this Expo React Native app, to follow mobile-first conventions and keep logic testable.
---

# React Native Development (Expo)

## Overview

Build mobile UI with Expo and React Native. Keep screens in components; extract
testable logic into pure functions under `src/`.

## Process

1. Prefer React Native core components and `StyleSheet.create` before adding UI
   libraries.
2. Keep `App.tsx` (or future screens) focused on layout and wiring; move
   non-trivial logic to pure helpers you can test with `npm test`.
3. Handle platform differences explicitly (`Platform.OS`, platform-specific
   files) instead of guessing runtime behavior.
4. Respect safe areas and accessibility: meaningful labels, tappable targets,
   sufficient contrast.
5. Verify with `npm run typecheck` and `npm test` before claiming completion.

## Structure

- Screens under `app/` or `src/screens/` (follow existing project layout).
- Shared UI in small components; no mega-files.
- Navigation: use Expo Router conventions if added later; document stack changes.

## Testing Strategy

- **Unit tests** for pure functions (formatting, validation, reducers) — required.
- **Component tests** when logic is intertwined with rendering — optional in this
  starter; prefer extracting logic first.
- **Device/simulator** for layout, gestures, and platform-specific UI — manual
  smoke test before release.

## Guidelines

- Do not block the JS thread with heavy sync work; defer or chunk large tasks.
- Read secrets from environment at build time via Expo config — never hardcode
  API keys in source.
- Adding native modules may require an Expo config plugin and a dev client build;
  document that before adding dependencies.
- Test on at least one target (iOS simulator, Android emulator, or web) for UI
  changes; logic-only changes can rely on `npm test`.
- Use `project-security` checks for auth tokens, deep links, and WebViews.

## Anti-patterns

- Copy-pasting web React patterns that assume DOM APIs.
- Storing refresh tokens in AsyncStorage without encryption requirements documented.
- Skipping tests because "it's just UI" while logic lives in the component.

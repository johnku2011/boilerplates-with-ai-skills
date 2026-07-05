---
name: test-driven-development
description: Use when implementing a feature or fixing a bug — TDD, red-green-refactor, failing test first, then minimal code, then refactor. Run npm test before claiming done.
---

# Test-Driven Development

## Overview

Write a failing test before production code. Keep each cycle small and verify
with this project's test command (see `AGENTS.md`).

**Core principle:** If you did not watch the test fail, you do not know if it
tests the right thing.

**Iron law:** No production code without a failing test first.

## When to Use

**Always:**
- New features
- Bug fixes
- Behavior changes

**Exceptions (ask your human partner):**
- Throwaway prototypes
- Generated code
- Pure configuration with no runtime behavior

## Red-Green-Refactor

1. **RED** — Write one minimal test for one behavior. Run it; confirm it fails
   for the expected reason (missing feature, not a typo).
2. **GREEN** — Write the smallest code that passes. Run the full suite.
3. **REFACTOR** — Clean up while staying green. Do not add behavior.
4. Repeat for the next increment.

## Guidelines

- Prefer many small tests over one large test.
- Test observable behavior (HTTP status/body, CLI output, return values), not
  private implementation details.
- Run `npm test` after every change; do not claim completion on a red suite.
- Keep tests deterministic: no wall-clock timing, network, or ordering flakes.
- For UI or native screens, unit-test pure logic under `src/`; verify layout on
  a simulator only when the change is visual.
- Use real code in tests; mock only at unavoidable boundaries.

## Verification Checklist

Before marking work complete:

- [ ] Every new function or route has a test
- [ ] Watched each new test fail before implementing
- [ ] Failure was due to missing behavior, not setup errors
- [ ] Wrote minimal code to pass each test
- [ ] Full test suite passes
- [ ] No new warnings in test output

If you cannot check every box, you skipped TDD — start over.

## Bug Fixes

1. Write a failing test that reproduces the bug.
2. Fix with minimal code.
3. Keep the test — it prevents regression.

Never fix bugs without a test.

## Common Rationalizations

| Excuse | Reality |
| --- | --- |
| "Too simple to test" | Simple code breaks. A test takes seconds. |
| "I'll test after" | Tests that pass immediately prove nothing. |
| "Already manually tested" | Manual checks are not repeatable in CI. |
| "Deleting code is wasteful" | Unverified code is debt. Delete and rewrite with TDD. |

## Anti-patterns

- Writing production code before any failing test.
- Claiming done without running the project's test command.
- Testing private functions instead of public behavior.
- Mocking so heavily you test the mock, not the system.

## Upstream Note

Adapted from [obra/superpowers](https://github.com/obra/superpowers) TDD workflow,
trimmed for bwai boilerplates. Run `bwai sync-upstream --skill test-driven-development`
to compare with upstream.

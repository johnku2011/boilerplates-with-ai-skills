---
name: test-driven-development
description: Use when implementing a feature or fixing a bug — TDD, red-green-refactor, failing test first, then minimal code, then refactor. Run npm test before claiming done.
---

# Test-Driven Development

## Overview

Write a failing test before production code. Keep each cycle small and verify
with this project's test command (see `AGENTS.md`).

## Process

1. Write one focused test that describes the desired behavior. Run it and watch
   it fail for the expected reason.
2. Write the minimal code needed to make the test pass. Run the test suite.
3. Refactor while keeping the suite green. Do not add behavior without a test.
4. Repeat for the next small increment.

## Guidelines

- Prefer many small tests over one large test.
- Test observable behavior (HTTP status/body, CLI output, return values), not
  private implementation details.
- Run `npm test` after every change; do not claim completion on a red suite.
- Keep tests deterministic: no wall-clock timing, network, or ordering flakes.
- For UI or native screens, unit-test pure logic under `src/`; verify layout on
  a simulator only when the change is visual.

## Anti-patterns

- Writing production code before any failing test.
- Claiming done without running the project's test command.
- Testing private functions instead of public behavior.

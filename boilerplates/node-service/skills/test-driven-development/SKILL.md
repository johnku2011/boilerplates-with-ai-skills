---
name: test-driven-development
description: Use when implementing a feature or fixing a bug in this project, to drive the change with a failing test first, then minimal code, then refactor.
---

# Test-Driven Development

## Overview

Write a failing test before production code. Keep each cycle small and verify
with the project's test command.

## Process

1. Write one focused test that describes the desired behavior. Run it and watch
   it fail for the expected reason.
2. Write the minimal code needed to make the test pass. Run the test suite.
3. Refactor while keeping the suite green. Do not add behavior without a test.
4. Repeat for the next small increment.

## Guidelines

- Prefer many small tests over one large test.
- Test observable behavior, not private implementation details.
- Run `npm test` after every change; do not claim completion on a red suite.
- Keep tests deterministic: no reliance on network, wall-clock time, or ordering.

---
name: code-review
description: Use when reviewing a diff or pull request — check correctness, tests, readability, security, and server/client boundaries before approving.
---

# Code Review

## Overview

Give a focused, constructive review of a change. Separate blocking issues from
optional suggestions. Review the **work product** (diff + tests), not the author's
process.

**Core principle:** Review early, review often — before merge, not after production.

## When to Review

**Mandatory:**
- Before merging to the main branch
- After completing a major feature or multi-file change
- When security-sensitive paths change (auth, payments, user data)

**Valuable:**
- After fixing a non-trivial bug (regression check)
- Before a large refactor (baseline sanity check)

## Process

1. Read the change description and confirm it matches the diff.
2. Identify scope: which files, routes, or modules changed and why.
3. Check correctness: edge cases, error handling, and inputs that could break.
4. Check tests: is new behavior covered? Do existing tests still pass?
5. Check readability: clear names, small functions, no dead code.
6. Check boundaries: server-only code must not leak to client bundles or logs.
7. Note security concerns as **blocking** (see `project-security` skill).

## Review Checklist

| Area | Blocking if… |
| --- | --- |
| **Correctness** | Wrong logic, missing error handling, race conditions |
| **Tests** | New behavior untested; tests deleted without replacement |
| **Security** | Unvalidated input, secrets in code/logs, missing auth |
| **API shape** | Breaking changes without migration or docs |
| **Performance** | Obvious N+1, unbounded loops, sync I/O on hot paths |

## Output Format

Use this structure every time:

```
## Blocking
- [file:line] Issue — concrete fix

## Suggestions
- [file:line] Optional improvement

## Verdict
approve | approve-with-nits | request-changes
```

- List **blocking** issues first, each with a concrete fix.
- Then non-blocking suggestions.
- End with an explicit verdict.

## Integration with TDD

If the change adds behavior without a failing test first, that is a **blocking**
issue unless the author documents why (e.g. config-only change). Ask for tests
that prove the behavior.

## Anti-patterns

- Approving without checking tests or security-sensitive paths.
- Nitpicking style while missing error handling.
- Vague feedback ("this feels wrong") without a concrete fix.
- Reviewing the conversation instead of the diff.
- Rubber-stamping because "it's small."

## When You Disagree

Push back with technical reasoning. Cite failing tests, spec requirements, or
security impact. Request clarification when the intent is unclear.

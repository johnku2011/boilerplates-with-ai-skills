---
name: code-review
description: Use when reviewing a diff or pull request in this project, to check correctness, tests, readability, and safety before approving.
---

# Code Review

## Overview

Give a focused, constructive review of a change. Separate blocking issues from
optional suggestions.

## Process

1. Read the change description and confirm it matches the diff.
2. Check correctness: edge cases, error handling, and inputs that could break.
3. Check tests: is the new behavior covered? Do existing tests still pass?
4. Check readability: clear names, small functions, no dead code.
5. Note any security concerns (untrusted input, secrets, unsafe file or process
   use, leaking server-only data to the client) as blocking.

## Output

- List blocking issues first, each with a concrete fix.
- Then list non-blocking suggestions.
- End with an explicit verdict: approve, approve-with-nits, or request-changes.

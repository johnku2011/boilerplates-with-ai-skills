---
name: project-security
description: Use when reviewing security-sensitive code paths — check auth, secrets, input validation, dependency risk, and data exposure before shipping.
license: MIT
compatibility: Application source under review
allowed-tools: Read Grep
metadata:
  suite: security
---

# Project Security

## Overview

Apply a practical security review to changes in this project. Focus on real
exploitable issues, not generic checklists.

**Core principle:** Assume all external input is hostile. Assume secrets will leak
unless kept server-side.

## When to Use

- New or changed HTTP routes, API handlers, or auth flows
- File upload, subprocess, or shell execution
- Environment variable or config changes
- Dependency additions or version bumps
- Anything touching user data, tokens, or payments

## Process

1. **Map trust boundaries** — user input, network, filesystem, subprocesses,
   third-party APIs, client vs server.
2. **Authentication & authorization** — every new route/action must declare who
   can call it and what they can access.
3. **Secrets** — no keys/tokens in source, logs, client bundles, or error
   responses; env vars on server only.
4. **Input validation** — validate query, body, headers, filenames, and IDs;
   reject early with safe error messages.
5. **Output encoding** — prevent injection (HTML, SQL, shell, template).
6. **Dependencies** — prefer existing libs; note new supply-chain surface.
7. **Data exposure** — server-only data must not reach client, logs, or analytics.

## Stack-Specific Checks

When the stack matters, read [`references/stack-checks.md`](./references/stack-checks.md)
for web/API and mobile notes (progressive disclosure — load only if needed).

## Severity Guide

| Severity | Examples |
| --- | --- |
| **Blocking** | Missing auth on privileged route, SQL/command injection, secret in client |
| **High** | Weak session handling, verbose errors leaking internals |
| **Medium** | Missing rate limit, overly broad CORS |
| **Low** | Defense-in-depth hardening, logging improvements |

## Output Format

```
## Blocking
- [scenario] Issue — exploit path — fix

## Hardening
- Non-blocking improvements

## Verdict
safe to ship | ship with fixes | do not ship
```

## Anti-patterns

- Rubber-stamping without checking auth on new endpoints.
- Ignoring client-visible env vars or API responses that expose internals.
- Security theater (extra complexity without reduced risk).
- "We will add auth later" on production-bound code.

## After Fixes

Re-check the diff. Run `bwai scan-project` if skills or agent config changed.

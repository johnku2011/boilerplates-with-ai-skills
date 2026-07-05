---
name: project-security
description: Use when reviewing security-sensitive code paths — check auth, secrets, input validation, dependency risk, and data exposure before shipping.
---

# Project Security

## Overview

Apply a practical security review to changes in this project. Focus on real
exploitable issues, not generic checklists.

## Process

1. Identify trust boundaries (user input, network, filesystem, subprocesses,
   third-party APIs).
2. Check authentication and authorization on every new route, handler, or action.
3. Check secrets: no keys/tokens in code, logs, or client bundles; env vars only.
4. Validate and sanitize all external input (query, body, headers, filenames).
5. Review dependencies for known risky patterns; prefer existing project libs.
6. Check data exposure: server-only data must not leak to client or logs.

## Output

- List **blocking** issues first with exploit scenario and concrete fix.
- Then list hardening suggestions (non-blocking).
- End with: **safe to ship**, **ship with fixes**, or **do not ship**.

## Anti-patterns

- Rubber-stamping without checking auth on new endpoints.
- Ignoring client-visible env vars or API responses that expose internals.
- Suggesting security theater (complexity) without reducing actual risk.

---
name: fastify-api-design
description: Use when adding or changing routes, schemas, or plugins in this Fastify API — keep endpoints validated, typed, and testable.
---

# Fastify API Design

## Overview

Keep the Fastify app small, testable, and schema-first. Build on the exported
`createApp()` factory so tests can inject the server without binding a fixed port.

## Process

1. Register routes on the app returned by `createApp()` in `src/app.js`.
2. Define JSON schemas for request/response when the payload shape matters.
3. Return correct status codes (200/201 success, 400 client error, 404 not found).
4. Use Fastify's built-in error handler; do not leak stack traces in production.
5. Add a `test/` case that starts the app on port `0` and asserts responses.

## Plugin Order

1. Core plugins (cors, sensible) if needed
2. Route registration
3. Global error handler

## Testing

- Integration tests: `app.listen({ port: 0 })`, `fetch` against `127.0.0.1`.
- Extract pure helpers for unit tests when logic grows beyond route handlers.
- Run `npm test` before every commit.

## Guidelines

- Prefer route-level schemas over ad-hoc validation in handlers.
- Keep handlers thin; move business logic to testable functions.
- Read secrets from environment variables at startup, not from requests.
- Prefer explicit routes over catch-all handlers.

## Anti-patterns

- Bypassing Fastify validation with unvalidated `request.body` access.
- Starting the server inside `createApp()` — keep listen in `server.js` only.
- Global mutable state shared across requests.

---
name: express-api-design
description: Use when adding or changing routes, middleware, or error handling in this Express.js API, to keep endpoints consistent, validated, and testable.
---

# Express API Design

## Overview

Keep the Express app small, testable, and consistent. Build routes on the
exported `createApp()` factory so they can be tested without binding a port.

## Process

1. Add the route to `src/app.js` on the app returned by `createApp()`.
2. Validate and parse input explicitly; never trust request bodies or params.
3. Return JSON for API routes with a clear shape and correct status codes
   (200/201 success, 400 client error, 404 not found, 500 server error).
4. Centralize error handling with an error-handling middleware; do not leak
   stack traces in responses.
5. Add a `test/` case that starts the app on an ephemeral port and asserts the
   response.

## Route Design

- Use nouns for resources (`/items`, `/items/:id`), verbs via HTTP methods.
- Version breaking changes (`/v2/...`) or document compatibility in README.
- Document request/response shapes in README or OpenAPI when the surface grows.

## Middleware Order

1. Security headers / CORS (if needed)
2. Body parsers with size limits
3. Authentication (if applicable)
4. Routes
5. 404 handler
6. Error handler (last)

## Testing

- Integration tests: spin up `createApp()` on port `0`, use `fetch` against
  `http://127.0.0.1:<port>/...`.
- Unit tests: pure functions extracted from handlers.
- Run `npm test` before every commit.

## Guidelines

- Keep handlers thin; move non-trivial logic into small functions you can unit
  test.
- Prefer explicit routes over broad catch-alls.
- Do not read secrets from the request; read configuration from environment
  variables at startup.
- Keep responses deterministic and documented in the README.
- Assume stateless serverless when deployed to Vercel — no in-memory sessions.

## Deployment

See the shared `deploy-vercel` skill when shipping to Vercel.

## Anti-patterns

- Business logic embedded in anonymous middleware chains.
- Returning raw `error.message` or stacks to clients.
- Global mutable state shared across requests in serverless.

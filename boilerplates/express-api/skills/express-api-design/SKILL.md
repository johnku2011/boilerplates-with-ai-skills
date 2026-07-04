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

## Guidelines

- Keep handlers thin; move non-trivial logic into small functions you can unit
  test.
- Prefer explicit routes over broad catch-alls.
- Do not read secrets from the request; read configuration from environment
  variables at startup.
- Keep responses deterministic and documented in the README.

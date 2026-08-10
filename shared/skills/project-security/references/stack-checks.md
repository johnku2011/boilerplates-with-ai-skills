# Stack-specific security checks

Load this reference when the change touches a matching stack.

## Web / API (Node, Express, Next.js)

- No `NEXT_PUBLIC_*` for secrets or internal URLs.
- Server Components / route handlers for privileged operations.
- CORS, rate limits, and body size limits on public endpoints.
- No stack traces or internal paths in production error JSON.

## Mobile (React Native / Expo)

- No API keys in the JS bundle; use secure storage for tokens.
- Deep links and WebViews: validate URLs before navigation.
- Certificate pinning only when product requires it (document tradeoffs).

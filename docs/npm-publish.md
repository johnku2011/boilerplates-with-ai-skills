# Publishing `bwai` to npm

## Quick publish (maintainer)

```bash
npm run build && npm test
npm publish --access public
```

If your npm account has **2FA enabled**, you must use one of:

| Token type | Works in CI / Cloud Agent? |
| --- | --- |
| **Classic → Automation** | Yes (bypasses 2FA) |
| **Granular → bypass 2FA for automation** checked | Yes |
| Classic → Publish | No (requires OTP each publish) |
| Granular without bypass 2FA | No |

## Create an Automation token

1. Open https://www.npmjs.com/settings/johnku2011/tokens  
2. **Generate New Token** → **Classic Token**  
3. Type: **Automation** (not Publish)  
4. Copy the token (40-character hex string)  
5. Set as `NPM_TOKEN` in Cursor Cloud secrets **and** GitHub repo secrets (for Actions)

Verify locally:

```bash
npm whoami
npm publish --access public --dry-run  # no dry-run for publish; use pack + test install instead
npm pack && npm install -g ./bwai-0.2.0.tgz && bwai list-boilerplates
```

## Common error

```
403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required
```

**Fix:** Replace the token with a **Classic Automation** token (see above).

## GitHub Actions

Workflow: **Publish to npm** (`.github/workflows/publish.yml`)  
Requires repo secret `NPM_TOKEN` with an Automation token.

## After publish

```bash
npm view bwai
npx bwai list-boilerplates
```

Package page: https://www.npmjs.com/package/bwai

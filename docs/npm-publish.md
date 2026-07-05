# Publishing `@johnku2011/bwai` to npm

> **Package name:** npm blocks the unscoped name `bwai` (too similar to existing packages). Publish as **`@johnku2011/bwai`**. The CLI command remains **`bwai`** after install.

> **Note (2025+):** npm removed **Classic** tokens. Use **Granular access tokens** only.
> See [npm: About access tokens](https://docs.npmjs.com/about-access-tokens/).

## Quick publish (maintainer, interactive)

If you have 2FA on your account and are at a terminal:

```bash
npm run build && npm test
npm login          # complete 2FA when prompted
npm publish --access public
```

## CI / Cloud Agent (granular token)

Automated publish needs a **Granular access token** with **Bypass 2FA** enabled at creation time.

### Create the token

1. Open https://www.npmjs.com/settings/johnku2011/tokens  
2. **Generate New Token** → **Granular Access Token**  
3. Configure:
   - **Permissions:** Read and write  
   - **Packages and scopes:** All packages (or scope `@johnku2011` so `@johnku2011/bwai` can be created)  
   - **Expiration:** up to 90 days for write tokens  
   - **Bypass two-factor authentication (2FA):** **On** ← required for non-interactive publish  
4. Copy the token (starts with `npm_`)  
5. Set as `NPM_TOKEN` in Cursor Cloud secrets **and** GitHub repo secrets (for Actions)

Configure npm to use it:

```bash
# ~/.npmrc or CI env
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Verify:

```bash
npm whoami
npm pack && npm install -g ./johnku2011-bwai-0.2.0.tgz && bwai list-boilerplates
npm publish --access public
```

### Do you need an npm organization?

**No.** Publish `@johnku2011/bwai` under your user account (`johnku2011`). You do not need an npm organization for a scoped user package.

## Common errors

### Package name too similar (403)

```
403 Forbidden - Package name too similar to existing packages ... try '@johnku2011/bwai'
```

**Fix:** Use scoped name `@johnku2011/bwai` in `package.json` (already set in this repo).

### Two-factor / token (403)

```
403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required
```

**Fix:** Create a **new** granular token with **Bypass 2FA turned on**. Tokens cannot enable bypass after creation.

Other causes:

- Package set to **“Require 2FA and disallow tokens”** — change at npm package settings or publish interactively once  
- Token is **read-only** — use Read and write  
- Token **expired** (write tokens max ~90 days) — rotate `NPM_TOKEN`

## GitHub Actions

Workflow: **Publish to npm** (`.github/workflows/publish.yml`)  
Requires repo secret `NPM_TOKEN` = granular token with bypass 2FA.

**Future:** [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) avoids long-lived tokens on GitHub Actions.

## After publish

```bash
npm view @johnku2011/bwai
npx @johnku2011/bwai list-boilerplates
```

Package page: https://www.npmjs.com/package/@johnku2011/bwai

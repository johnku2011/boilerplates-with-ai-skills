# Publishing `bwai-cli` to npm

> **Package name:** npm blocks the short name `bwai` (too similar to existing packages). Publish as **`bwai-cli`**. The CLI commands are **`bwai-cli`** (primary) and **`bwai`** (alias).
>
> An earlier scoped publish (`@johnku2011/bwai@0.2.0`) remains on npm but is deprecated in favor of `bwai-cli`.

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
   - **Packages and scopes:** All packages  
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
npm pack && npm install -g ./bwai-cli-0.2.1.tgz && bwai-cli list-boilerplates
npm publish --access public
```

### Do you need an npm organization?

**No.** Publish `bwai-cli` under your user account (`johnku2011`).

## Common errors

### Package name too similar (403)

```
403 Forbidden - Package name too similar to existing packages ... try '@johnku2011/bwai'
```

**Fix:** Use **`bwai-cli`** (unscoped) instead of `bwai`. Do not use `@johnku2011/bwai` for new installs.

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
npm view bwai-cli
npx bwai-cli list-boilerplates
```

Package page: https://www.npmjs.com/package/bwai-cli

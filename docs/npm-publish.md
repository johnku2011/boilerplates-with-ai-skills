# Publishing `bwai-cli` to npm

> **Package name:** npm blocks the short name `bwai` (too similar to existing packages). Publish as **`bwai-cli`**. The CLI commands are **`bwai-cli`** (primary) and **`bwai`** (alias).
>
> An earlier scoped publish (`@johnku2011/bwai@0.2.0`) remains on npm but is deprecated in favor of `bwai-cli`.

## Quick reference

| What | Name |
| --- | --- |
| Product / repo | **bwai** |
| npm package | **`bwai-cli`** |
| `npx` (no install) | `npx bwai-cli …` |
| Shell commands (global install) | `bwai-cli …` or `bwai …` |

## Recommended: publish from your laptop with OTP

Do **not** rely on 2FA-bypass granular access tokens. npm is [deprecating bypass-2FA GATs](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) (account ops ~Aug 2026; direct publish ~Jan 2027). Use an authenticator OTP instead:

```bash
npm run build && npm test
npm login          # if needed
npm publish --access public --otp=123456   # code from your authenticator app
```

If `npm publish` prompts for a one-time password, enter it interactively (same effect as `--otp=`).

## Recommended for CI: Trusted Publishing (OIDC)

No long-lived `NPM_TOKEN`. GitHub Actions exchanges a short-lived OIDC token.

### 1. Configure on npmjs.com

1. Open https://www.npmjs.com/package/bwai-cli → **Settings** → **Trusted Publisher**
2. Choose **GitHub Actions** and set:
   - **Owner:** `johnku2011`
   - **Repository:** `boilerplates-with-ai-skills`
   - **Workflow filename:** `publish.yml` (filename only)
   - **Allowed actions:** `npm publish`
3. Save

Docs: [Trusted publishers](https://docs.npmjs.com/trusted-publishers)

### 2. Publish via GitHub Actions

Workflow: [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)

1. Confirm `main` has the release version in `package.json` (e.g. `0.2.6`)
2. GitHub → **Actions** → **Publish to npm** → **Run workflow**
3. Verify: `npm view bwai-cli version`

You can remove any old `NPM_TOKEN` repo secret after trusted publishing works.

## Do not use (legacy)

| Method | Why avoid |
| --- | --- |
| Granular token with **Bypass 2FA** | Being deprecated; loses account powers soon, then direct publish |
| Long-lived write `NPM_TOKEN` in CI | Prefer OIDC trusted publishing |

## Common errors

### Package name too similar (403)

```
403 Forbidden - Package name too similar to existing packages ... try '@johnku2011/bwai'
```

**Fix:** Use **`bwai-cli`** (unscoped) instead of `bwai`.

### Two-factor required (403)

```
403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required
```

**Fix (preferred):** publish with OTP:

```bash
npm publish --access public --otp=XXXXXX
```

**Or** use GitHub Actions trusted publishing after configuring the Trusted Publisher on npmjs.com.

Do **not** create a new bypass-2FA token as the long-term plan — that path is going away.

### Trusted publish fails in Actions

- Workflow filename on npmjs.com must be exactly `publish.yml`
- Job must have `permissions: id-token: write`
- Use Node **≥ 22.14** and npm **≥ 11.5.1** in the workflow
- `package.json` `repository.url` must match `johnku2011/boilerplates-with-ai-skills`

## After publish

```bash
npm view bwai-cli version
npx bwai-cli@latest install-skill bwai-advisor --global
```

Package page: https://www.npmjs.com/package/bwai-cli

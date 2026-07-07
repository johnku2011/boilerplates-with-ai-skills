# Landing page deployment

The landing page is static HTML in [`site/`](../site/).

## Vercel (recommended)

### Option A — repo root (easiest)

This repo includes a root [`vercel.json`](../vercel.json) that:

- Skips `npm install` (avoids the CLI `prepare` / husky noise)
- Serves static files from `site/` as the output directory

Import the repo at [vercel.com/new](https://vercel.com/new), leave **Root Directory** empty (repo root), Framework Preset **Other**, and deploy.

**Live site:** https://boilerplates-with-ai-skills.vercel.app — `package.json` `homepage` points here.

### Option B — `site/` subfolder

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `site`
3. Framework Preset: **Other** (no build command, no install)
4. Deploy

Optional custom domain in Vercel project settings.

### Troubleshooting

| Log / symptom | Cause | Fix |
|---------------|-------|-----|
| `bwai@0.2.0 prepare` / `husky: command not found` | Vercel ran `npm install` on the **CLI package** at repo root (old `main` or wrong root dir) | Redeploy from latest `main` (uses root `vercel.json` to skip install) or set Root Directory to `site` |
| Old install commands on the page | Deploy built from stale `main` | Merge latest `main` and redeploy |
| 404 on `/` | Output directory not set to `site` | Use root `vercel.json` or Root Directory = `site` |

## GitHub Pages (alternative)

1. Repo **Settings → Pages → Build and deployment → GitHub Actions**
2. Re-run the **Deploy landing page** workflow

URL: https://johnku2011.github.io/boilerplates-with-ai-skills/

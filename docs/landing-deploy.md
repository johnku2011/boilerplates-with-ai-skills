# Landing page deployment

The landing page is static HTML in [`site/`](../site/).

## Vercel (recommended)

No GitHub Pages admin setup required.

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `site`
3. Framework Preset: **Other** (no build command)
4. Deploy

Optional custom domain in Vercel project settings.

After deploy, update `package.json` `homepage` to your Vercel URL if desired.

## GitHub Pages (alternative)

1. Repo **Settings → Pages → Build and deployment → GitHub Actions**
2. Re-run the **Deploy landing page** workflow

URL: https://johnku2011.github.io/boilerplates-with-ai-skills/

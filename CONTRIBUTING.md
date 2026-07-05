# Contributing to bwai

Thank you for helping improve **bwai** — security-vetted, cross-agent project
boilerplates with a SkillSpector safety gate.

## What we accept

| Change type | Where | Gate |
| --- | --- | --- |
| New shared skill | `shared/skills/<name>/` | SkillSpector + catalog scan |
| New boilerplate skill | `boilerplates/<bp>/skills/<name>/` | SkillSpector + catalog scan |
| New boilerplate | `boilerplates/<name>/` | Template runs + manifest valid |
| CLI behavior | `src/` | `npm test`, typecheck, lint |
| Registry metadata | `registry/skills-index.json` | `bwai registry-refresh` consistency |

We **curate, not crawl**. Discovery (`search-skills`) feeds human review; promotion
is explicit via `bwai promote` or a reviewed PR.

## Development setup

```bash
git clone https://github.com/johnku2011/boilerplates-with-ai-skills.git
cd boilerplates-with-ai-skills
npm install
npm run build
npm test
```

Optional (for real security scans):

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
bwai scan-catalog --threshold 30 --require-scanner
```

## Skill authoring

Every skill is a directory with a spec-compliant **`SKILL.md`**:

```markdown
---
name: my-skill
description: One line — when to use this skill (shown to agents).
---

# Title

## Overview
...
```

Rules:

- `name` must be lowercase-hyphen-case and match the directory name.
- `description` must not use `<` or `>` (Agent Skills spec).
- Keep skills focused; prefer progressive disclosure in the body.
- No prompt injection, exfiltration patterns, or unbounded shell execution instructions.

### Shared vs local

- **`shared/skills/`** — bundled across boilerplates via `boilerplate.json` (`"source": "shared"`) and registry bundle rules.
- **`boilerplates/<name>/skills/`** — stack-specific (`"source": "local"`).

## Promotion criteria

Before a skill lands in the catalog:

1. **SkillSpector risk score ≤ 30** (catalog CI threshold) or ≤ 50 for project scans with documented exception.
2. **Human review** of SKILL.md intent — especially for promoted external skills.
3. **Provenance** recorded in `registry/skills-index.json` (`promotedFrom`, optional `upstream` pin).
4. **Tests pass** — `npm test` and `bwai scan-catalog --require-scanner` when SkillSpector is available.

Promote from a local path:

```bash
bwai promote my-skill --from ./path/to/skill --target shared --require-scanner
bwai sync-skills
bwai scan-catalog --require-scanner
```

## Adding a boilerplate

1. Create `boilerplates/<name>/boilerplate.json` (see existing manifests).
2. Add `template/` (runnable starter) and optional local `skills/`.
3. Declare shared skills in `boilerplate.json`; run `bwai sync-skills` for `bundleAll` rules.
4. Add tests under `tests/` if CLI/catalog behavior changes.
5. Run `bwai registry-refresh` and commit updated `registry/skills-index.json`.
6. Run `bwai scan-catalog --require-scanner` and commit `safety-reports/catalog/` if scans pass.

Template conventions:

- Ship `.gitignore` as `gitignore`; `bwai new` restores the dotfile.
- Include `AGENTS.md` and `CLAUDE.md` steering files.
- Document install/test commands that actually work.

## Upstream (Superpowers) skills

See [`docs/superpowers-upstream.md`](./docs/superpowers-upstream.md).

- Report drift: `bwai sync-upstream`
- Pull after review: `bwai sync-upstream --apply --require-scanner`
- Weekly automation opens a PR — maintainers must review diffs, not only risk scores.

## Pull request checklist

- [ ] `npm run lint && npm run typecheck && npm test`
- [ ] New/changed skills scanned (`bwai scan-catalog` or documented skip reason)
- [ ] Registry refreshed if catalog layout changed
- [ ] README / ROADMAP updated for user-visible changes
- [ ] No unrelated refactors

## Publishing `bwai-cli` to npm

Maintainers only — requires a **Granular access token** (Classic tokens were removed in 2025) with **Read and write** permission and **Bypass 2FA** enabled at creation. See [`docs/npm-publish.md`](./docs/npm-publish.md).

1. https://www.npmjs.com/settings/~your-user~/tokens → **Granular Access Token**  
2. Permissions: Read and write · **Bypass 2FA: On** · Packages: all  
3. Add repo secret `NPM_TOKEN` (token starts with `npm_`)  
4. Run **Actions → Publish to npm**, or locally:

```bash
npm publish --access public
```

## Code of conduct

Be constructive in reviews. Security findings are blocking — fix or explain before merge.

## Questions

Open a [GitHub issue](https://github.com/johnku2011/boilerplates-with-ai-skills/issues) for design questions before large PRs.

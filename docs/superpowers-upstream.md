# Superpowers upstream alignment

This catalog adapts workflows from [obra/superpowers](https://github.com/obra/superpowers)
where they fit bwai's **security-vetted, cross-agent boilerplate** model. We do
not vendor the full Superpowers tree — we ship a small, scanned subset aligned
with our stacks.

## Philosophy

| Superpowers | bwai adaptation |
| --- | --- |
| Large composable skill library | Small curated set per boilerplate + shared catalog |
| Install skills into agent sessions | Pre-wire skills at scaffold + `skills.lock` provenance |
| Human-driven skill discovery | `search-skills` + daily discovery issues (Phase 2B) |
| Ad-hoc skill updates | Registry pins + `sync-upstream` with SkillSpector gate |

## Mapped skills

| bwai shared skill | Superpowers upstream | Notes |
| --- | --- | --- |
| `test-driven-development` | `skills/test-driven-development` | Adapted, shorter; pin tracked in registry |
| `code-review` | `skills/requesting-code-review` | Review **output format** aligned; bwai version is diff-focused |
| `project-security` | (local) | bwai-specific; bundles in all boilerplates |
| `deploy-vercel` | (local) | bwai-specific; Next + Express on Vercel |

Local boilerplate skills (`nextjs-app-router`, `express-api-design`,
`react-native-development`) are maintained in this repo, not pulled from Superpowers.

## Upstream pins

Pins live in `registry/skills-index.json` under each skill's `upstream` field:

```json
{
  "upstream": {
    "url": "https://github.com/obra/superpowers",
    "path": "skills/test-driven-development",
    "ref": "<commit-sha>"
  }
}
```

## Commands

```bash
# Report drift vs upstream (no writes)
bwai sync-upstream

# Pull upstream after SkillSpector scan passes
bwai sync-upstream --apply --require-scanner

# Single skill
bwai sync-upstream --skill test-driven-development --apply --require-scanner
```

After applying upstream changes:

```bash
bwai scan-catalog --require-scanner
bwai sync-skills
```

## Weekly automation

`.github/workflows/upstream-sync.yml` runs `sync-upstream --apply` weekly and
opens a PR when the catalog changes. Human review is required before merge —
no silent auto-merge of upstream skill content.

## Contributing upstream

When bwai improvements are generic, consider contributing back to Superpowers
rather than forking indefinitely. Keep bwai-specific stack guidance in local or
shared skills here.

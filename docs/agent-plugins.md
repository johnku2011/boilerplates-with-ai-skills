# Agent Plugins

bwai scaffolds and can export **[Agent Plugins 1.0](https://agent-plugins.org/)** packages so curated skills and MCP configs travel together across Cursor, Copilot, Codex, and other launch clients.

## What bwai ships

| Layer | Role |
| --- | --- |
| `.bwai/skills/` + agent mirrors | Day-one IDE UX (unchanged) |
| `.bwai/plugin/` | Portable Agent Plugins package (`plugin.json` + `skills/` + optional typed `mcp.json`) |
| Client `.mcp.json` / `.cursor/mcp.json` | Native MCP for local scaffold UX |
| `skills.lock` + SkillSpector | Trust / provenance (Agent Plugins deliberately omits this) |
| `.github/copilot/settings.json` | Optional Copilot `enabledPlugins` pointing at `./.bwai/plugin` |

Do **not** wrap a single skill or MCP-only pack as a plugin. bwai emits a plugin when a boilerplate’s skill set (and MCP, when present) belong together.

## Scaffold

`bwai new <boilerplate> <dir>` writes `.bwai/plugin/` automatically, including GetSuperpower delivery skills (`bwai-delivery`, `bwai-security-gate`) when the workflow is copied — so delivery guidance is inside the portable package, not only under `workflows/`.

## Export

```bash
# From a catalog boilerplate → standalone directory
bwai export-plugin nextjs-app ./bwai.nextjs-app

# From a scaffolded project (default out: <project>/.bwai/plugin)
bwai export-plugin ./my-app
bwai export-plugin ./my-app ./.bwai/plugin --copilot-settings
```

Portable `mcp.json` always sets `$schema` and an explicit `type` (`stdio` | `streamable-http` | `sse`). Client-native templates may omit `type`; the translator fills it in.

## Doctor / CI

`bwai doctor` validates `.bwai/plugin/` when present (schema URLs, name rules, skills with `SKILL.md`, typed MCP).

## Maintainer smoke paths

- **Cursor:** copy or symlink the plugin folder under `~/.cursor/plugins/local/` (see [Cursor plugins](https://cursor.com/docs/plugins)).
- **Copilot:** commit `.github/copilot/settings.json` with `enabledPlugins: { "./.bwai/plugin": true }`, or install via marketplace later if you publish one.
- **Client extensions:** keep hooks/agents under reverse-domain dirs (`com.*`) only when needed; leave the portable core small.

## Trust positioning

Agent Plugins standardizes the *box*. bwai differentiates with SkillSpector gating and `skills.lock` pins before anything ships in the catalog.

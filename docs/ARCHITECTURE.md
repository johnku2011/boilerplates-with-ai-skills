# Repository layout

This repo ships **bwai-cli** — security-vetted project starters with curated agent skills.

## Three artifact types (do not mix them up)

| Type | Location | Declared in | Copied to project as |
| --- | --- | --- | --- |
| **Boilerplate** | `boilerplates/<name>/template/` | `boilerplate.json` `name` | Project root (`src/`, `package.json`, …) |
| **Skill** | `shared/skills/` or `boilerplates/<name>/skills/` | `boilerplate.json` `skills[]` | `.bwai/skills/` + agent dirs |
| **Workflow** | `shared/workflows/` or `boilerplates/<name>/workflow/` | `boilerplate.json` `workflow` | `workflows/<name>/` |

**Workflows are not boilerplates.** A workflow is a [GetSuperpower](https://github.com/0xroylee/getsuperpower) bundle (`workflow.json` + orchestration skills) that defines *how* to deliver features on top of a scaffolded project.

## Example: `nextjs-app`

```
boilerplates/nextjs-app/
  boilerplate.json     ← manifest (skills + workflow declaration)
  template/            ← Next.js app copied on `bwai new`
  skills/              ← stack-local SKILL.md (nextjs-app-router)

shared/skills/         ← reused skills (code-review, project-security, …)
shared/workflows/
  bwai-delivery/       ← GetSuperpower delivery workflow (declared in manifest)
```

After `bwai-cli new nextjs-app ./app`:

```
app/
  app/                 ← from template
  .bwai/skills/        ← from manifest skills
  workflows/bwai-delivery/   ← from manifest workflow
  skills.lock
```

## Manifest (`boilerplate.json`)

```json
{
  "name": "nextjs-app",
  "skills": [
    { "name": "nextjs-app-router", "source": "local" },
    { "name": "code-review", "source": "shared" }
  ],
  "workflow": {
    "name": "bwai-delivery",
    "source": "shared"
  }
}
```

Omit `workflow` for boilerplates that only need skills (e.g. `react-native-app` today).

## CLI source layout

```
src/           bwai-cli (TypeScript)
tests/         vitest
registry/      skill metadata + upstream pins
docs/          integration and publish guides
site/          landing page (static)
```

See [`docs/getsuperpower-integration.md`](./getsuperpower-integration.md) for the combined bwai + GetSuperpower flow.

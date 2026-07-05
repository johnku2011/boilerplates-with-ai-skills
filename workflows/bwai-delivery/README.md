# bwai-delivery GetSuperpower

Orchestrates **shape → plan → implement → review → security gate** for projects
scaffolded with [`bwai-cli`](https://www.npmjs.com/package/bwai-cli).

## What bwai already installed

`bwai-cli new` copies vetted skills into `.bwai/skills/` and mirrors them into
agent directories. See `skills.lock` for the exact set (stack skill, TDD,
code-review, project-security, etc.).

This workflow adds **GetSuperpower** orchestration on top — one entry skill that
coordinates Superpowers planning skills with your bwai skill bundle.

## Install in a scaffolded project

After `bwai-cli new`, the workflow is copied to `workflows/bwai-delivery/`:

```bash
npx getsuperpower install ./workflows/bwai-delivery --agents claude,cursor
```

Restart your agent, then invoke the entry skill **`bwai-delivery`**.

## Install from GitHub (without local copy)

```bash
npx getsuperpower install 'https://github.com/johnku2011/boilerplates-with-ai-skills.git#workflows/bwai-delivery' --agents claude,cursor
```

## Validate

```bash
npx getsuperpower validate ./workflows/bwai-delivery
npx getsuperpower deps ./workflows/bwai-delivery
```

## Steps

| Step | Skill | Notes |
| --- | --- | --- |
| Shape | `superpowers:brainstorming` | Human approval gate |
| Plan | `superpowers:writing-plans` | Task-by-task plan |
| Deliver | `bwai-delivery` | Uses `.bwai/skills/` (TDD + stack) |
| Review | `superpowers:requesting-code-review` | Against approved plan |
| Security | `bwai-security-gate` | Runs `bwai scan-project` |

See [`docs/getsuperpower-integration.md`](../../docs/getsuperpower-integration.md) in the bwai repo.

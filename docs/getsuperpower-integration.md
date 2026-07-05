# bwai + GetSuperpower integration

[bwai-cli](https://www.npmjs.com/package/bwai-cli) scaffolds **stack starters with
SkillSpector-gated skills**. [GetSuperpower](https://github.com/0xroylee/getsuperpower)
installs **workflow skill trees** (`workflow.json`) across agents. Together they
cover *what to build on* and *how to deliver features*.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for repo layout (boilerplates vs skills vs workflows).

## The combined flow

```bash
# 1. Scaffold stack + vetted skills (+ workflow if declared in boilerplate.json)
npx bwai-cli new nextjs-app ./my-app --agents claude,cursor

cd my-app

# 2. Install GetSuperpower orchestration (planning + entry skill)
npx getsuperpower install ./workflows/bwai-delivery --agents claude,cursor

# 3. Restart your agent, invoke entry skill: bwai-delivery

# 4. Security gate on project skills
bwai scan-project --threshold 50 --require-scanner
```

## What each tool owns

| Concern | bwai-cli | GetSuperpower |
| --- | --- | --- |
| Project template | ✅ | — |
| Curated stack skills in `.bwai/skills/` | ✅ | — |
| `skills.lock` provenance + SkillSpector gate | ✅ | — |
| Workflow declaration per boilerplate | ✅ (`boilerplate.json`) | — |
| Shape / plan workflow steps | — | ✅ (Superpowers skills) |
| One callable entry skill | — | ✅ (`bwai-delivery`) |
| Cross-agent install paths | both | ✅ |

## Shared workflow: `bwai-delivery`

Location: [`shared/workflows/bwai-delivery/`](../shared/workflows/bwai-delivery/)

Declared in most boilerplates:

```json
"workflow": { "name": "bwai-delivery", "source": "shared" }
```

| Step | Skill | Purpose |
| --- | --- | --- |
| Shape | `superpowers:brainstorming` | Human-approved scope |
| Plan | `superpowers:writing-plans` | Task-by-task plan |
| Deliver | `bwai-delivery` | Implement with `.bwai/skills/` (TDD + stack) |
| Review | `superpowers:requesting-code-review` | Review vs plan |
| Security | `bwai-security-gate` | Run `bwai scan-project` |

List workflows:

```bash
bwai-cli list-workflows
```

Skip workflow on scaffold (even when manifest declares one):

```bash
bwai-cli new node-service ./app --no-workflow
```

Override workflow name:

```bash
bwai-cli new node-service ./app --workflow bwai-delivery
```

## Install workflow without scaffold copy

```bash
npx getsuperpower install \
  'https://github.com/johnku2011/boilerplates-with-ai-skills.git#shared/workflows/bwai-delivery' \
  --agents claude,cursor
```

## Validate before sharing

```bash
npx getsuperpower validate ./workflows/bwai-delivery
npx getsuperpower deps ./workflows/bwai-delivery
```

## Upstream collaboration

See [`getsuperpower-eval.md`](./getsuperpower-eval.md) and
[`landscape-and-differentiation.md`](./landscape-and-differentiation.md).
Future upstream PR: SkillSpector hook in `getsuperpower validate`.

## References

- GetSuperpower: https://github.com/0xroylee/getsuperpower
- Superpowers (workflow deps): https://github.com/obra/superpowers
- SkillSpector: https://github.com/NVIDIA/SkillSpector

---
name: bwai-delivery
description: Use when implementing approved work in a bwai-scaffolded project — follow TDD and stack skills from .bwai/skills/ after planning is complete.
---

# bwai Delivery (entry skill)

This is the entry skill for the **bwai-delivery** GetSuperpower workflow in
projects created with `bwai-cli new`.

When this skill is used, implement the approved plan using skills already
installed under `.bwai/skills/` (see `skills.lock` and `AGENTS.md`).

## Before you build

1. Confirm shape and plan steps are approved (Superpowers brainstorming + writing-plans).
2. Read `skills.lock` — note stack-specific skills (e.g. `nextjs-app-router`,
   `fastify-api-design`, `python-api-design`).
3. Load and follow these bwai skills when present in `.bwai/skills/`:
   - **test-driven-development** — red/green/refactor; tests before implementation
   - **project-security** — no secrets in code, validate inputs, least privilege
   - Stack skill from the boilerplate manifest

## Implementation rules

- Match existing project conventions (`AGENTS.md`, linter, test runner).
- One logical change at a time; keep diffs focused.
- Do not skip tests to “finish faster”.
- If you edit any `SKILL.md` under `.bwai/skills/`, note it for the security gate step.

## When blocked

Stop and ask the user rather than guessing on architecture or scope changes
that were not in the approved plan.

## Handoff

After implementation, proceed to the **requesting-code-review** step, then the
**bwai-security-gate** step (`bwai scan-project`).

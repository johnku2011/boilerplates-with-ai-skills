# Omni-Skills Integration Brief

**Date:** 2026-07-12  
**Status:** Approved — in progress

## Goal

Add the omni-skills workflow bench to every boilerplate in the `bwai` catalog so that every generated project ships with a ready-to-use multi-role AI workflow.

## Target Customer

Developers who run `bwai new` and want their generated project to have `$startup-goal`, `$founding-engineer`, `$qa-lead`, and other role skills immediately available in `.bwai/skills/`.

## Problem

Currently generated projects only get three generic skills (`test-driven-development`, `code-review`, `project-security`). The omni-skills startup workflow bench — which is the differentiating capability of this product category — is not included by default.

## Scope

1. Vendor five omni-skills as shared skills in `shared/skills/`:
   - `startup-goal` (orchestrator)
   - `founding-engineer`
   - `qa-lead`
   - `cto`
   - `product-manager`
2. Add upstream pins for all five in `registry/skills-index.json` pointing to `devos-ing/omni-skills`
3. Add each of the five skills to **every** boilerplate's `boilerplate.json` (all 6: `express-api`, `fastify-api`, `nextjs-app`, `node-service`, `python-service`, `react-native-app`)
4. Add `sync-skills` targets so `bwai sync-upstream` can pull fresh versions from the omni-skills repo

## Non-Goals

- `ceo` skill (company strategy / fundraising — not triggered by a code project)
- `web-design` skill (interface-craft dependency — separate decision)
- Modifying `bwai new` to shell out to `npx omniskill@latest` at generate time
- Modifying the landing page or docs site in this slice

## Constraints

- Skills must pass SkillSpector scan (or be recorded as `skipped` without the tool locally)
- Each SKILL.md must be spec-compliant (agentskills.io format)
- No new npm dependencies

## Success Criteria

- `bwai new node-service /tmp/test` produces a project with all five omni-skills in `.bwai/skills/`
- `node dist/cli.js scan-catalog` passes (or skills are `skipped` without SkillSpector)
- All 6 boilerplates have the five new skills listed in their `boilerplate.json`
- `registry/skills-index.json` has upstream pins for all five skills

## Verification Command

```bash
node dist/cli.js new node-service /tmp/smoke --agents claude && ls /tmp/smoke/.bwai/skills/
```

Confirm all five skill directories are present.

## Assumptions

- Skill content fetched from `https://github.com/devos-ing/omni-skills/tree/main/examples/workflows/`
- CEO excluded by default (can be added later as an opt-in)
- Vendored as static files; `sync-upstream` handles future updates

## Source

- omni-skills repo: https://github.com/devos-ing/omni-skills
- Relevant workflows: `examples/workflows/{startup-goal,ceo,cto,product-manager,web-design,engineering-manager,founding-engineer,qa-lead}`

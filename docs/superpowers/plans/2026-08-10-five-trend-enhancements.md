# Five Trend Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five P0 enhancements from the 2026 LLM/AI trend gap analysis into bwai.

**Architecture:** Fix agent install paths in CLI; deepen SKILL.md compliance at the skill-frontmatter seam; attach missing workflow + MCP configs in templates; add a new `nextjs-ai-app` catalog entry cloned from nextjs-app patterns with AI SDK.

**Tech Stack:** TypeScript ESM, Vitest, Next.js 15, Vercel AI SDK, Zod, agentskills.io SKILL.md, Cursor/Claude MCP JSON.

## Global Constraints

- Skill format: agentskills.io (`name` + `description` required; progressive disclosure).
- Risk: NVIDIA SkillSpector only; do not invent a custom scanner.
- Templates store `.gitignore` as `gitignore`.
- Keep catalog curated — no skill crawler.

## Seams under test

1. `AGENT_TARGETS` / scaffold install paths
2. `parseSkillFrontmatter` / `assertSkillCompliant`
3. Catalog discovery + scaffold for `nextjs-ai-app` and RN workflow
4. Template files present (`mcp.json`, skill-scan.yml)

---

### Task 1: Cursor skill path

**Files:** `src/agents.ts`, `tests/scaffold.test.ts`

- [x] Update test expectation to `.cursor/skills`
- [x] Change `AGENT_TARGETS.cursor` to `.cursor/skills`

### Task 2: RN workflow

**Files:** `boilerplates/react-native-app/boilerplate.json`

- [x] Add `workflow: { name: "bwai-delivery", source: "shared" }`

### Task 3: SKILL.md packaging

**Files:** `src/skill-frontmatter.ts`, `src/skills.ts`, `src/promote.ts`, `tests/skill-frontmatter.test.ts`, catalog SKILL.md files

- [x] Parser + compliance assert
- [x] Wire into assertSkillExists / promote
- [x] Add metadata fields + selective references/

### Task 4: MCP templates

**Files:** boilerplate `template/.cursor/mcp.json` + `.mcp.json` for UI stacks; AGENTS.md notes

- [x] Playwright MCP for nextjs-app, react-native-app, nextjs-ai-app
- [x] Document MCP in AGENTS.md

### Task 5: nextjs-ai-app

**Files:** `boilerplates/nextjs-ai-app/**`, catalog tests, README, bwai-advisor

- [x] New boilerplate with AI SDK chat + tools
- [x] Local skill + workflow + MCP + CI
- [x] Registry refresh + docs

## Verification

- `npm run typecheck` / `npm run lint` / `npx vitest run` — 62/62 pass
- `bwai new nextjs-ai-app` smoke scaffold — OK

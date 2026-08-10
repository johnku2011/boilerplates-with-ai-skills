# LLM / AI Developer-Tooling Trends for Boilerplate + Skills Catalogs (2025–2026)

**Date:** 2026-08-10  
**Product context:** [`boilerplates-with-ai-skills`](https://boilerplates-with-ai-skills.vercel.app) / `bwai` CLI — scaffolds runnable project boilerplates with curated `SKILL.md` skill sets for Claude, Cursor, Codex, and Copilot; NVIDIA SkillSpector gating; `skills.lock` provenance.  
**Method:** Claims traced to primary / first-party sources (official docs, specs, repos, announcements). Secondary roundups were not used as evidence.

---

## Executive summary

Must-know shifts for a **boilerplate + AI skills** catalog shipping in 2026:

1. **Agent Skills is an open, cross-vendor standard** (`SKILL.md` + progressive disclosure). Catalogs should *comply with* [agentskills.io](https://agentskills.io/specification), not invent a parallel format — Anthropic open-sourced it (Dec 2025) and Cursor, Codex, Copilot, Microsoft Agent Framework, and others consume it.
2. **MCP matured into production infrastructure** with the `2026-07-28` spec: **stateless core**, formal **extensions** (Tasks, MCP Apps), hardened OAuth/OIDC, and ~hundreds of millions of monthly SDK downloads. Boilerplates should ship MCP *patterns* (config, least privilege, Playwright) and track client/SDK migration, not treat MCP as an optional sidebar.
3. **Instructions split into three durable layers:** always-on project guidance (`AGENTS.md` / `CLAUDE.md` / Cursor rules), **on-demand skills**, and **external tools via MCP**. Fat always-on files hurt adherence; progressive disclosure is the design rule.
4. **Plan-then-code is productized** across Cursor Plan Mode, Copilot cloud agent research→plan→iterate, OpenSpec SDD, and Superpowers/GetSuperpower workflow trees. A catalog that only drops skills without a delivery workflow is incomplete.
5. **Multi-agent / worktree isolation is table stakes** — Claude Code subagents/agent view/worktrees, Cursor `/worktree` + `/best-of-n` + cloud agents, Codex local worktrees + cloud sandboxes. Boilerplates should include worktree setup, parallel-safe test commands, and subagent role definitions where useful.
6. **Security scanning of skills/MCP is a first-class gate** — NVIDIA SkillSpector (68 patterns / 17 categories, SARIF/JSON) plus MCP tool-poisoning / least-privilege checks. bwai’s SkillSpector + `skills.lock` posture remains a real differentiator vs. unvetted marketplaces.
7. **Browser / computer use bifurcated:** vision computer-use loops (OpenAI Responses `computer` tool) vs. **accessibility-tree Playwright MCP** (and Playwright CLI+skills for token efficiency). Frontend boilerplates should wire the latter by default; treat computer-use as opt-in.
8. **Evals + agent observability moved into the coding loop** (Braintrust `bt` CLI + MCP for agents; Copilot usage/PR metrics; hooks for validation). Catalogs should leave seams for eval harnesses and CI quality gates, not only unit tests for app code.

---

## Trend cards

### 1. Agent Skills / `SKILL.md` as portable packaging

**Why it matters for boilerplates**  
The unit of reusable agent expertise is no longer “paste a prompt into CLAUDE.md.” A skill is a directory with `SKILL.md` (YAML `name` + `description` required) plus optional `scripts/`, `references/`, `assets/`. Agents load metadata at startup and body/resources on demand.

**Evidence**

- Spec: [agentskills.io/specification](https://agentskills.io/specification); repo [agentskills/agentskills](https://github.com/agentskills/agentskills) (open standard; progressive disclosure: metadata → instructions → resources).
- Anthropic announcement + open-standard update: [Introducing Agent Skills](https://www.anthropic.com/news/skills) (Oct 16, 2025; open standard Dec 18, 2025); engineering deep-dive: [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Claude Code: [Skills](https://code.claude.com/docs/en/skills) — follows Agent Skills; extensions include subagent execution and invocation control.
- Cursor: [Agent Skills](https://cursor.com/docs/skills) — discovers `.agents/skills/`, `.cursor/skills/`, and Claude/Codex paths; Cursor-specific `paths` / `disable-model-invocation`; `/migrate-to-skills`.
- Microsoft Agent Framework: [Skills](https://learn.microsoft.com/en-us/agent-framework/agents/skills) — same frontmatter; four-stage progressive disclosure (`advertise` → `load` → `read` → `run`).
- GitHub Copilot: skills listed as customization for cloud agent — [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent) (“Skills” / “About agent skills”).

**Implication for bwai**  
Keep bundling into `.bwai/skills/` (or agent-native dirs) with strict agentskills.io compliance. Prefer lean `SKILL.md` + `references/` over megabyte instruction dumps. Track Cursor `paths` and Claude Code–only frontmatter as *optional overlays*, not required for portability. Continue SkillSpector before promotion.

---

### 2. MCP adoption: stateless core, extensions, enterprise auth

**Why it matters for boilerplates**  
MCP is the USB-C for agent tools. The July 2026 spec removes session handshake, enables serverless/edge MCP servers, and formalizes extensions (Tasks, MCP Apps) and auth hardening. Clients (Claude, ChatGPT, VS Code, Cursor, Copilot) already speak MCP.

**Evidence**

- Protocol home: [modelcontextprotocol.io](https://modelcontextprotocol.io).
- Spec `2026-07-28`: [specification](https://modelcontextprotocol.io/specification/2026-07-28); release post: [The 2026-07-28 Specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/) (stateless `_meta`, `server/discover`, `Mcp-Method`/`Mcp-Name`, MRTR, Tasks extension, DCR→CIMD, 12-month deprecation policy).
- Anthropic product alignment: [Bringing MCP 2026-07-28 to Claude](https://claude.com/blog/bringing-mcp-2026-07-28-to-claude).
- Google on RC / scale: [Scaling AI Agent Infrastructure with the MCP Stateless updates](https://developers.googleblog.com/scaling-ai-agent-infrastructure-with-the-mcp-stateless-updates/).
- Cursor MCP: [cursor.com/docs/mcp](https://cursor.com/docs/mcp).
- Copilot cloud agent enables GitHub MCP + Playwright MCP by default: [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent).

**Implication for bwai**  
Ship per-boilerplate `mcp.json` / agent MCP snippets with **least privilege** (SkillSpector already covers MCP least privilege + tool poisoning). Prefer servers that can run statelessly under `2026-07-28`. Document migration notes when templates pin older SDK patterns. Do **not** try to be another MCP directory (MCP.so / Smithery already own discovery).

---

### 3. Multi-agent / subagent orchestration

**Why it matters for boilerplates**  
Serious agentic engineering assumes delegation: research in an isolated context, return a summary, keep the parent conversation clean. Parallel workers need file isolation (worktrees) and clear role prompts.

**Evidence**

- Claude Code orchestration matrix: [Run agents in parallel](https://code.claude.com/docs/en/agents) — subagents, agent view, agent teams (experimental), dynamic workflows; worktrees for isolation; `/batch` skill for 5–30 PR-opening workers.
- Claude Code subagents: [Create custom subagents](https://code.claude.com/docs/en/sub-agents); SDK: [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents).
- Cursor: built-in `/create-subagent`, `/best-of-n`, worktrees — [Agent Skills](https://cursor.com/docs/skills), [Worktrees](https://cursor.com/docs/configuration/worktrees), [Agent best practices](https://cursor.com/blog/agent-best-practices).
- Copilot custom agents + specialized roles: [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent).
- Codex hierarchical AGENTS guidance: [openai/codex hierarchical_agents_message.md](https://github.com/openai/codex/blob/main/codex-rs/core/hierarchical_agents_message.md).

**Implication for bwai**  
Optional scaffold of `.claude/agents/` (and Cursor subagent skills) for stack-specific roles (e.g. `api-reviewer`, `frontend-qa`) with restricted tools. Document when to use subagents vs. skills vs. workflows. Ensure test/lint commands in `AGENTS.md` are safe under parallel worktrees.

---

### 4. Spec-driven / plan-then-code workflows (OpenSpec, Plan Mode, Superpowers)

**Why it matters for boilerplates**  
Agents over-edit when “done” is undefined. Specs, plans, and human approval gates are becoming the default delivery contract — not optional ceremony.

**Evidence**

- OpenSpec: [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec); overview mental model (specs as truth, change folders, delta specs, archive) — [docs/overview.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md); product site [openspec.pro](https://openspec.pro/).
- Cursor Plan Mode: [Plan Mode](https://cursor.com/docs/agent/plan-mode) — research → questions → editable plan → build; save to `.cursor/plans/`.
- Copilot cloud agent research → plan → iterate before PR: [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent).
- bwai already wires GetSuperpower + Superpowers brainstorming/writing-plans — see repo [`docs/getsuperpower-integration.md`](../getsuperpower-integration.md) and [0xroylee/getsuperpower](https://github.com/0xroylee/getsuperpower).

**Implication for bwai**  
Keep `bwai-delivery` (or OpenSpec-compatible) workflow as a first-class catalog artifact. Consider optional OpenSpec init in templates that already use SDD. Skills should enforce “no code before approved plan/spec” for non-trivial work — matching Superpowers/OpenSpec norms.

---

### 5. Eval harnesses, agent observability, tracing

**Why it matters for boilerplates**  
App unit tests don’t measure agent quality. Production agent teams need traces → datasets → evals → CI gates, and coding agents can drive that loop via CLI/MCP.

**Evidence**

- Braintrust: [braintrust.dev/docs](https://www.braintrust.dev/docs) — instrument → observe → annotate → evaluate → deploy; `bt` CLI preferred for coding agents; MCP for IDE exploration.
- Braintrust CI / multi-framework stance: [any framework / provider](https://www.braintrust.dev/blog/any-framework-any-provider); native GitHub Action quality gates described in first-party comparison content on [braintrust.dev](https://www.braintrust.dev/).
- Copilot cloud agent PR outcome metrics for orgs: [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent) (usage metrics / time-to-merge).
- Copilot hooks for validation/logging during agent runs: same page (“Hooks”).
- MCP list caching / prompt-cache stability (`ttlMs`, `cacheScope`) in [MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/) — observability-adjacent infra for tool catalogs.

**Implication for bwai**  
For AI-app or agent-heavy boilerplates: optional Braintrust/OTel instrumentation stub + `AGENTS.md` section on “how to eval agent changes.” Keep SkillSpector SARIF in CI as the *skill* quality gate; leave app-agent eval as stack-specific opt-in, not a hard dependency for every starter.

---

### 6. Tool use / computer use / browser agents

**Why it matters for boilerplates**  
Coding agents increasingly need to *operate* the product (UI QA, smoke flows), not only edit source. Two dominant patterns: structured browser MCP vs. pixel computer-use.

**Evidence**

- Playwright MCP (Microsoft): [playwright.dev/mcp/introduction](https://playwright.dev/mcp/introduction); repo [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) — accessibility snapshots, ~200–400 tokens/snapshot, 40+ tools; notes MCP is **not** a security boundary; coding agents may prefer Playwright CLI+skills for token cost.
- Enabled by default for Copilot cloud agent: [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent).
- OpenAI computer use: [Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use); Responses API agentic tools: [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses); environment write-up: [Equip Responses API with a computer environment](https://openai.com/index/equip-responses-api-computer-environment/).
- OpenAI skills on Responses API (versioned skill bundles loaded before prompt): same computer-environment post.

**Implication for bwai**  
`nextjs-app` / `react-native-app`: ship Playwright MCP *or* CLI skill + a short smoke-test skill. Document security: restrict origins, prefer headless/isolated, never treat MCP as a sandbox. Reserve vision computer-use for rare templates (RPA-like), not default Node API starters.

---

### 7. RAG / memory / long-context patterns for coding agents

**Why it matters for boilerplates**  
Coding agents still benefit more from **filesystem + progressive disclosure** than classical RAG over docs. Memory is splitting into human-authored instructions vs. agent-written auto-memory.

**Evidence**

- Claude Code memory model: [CLAUDE.md / memory](https://code.claude.com/docs/en/memory) — CLAUDE.md layers + Auto Memory; keep project CLAUDE.md under ~200 lines; move task-specific content to skills/path rules ([context window](https://code.claude.com/docs/en/context-window)).
- Codex AGENTS.md discovery + 32 KiB default cap: [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md).
- AGENTS.md ecosystem (Linux Foundation Agentic AI Foundation stewardship): [agents.md](https://agents.md/).
- Copilot Memory (public preview) for cloud agent: [About GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent).
- Agent Skills progressive disclosure as context strategy: [agentskills.io](https://agentskills.io/specification); Anthropic engineering post above.
- OpenAI Responses + skills/compaction for long-running agents: [Equip Responses API with a computer environment](https://openai.com/index/equip-responses-api-computer-environment/).

**Implication for bwai**  
Scaffold **thin** `AGENTS.md` + `CLAUDE.md` (commands, layout, non-negotiables) and put depth in skills. Nested `AGENTS.md` for monorepo packages when relevant. Avoid baking large RAG indexes into starters unless the product *is* a RAG app; prefer “agent reads the repo” + MCP for external systems.

---

### 8. Security scanning for skills / tools (SkillSpector and peers)

**Why it matters for boilerplates**  
Skills execute with high trust. First-party research cited by NVIDIA claims material vulnerability/malicious rates in the wild skill ecosystem. Scanning + provenance is the trust layer for catalogs.

**Evidence**

- NVIDIA SkillSpector: [github.com/NVIDIA/skillspector](https://github.com/NVIDIA/skillspector); docs: [Scan Agent Skills Before Installation](https://docs.nvidia.com/skills/scanning-agent-skills) — 68 patterns / 17 categories including prompt injection, exfiltration, MCP tool poisoning, least privilege; SARIF/JSON/Markdown; static + optional LLM semantic analysis; part of [NVIDIA Verified Skills](https://docs.nvidia.com/skills/) / [NVIDIA/skills](https://github.com/NVIDIA/skills).
- Anthropic caution on skill trust: [Introducing Agent Skills](https://www.anthropic.com/news/skills) (“stick to trusted sources”).
- MCP security practices referenced by Playwright MCP: [MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices).
- bwai product claim (landing): [boilerplates-with-ai-skills.vercel.app](https://boilerplates-with-ai-skills.vercel.app) — SkillSpector gate + `skills.lock` SHA-256 provenance + SARIF reports.

**Implication for bwai**  
Double down: `--require-scanner` in CI, publish SARIF, extend scans to bundled MCP configs where SkillSpector supports them, document baseline/suppression carefully. Market this as the anti-marketplace moat (“curated + gated,” not “largest index”).

---

### 9. `AGENTS.md` / `CLAUDE.md` / rules conventions across agents

**Why it matters for boilerplates**  
Cross-agent scaffolds must emit the right *always-on* files without duplicating skill content into every agent’s proprietary format.

**Evidence**

- AGENTS.md standard: [agents.md](https://agents.md/) — complementary to README; nested files; closest wins; stewarded by Agentic AI Foundation / Linux Foundation; adopted widely (Codex, Cursor, Copilot coding agent, Jules, Amp, Factory, etc.).
- Codex loading rules: [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md); Codex customization layers (AGENTS.md + memories + skills + MCP + subagents): [Customization](https://developers.openai.com/codex/concepts/customization).
- Claude: [CLAUDE.md](https://code.claude.com/docs/en/claude-md) / [memory](https://code.claude.com/docs/en/memory); `.claude/` layout: [claude directory](https://code.claude.com/docs/en/claude-directory).
- Cursor rules vs skills vs AGENTS.md: [Rules](https://cursor.com/docs/rules.md), [Customizing agents](https://cursor.com/learn/customizing-agents), [Customize](https://cursor.com/docs/customize-cursor).

**Implication for bwai**  
Canonical content strategy:

| Layer | Content | Files |
| --- | --- | --- |
| Always-on | Build/test commands, architecture non-negotiables | `AGENTS.md` (+ symlink/copy guidance for `CLAUDE.md`) |
| Dynamic | Workflows, stack playbooks | `SKILL.md` under `.bwai/skills/` / agent skill dirs |
| Tools | External systems | MCP config |
| Cursor extras | Globs / alwaysApply only when skills aren’t enough | `.cursor/rules/*.mdc` sparingly |

Avoid maintaining four divergent instruction corpora. Prefer generate-from-one-source at `bwai new` time.

---

### 10. Workflow bundles / GetSuperpower-style orchestration

**Why it matters for boilerplates**  
A skill is a capability; a **workflow** is an ordered delivery process with approval gates. Catalogs that ship both map to how teams actually ship with agents.

**Evidence**

- GetSuperpower (workflow.json skill trees, cross-agent install): [0xroylee/getsuperpower](https://github.com/0xroylee/getsuperpower); bwai integration: [`docs/getsuperpower-integration.md`](../getsuperpower-integration.md).
- Claude Code dynamic workflows vs skills/subagents: [Run agents in parallel](https://code.claude.com/docs/en/agents) / workflows docs linked therein.
- OpenSpec change lifecycle (propose → apply → archive): [OpenSpec](https://github.com/Fission-AI/OpenSpec).
- Cursor Automations + hooks skills: [cursor.com/docs/skills](https://cursor.com/docs/skills) (`/automate`, `/create-hook`).

**Implication for bwai**  
Treat `shared/workflows/*` as a peer product surface to boilerplates. Expand workflow catalog (e.g. `openspec-delivery`, `hotfix`, `security-campaign`) without exploding skill count. Keep human_approval gates visible.

---

### 11. Coding-agent CI integration / PR agents

**Why it matters for boilerplates**  
Agents no longer stop at the IDE. Cloud PR agents + CI hooks change what a “ready” scaffold must include (rulesets bypass, setup steps, custom agents, MCP for Issues).

**Evidence**

- Copilot cloud agent (Actions-powered env, research/plan/iterate, custom agents, automations, agent tasks API): [About cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent); [Agent tasks REST API](https://docs.github.com/en/rest/agent-tasks/agent-tasks?apiVersion=2026-03-10); [Use via API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api).
- Cursor cloud agents + PR babysitting skill: [Agent best practices](https://cursor.com/blog/agent-best-practices); `/babysit` in [Skills](https://cursor.com/docs/skills).
- Claude Code on the web / routines (scheduled cloud sessions): linked from [agents](https://code.claude.com/docs/en/agents).

**Implication for bwai**  
Optional `.github/agents/` custom agent stubs + `copilot-setup-steps` notes for stacks that need services. Ensure branch protection docs mention Copilot bypass actors. Keep a skill that teaches “assign issue → review PR → don’t merge without human.” SkillSpector remains the pre-merge gate for *skill* changes in the catalog repo.

---

### 12. Structured output / typed tool schemas

**Why it matters for boilerplates**  
Reliable agent↔tool contracts need schemas (JSON Schema / Zod), not free-form tool args. This affects API starters and any template that exposes tools to models.

**Evidence**

- OpenAI Structured Outputs: [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs); Responses API `text.format` — [Migrate to Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses).
- Vercel AI SDK: [Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data); agents via `ToolLoopAgent` — [Building Agents](https://ai-sdk.dev/docs/agents/building-agents), [Agents overview](https://ai-sdk.dev/docs/agents/overview); durable `WorkflowAgent` — [WorkflowAgent](https://ai-sdk.dev/docs/agents/workflow-agent).
- MCP tools are schema-described JSON-RPC methods (core protocol): [modelcontextprotocol.io](https://modelcontextprotocol.io); header-routable tool names in `2026-07-28`.
- SkillSpector `allowed-tools` / permission mismatch categories: [NVIDIA scanning docs](https://docs.nvidia.com/skills/scanning-agent-skills).

**Implication for bwai**  
`express-api` / `fastify-api` / AI SDK–based Next starters should demonstrate Zod (or equivalent) tool/input schemas and typed structured outputs. Skills that author tools should require schemas in acceptance criteria.

---

### 13. Local vs cloud agents / worktrees

**Why it matters for boilerplates**  
Developers mix local IDE agents, isolated worktrees, and cloud sandboxes. Templates must install cleanly in all three (deps, env files, secrets policy).

**Evidence**

- Cursor worktrees: [Worktrees](https://cursor.com/docs/configuration/worktrees) — `.cursor/worktrees.json` setup hooks; `/worktree`, `/best-of-n`; cloud agents in [best practices](https://cursor.com/blog/agent-best-practices).
- Claude Code worktrees + agent view auto-worktrees: [Run agents in parallel](https://code.claude.com/docs/en/agents); [worktrees](https://code.claude.com/docs/en/worktrees).
- Copilot cloud agent ephemeral Actions environment (59-minute hard limit): [About cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent).
- Codex: AGENTS.md + local/cloud modes discussed in first-party Codex docs ([AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)); OpenAI Responses hosted containers: [computer environment](https://openai.com/index/equip-responses-api-computer-environment/).

**Implication for bwai**  
Ship `.cursor/worktrees.json` (and Claude-equivalent notes) with `npm ci` / `uv sync` / env copy steps. Keep secrets out of templates; document cloud-agent env customization. Make `bwai doctor` verify agent dirs + lockfile + scanner presence across local installs.

---

## Prioritized enhancement backlog (for bwai)

### P0 — Ship or harden now (changes what “good catalog entry” means)

| ID | Enhancement | Rationale |
| --- | --- | --- |
| P0-1 | **Strict agentskills.io compliance gate** in promote/CI (required `name`/`description`, size guidance, optional `compatibility`/`license`) | Cross-agent portability is the market standard ([spec](https://agentskills.io/specification)). |
| P0-2 | **Keep SkillSpector + `skills.lock` + SARIF as non-optional catalog policy**; expand messaging vs. unvetted directories | Differentiator confirmed by NVIDIA pipeline ([docs](https://docs.nvidia.com/skills/scanning-agent-skills)). |
| P0-3 | **Single-source always-on instructions** → emit `AGENTS.md` + thin `CLAUDE.md` (+ Cursor AGENTS support) without duplicating skill bodies | [agents.md](https://agents.md/), [Codex](https://developers.openai.com/codex/guides/agents-md), [Claude memory](https://code.claude.com/docs/en/memory). |
| P0-4 | **Workflow-first catalog UX**: every boilerplate declares a GetSuperpower/OpenSpec-style delivery workflow by default | Plan-then-code is productized ([Plan Mode](https://cursor.com/docs/agent/plan-mode), [OpenSpec](https://github.com/Fission-AI/OpenSpec), bwai integration). |
| P0-5 | **MCP templates with least-privilege defaults** (and Playwright MCP/CLI for UI stacks); document MCP `2026-07-28` migration awareness | [MCP release](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [Playwright MCP](https://playwright.dev/mcp/introduction). |

### P1 — Next quarter (high leverage, stack-selective)

| ID | Enhancement | Rationale |
| --- | --- | --- |
| P1-1 | Scaffold **stack-specific subagents** (`.claude/agents/`, Cursor `/create-subagent` patterns) with tool allowlists | [Claude subagents](https://code.claude.com/docs/en/sub-agents), [Cursor skills](https://cursor.com/docs/skills). |
| P1-2 | **Worktree setup files** (`.cursor/worktrees.json`, AGENTS notes for parallel agents) | [Cursor worktrees](https://cursor.com/docs/configuration/worktrees), [Claude worktrees](https://code.claude.com/docs/en/agents). |
| P1-3 | Optional **Copilot cloud agent** stubs (custom agents, setup steps, MCP repo settings notes) | [Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent). |
| P1-4 | **OpenSpec-compatible** workflow variant alongside Superpowers | [OpenSpec](https://github.com/Fission-AI/OpenSpec). |
| P1-5 | Cursor **`paths` / `disable-model-invocation`** overlays when generating Cursor skill installs | [Cursor Skills](https://cursor.com/docs/skills). |
| P1-6 | For AI/API boilerplates: **Zod + AI SDK ToolLoopAgent / structured output** examples | [AI SDK agents](https://ai-sdk.dev/docs/agents/building-agents), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). |

### P2 — Watch / opportunistic

| ID | Enhancement | Rationale |
| --- | --- | --- |
| P2-1 | Optional Braintrust/`bt` + OTel eval seams in AI-product boilerplates | [Braintrust docs](https://www.braintrust.dev/docs). |
| P2-2 | Track MCP Apps / Tasks extensions for interactive or long-running tool demos | [MCP 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28/). |
| P2-3 | Vision computer-use template only if a clear customer ask (else Playwright) | [OpenAI computer use](https://developers.openai.com/api/docs/guides/tools-computer-use). |
| P2-4 | Copilot Memory / Claude Auto Memory guidance (docs only — don’t fight agent-written memory) | [Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent), [Claude memory](https://code.claude.com/docs/en/memory). |
| P2-5 | Avoid building a mega skill crawler/index — partner or deep-link to marketplaces; stay curated | Landscape already crowded ([landscape doc](../landscape-and-differentiation.md)). |
| P2-6 | Monitor Claude agent teams / dynamic workflows as they graduate from experimental | [Claude agents](https://code.claude.com/docs/en/agents). |

---

## Sources index (primary)

| Topic | URL |
| --- | --- |
| Agent Skills spec | https://agentskills.io/specification |
| Agent Skills org repo | https://github.com/agentskills/agentskills |
| Anthropic Skills announce | https://www.anthropic.com/news/skills |
| Anthropic Skills engineering | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills |
| Claude Code Skills | https://code.claude.com/docs/en/skills |
| Claude Code agents / parallel | https://code.claude.com/docs/en/agents |
| Claude Code subagents | https://code.claude.com/docs/en/sub-agents |
| Claude Code memory / CLAUDE.md | https://code.claude.com/docs/en/memory |
| Cursor Skills | https://cursor.com/docs/skills |
| Cursor Rules | https://cursor.com/docs/rules.md |
| Cursor MCP | https://cursor.com/docs/mcp |
| Cursor Plan Mode | https://cursor.com/docs/agent/plan-mode |
| Cursor Worktrees | https://cursor.com/docs/configuration/worktrees |
| Cursor agent best practices | https://cursor.com/blog/agent-best-practices |
| AGENTS.md | https://agents.md/ |
| Codex AGENTS.md | https://developers.openai.com/codex/guides/agents-md |
| Codex customization | https://developers.openai.com/codex/concepts/customization |
| MCP home | https://modelcontextprotocol.io |
| MCP 2026-07-28 spec | https://modelcontextprotocol.io/specification/2026-07-28 |
| MCP 2026-07-28 blog | https://blog.modelcontextprotocol.io/posts/2026-07-28/ |
| Claude MCP 2026-07-28 | https://claude.com/blog/bringing-mcp-2026-07-28-to-claude |
| Google MCP stateless | https://developers.googleblog.com/scaling-ai-agent-infrastructure-with-the-mcp-stateless-updates/ |
| NVIDIA SkillSpector | https://github.com/NVIDIA/skillspector |
| NVIDIA scan docs | https://docs.nvidia.com/skills/scanning-agent-skills |
| Playwright MCP | https://playwright.dev/mcp/introduction |
| microsoft/playwright-mcp | https://github.com/microsoft/playwright-mcp |
| Copilot cloud agent | https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent |
| GitHub agent tasks API | https://docs.github.com/en/rest/agent-tasks/agent-tasks?apiVersion=2026-03-10 |
| OpenSpec | https://github.com/Fission-AI/OpenSpec |
| OpenAI Structured Outputs | https://developers.openai.com/api/docs/guides/structured-outputs |
| OpenAI Responses migration | https://developers.openai.com/api/docs/guides/migrate-to-responses |
| OpenAI Computer use | https://developers.openai.com/api/docs/guides/tools-computer-use |
| OpenAI Responses + computer env | https://openai.com/index/equip-responses-api-computer-environment/ |
| Vercel AI SDK agents | https://ai-sdk.dev/docs/agents/building-agents |
| Vercel AI SDK structured data | https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data |
| Braintrust docs | https://www.braintrust.dev/docs |
| Microsoft Agent Framework skills | https://learn.microsoft.com/en-us/agent-framework/agents/skills |
| GetSuperpower | https://github.com/0xroylee/getsuperpower |
| bwai landing | https://boilerplates-with-ai-skills.vercel.app |

---

*End of research note. Update when MCP extensions, Agent Skills frontmatter, or major agent harnesses change.*

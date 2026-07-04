# Landscape Review & How We Do Better

A review of `requirements.md` (the `boilerplates-with-ai-skills` spec) against
what already exists in the AI-agent-skill ecosystem as of mid-2026, plus a
concrete plan for where this project can be genuinely better instead of
duplicating existing tools.

> This is a strategy/analysis document. It does not change product scope on its
> own; it records findings so the spec can be sharpened before implementation.

## 1. What the requirements ask for

`requirements.md` proposes a GitHub hub that combines three things:

1. **Boilerplates** — opinionated, production-ready starters for common stacks
   (Next.js, FastAPI + React, Python AI, full-stack SaaS) that ship pre-wired
   with agent config (`.claude/`, `.cursor/`, `.codex/`, `CLAUDE.md`,
   `AGENTS.md`, `SKILL.md`).
2. **Automated skill discovery/update** — CI that periodically finds, downloads,
   categorizes, and indexes community/official skills.
3. **Safety validation** — mandatory NVIDIA SkillSpector scanning with a risk
   threshold gate, plus a CLI (`new`, `update-skills`, `scan-project`,
   `list-boilerplates`, `search-skills`).

The core bet is **"boilerplate + curated, security-vetted skills, cross-agent,
one command."**

## 2. What already exists outside (and overlaps)

The single biggest finding: **most of the individual pieces already exist and
are mature.** The novelty is not in any one capability but in the combination.

### 2.1 The skill format is now a standard (not something to invent)

- **Agent Skills / `SKILL.md`** is an open standard published by Anthropic at
  [agentskills.io](https://agentskills.io/specification) (Dec 2025) and adopted
  by Claude Code, OpenAI Codex, Gemini CLI, OpenClaw and others. Only `name` +
  `description` are required; progressive disclosure (name/desc at startup, body
  on activation, references on demand) is baked in.
- Implication: we should **consume and comply with** this spec, not define our
  own. Portability is the standard's selling point.

### 2.2 Skill frameworks / methodologies

- **obra/superpowers** — a very large, popular "agentic skills framework &
  methodology" (TDD, brainstorming, debugging, plans, code review, worktrees,
  subagent-driven dev). Ships via the official Claude plugin marketplace and
  git-backed installs for Codex/Copilot/Gemini/OpenCode/Cursor. Skills activate
  automatically by context.
- **mattpocock/skills** — another curated skill set, referenced as an external
  dependency by workflow bundles.

### 2.3 getsuperpower (the repo we were asked to install)

`0xroylee/getsuperpower` (installed and verified here — see
`docs/getsuperpower-eval.md`) is the closest existing thing to parts of our
spec. It is a Bun + TypeScript CLI that:

- Packages a **whole workflow as one callable "skill tree"** (`workflow.json`
  entry skill + ordered sub-skill steps with `human_approval` gates).
- **Installs skills across agents** (Claude `.claude/skills`, Codex/opencode/
  Copilot `.agents/skills`, Cursor `.cursor/rules`) from bundled, local,
  Superpowers, Matt Pocock, or external git sources.
- Provides `init`/`validate`/`deps`/`install`/`clone`/`list` and an authoring
  helper skill, with a 90% coverage gate and a dependency-recency policy.

It overlaps heavily with our **CLI + skill install/update + cross-agent** goals.
It does **not** do boilerplate/project scaffolding, and it does **not**
integrate security scanning (SkillSpector). Those are our openings.

### 2.4 Discovery, directories & marketplaces (the "index" is solved)

Our "automated discovery + central index" goal is a crowded space:

| Directory / marketplace | Focus | Approx. size |
| --- | --- | --- |
| SkillsMP (skillsmp.com) | Agent Skills marketplace | 66,500+ |
| agentskill.sh | Cross-tool skills directory | 274,000+ (claimed) |
| awesomeagentskills.dev | Auto-updating skills + MCP + rules | 26,000+ |
| cursor.directory | Cursor/Windsurf rules + MCP (one-click) | 1,000+ rules, 250K+ users |
| MCP.so / Glama / PulseMCP / Smithery | MCP server directories | 4,000–18,000+ |
| ClawHub | OpenClaw skills registry | 5,700+ |
| philipbankier/awesome-agent-skills, VoltAgent/awesome-agent-skills | Cross-platform awesome lists | — |

Building "yet another crawler + index" would compete with well-funded,
already-large directories and is the weakest part of the spec.

### 2.5 Boilerplate scaffolding (also solved as a primitive)

- `create-next-app`, `degit`, `cookiecutter`, Yeoman, and thousands of GitHub
  template repos already scaffold projects.
- `PatrickJS/awesome-cursorrules` and cursor.directory already distribute
  editor rule sets.
- So "scaffold a project" is a commodity; "scaffold a project **that comes with
  vetted, cross-agent skills already wired in**" is not.

### 2.6 Security scanning (a real, differentiated primitive — use it, don't rebuild it)

- **NVIDIA SkillSpector** is purpose-built for exactly our safety goal: 68
  vulnerability patterns across 17 categories (prompt injection, data
  exfiltration, excessive agency, MCP tool poisoning, taint tracking, YARA,
  OSV.dev CVE lookups), two-stage static + optional LLM analysis, 0–100 risk
  score, SARIF/JSON/Markdown output, baseline suppression, and CI-friendly exit
  codes (`1` if `risk_score > 50`, `2` on error). Research it cites: 26.1% of
  skills have vulnerabilities, 5.2% show likely malicious intent.
- Implication: our value is **operationalizing** SkillSpector as a gate, not
  reimplementing a scanner.

## 3. Honest assessment of the spec

| Spec pillar | Verdict | Why |
| --- | --- | --- |
| Invent skill format | ❌ Drop | `SKILL.md` is a standard; comply instead. |
| Boilerplates pre-wired with agent config | ✅ Keep — differentiator | No mature product ties starters + vetted skills together. |
| Cross-agent skill install/update CLI | ⚠️ Reuse | getsuperpower/superpowers already do this well; extend or build on, don't clone. |
| Automated discovery + central index | ⚠️ De-prioritize | Many large directories already exist; hard to win. |
| SkillSpector safety gate | ✅ Keep — differentiator | Nobody bundles boilerplates + a security gate; SkillSpector makes it cheap. |
| CLI (`new`, `scan-project`, ...) | ✅ Keep | But scope tightly around the two differentiators. |

## 4. How we do better (recommended positioning)

Reframe the project from "another skills hub" to:

> **Security-vetted, cross-agent project boilerplates**: `npx` a starter for
> your stack and get a working project *plus* a curated set of skills that have
> **passed a SkillSpector gate**, wired for Claude/Cursor/Codex/Copilot, with a
> reproducible provenance report checked into the repo.

Concrete ways to be better than each incumbent:

1. **Be the only "starter + vetted skills" bundle.** Directories give you a
   pile of skills; we give a *runnable project* with a *small, opinionated,
   scanned* skill set already installed and aligned to the stack. This is the
   one gap no incumbent fills.
2. **Make security a first-class, visible gate — not a footnote.** Run
   SkillSpector in CI for every bundled/updated skill, fail the build above a
   configurable threshold, and commit `safety-reports/*.sarif` + a human summary
   so users can *see* why a skill was included. Surface the risk score in the
   README badge and in `scan-project` output.
3. **Stand on the standard + existing installers, don't fork them.** Emit
   spec-compliant `SKILL.md`, and either (a) build on getsuperpower's
   `workflow.json` skill-tree + multi-agent installer, or (b) reuse Superpowers
   as an upstream skill source. Contributing a "scan gate" upstream to
   getsuperpower may be higher-leverage than a parallel CLI.
4. **Curate, don't crawl.** Ship a *small, human-reviewed* catalog per
   boilerplate with pinned versions + provenance, instead of racing 270k-entry
   directories on breadth. Trust and reproducibility beat volume for teams.
5. **Reproducibility & provenance.** Pin skill sources by commit, record a
   lockfile of installed skills + their scan scores, and support deterministic
   re-installs and re-scans (`scan-project`) so enterprises can audit.
6. **Cross-agent parity as a guarantee, tested in CI.** getsuperpower already
   maps agent homes; we should test that each boilerplate's skills install and
   load on every supported agent, and publish a compatibility matrix.

## 5. Suggested scope cut for Phase 1

Drop/defer the crawler + central index. Ship instead:

1. **2 boilerplates** (e.g. Next.js AI-first, FastAPI + React) each with a tiny,
   scanned skill set wired for all supported agents.
2. **SkillSpector CI gate** producing committed `safety-reports/` + a badge.
3. **A thin CLI** — `new <boilerplate>` (scaffold) and `scan-project`
   (re-scan) — ideally layered on getsuperpower/Superpowers rather than a
   from-scratch installer.
4. **Provenance lockfile** for installed skills.

This keeps the two real differentiators (starter+skills bundling, and a visible
security gate) and avoids competing where strong incumbents already exist.

## 6. Key references

- Agent Skills spec: https://agentskills.io/specification
- Superpowers: https://github.com/obra/superpowers
- getsuperpower: https://github.com/0xroylee/getsuperpower
- NVIDIA SkillSpector: https://github.com/NVIDIA/SkillSpector
- Directories: cursor.directory, skillsmp.com, awesomeagentskills.dev,
  agentskill.sh, https://github.com/philipbankier/awesome-agent-skills

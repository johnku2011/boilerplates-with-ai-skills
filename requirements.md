**Requirements Document: boilerplates-with-ai-skills**

**Version:** 1.1
**Date:** July 2026
**Author:** Grok (assisted); revised after a landscape review (see
`docs/landscape-and-differentiation.md` and `docs/getsuperpower-eval.md`).
**Project Goal:** Provide **security-vetted, cross-agent project boilerplates** —
`npx` a starter for your stack and get a working project *plus* a small, curated
set of AI-agent skills that have **passed a security gate** and are wired for
Claude Code, Cursor, Codex, and GitHub Copilot, with a reproducible provenance
report checked into the repo.

> **What changed in 1.1 (and why):** A review of the ecosystem showed that most
> individual pieces the original spec proposed already exist and are mature — the
> `SKILL.md` format is now an open standard, cross-agent skill installers exist
> (`getsuperpower`, `obra/superpowers`), large skill directories/marketplaces
> already own discovery, project scaffolding is a commodity, and NVIDIA
> SkillSpector is a purpose-built skill security scanner. The novelty is **only
> the combination**. This version therefore narrows scope to the two things no
> incumbent bundles today — **(a) starters that ship with vetted, cross-agent
> skills, and (b) a visible security gate** — and reuses standards/tools for
> everything else instead of reinventing them.

### 1. Objectives

- Provide a small number of opinionated, production-ready boilerplates for common
  tech stacks (e.g., Next.js AI-first, FastAPI + React) that ship **pre-wired
  with a curated, security-scanned skill set** and agent config (`.claude/`,
  `.cursor/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`, `SKILL.md`).
- **Comply with the open `SKILL.md` / Agent Skills standard**
  (https://agentskills.io/specification) rather than defining a new format, so
  skills stay portable across agents.
- **Build on existing installers and skill sources** (`getsuperpower` skill-tree
  bundles, `obra/superpowers`, `mattpocock/skills`) instead of cloning a
  cross-agent installer from scratch. Prefer contributing a security gate
  upstream over maintaining a parallel CLI.
- Make **safety a first-class, visible gate**: every bundled or updated skill
  must pass a configurable NVIDIA SkillSpector threshold, with committed reports
  and provenance.
- **Curate, don't crawl.** Ship a small, human-reviewed catalog per boilerplate
  with pinned versions and provenance instead of racing large directories on
  breadth.
- Lower the barrier for developers and teams to adopt agentic workflows
  *securely, reproducibly, and portably*.

### 2. Prior Art & Positioning (informative)

This project explicitly reuses, rather than reinvents, the following. Full
analysis: `docs/landscape-and-differentiation.md`.

- **Skill format:** `SKILL.md` / Agent Skills open standard (Anthropic, adopted
  by Claude Code, Codex, Gemini CLI, OpenClaw). We consume and emit this format.
- **Cross-agent installers / skill frameworks:** `0xroylee/getsuperpower`
  (workflow "skill tree" bundles + multi-agent install; evaluated in
  `docs/getsuperpower-eval.md`), `obra/superpowers` (methodology + composable
  skills), `mattpocock/skills`.
- **Discovery / directories (we do NOT compete on breadth):** SkillsMP,
  agentskill.sh, awesomeagentskills.dev, cursor.directory, MCP.so, Glama,
  PulseMCP, Smithery, ClawHub.
- **Scaffolding primitives:** `degit`, `cookiecutter`, `create-next-app`,
  `PatrickJS/awesome-cursorrules`.
- **Security scanner:** NVIDIA SkillSpector (https://github.com/NVIDIA/SkillSpector).

**Our two differentiators:** (1) a *runnable starter bundled with vetted,
cross-agent skills*, and (2) a *visible, CI-enforced security gate* with
committed reports and a provenance lockfile.

### 3. Key Features

#### 3.1 Boilerplate Structure
Each boilerplate directory should follow a consistent, standard-compliant layout:
```
boilerplate-name/
├── README.md                  # Quick start, AI setup, security-report badge
├── .github/                   # Workflows (CI, lint, SkillSpector gate)
├── .claude/                   # Skills for Claude Code (standard SKILL.md)
├── .cursor/                   # Cursor rules/skills
├── .codex/ or .agents/        # Codex/opencode/Copilot skill targets
├── CLAUDE.md / AGENTS.md      # Project steering files
├── SKILL.md examples          # Standard-compliant, scanned skills
├── src/ / app/                # Core code
├── tests/                     # Pre-configured testing
├── docker-compose.yml         # Optional dev/prod setup
├── safety-reports/            # Committed SkillSpector SARIF + summaries
├── skills.lock                # Provenance lockfile (pinned skill sources + scores)
└── skills/                    # Curated, vetted skills for this stack
```

- Skills MUST be spec-compliant `SKILL.md` (required `name` + `description`,
  progressive disclosure, no `<`/`>` in frontmatter).
- Include a small set of high-value skills per stack (e.g., TDD, code review,
  security scanning) rather than a large unvetted collection.

#### 3.2 Curated Skill Catalog & Updates (not a crawler)
- **Sources:** a human-reviewed allowlist — official Anthropic skills,
  Superpowers, Matt Pocock, and other vetted repos — pinned by commit.
- **Mechanism:** a CI workflow that, on a schedule or PR:
  1. Resolves declared skill sources at pinned versions.
  2. Runs the SkillSpector safety gate (§3.3).
  3. Updates `skills.lock` (source, commit, risk score, scan mode).
  4. Opens a PR for human review — no silent auto-merge of new skills.
- Users can run a local CLI command (§3.4) to install/update the vetted set into
  their project across agents.
- **Explicitly not building** a general web crawler or a central skill index;
  large directories already exist and are out of scope to compete with.

#### 3.3 Safety Validation with SkillSpector (visible gate)
- Mandatory integration with https://github.com/NVIDIA/SkillSpector.
- For every bundled or updated skill:
  - Run `skillspector scan <path-or-url> --format sarif` (supports directory,
    Git URL, ZIP, single `SKILL.md`).
  - Capture the 0–100 risk score, SARIF report, and findings (prompt injection,
    data exfiltration, excessive agency, MCP tool poisoning, etc.).
  - **Gate in CI:** fail the build when a skill exceeds a configurable threshold
    (default: risk > 50, aligned to SkillSpector's non-zero exit code; tunable,
    e.g. block at >30 for stricter bundles). Quarantine/flag borderline skills
    with warnings.
- Commit reports to `safety-reports/` with human-readable summaries and surface
  the score via a README badge.
- Support optional LLM semantic analysis with a `--no-llm` fallback (and record
  `scan_mode`/`llm_used` so a low static-only score is never mistaken for a full
  scan).
- Support baseline/false-positive suppression for known-accepted findings.
- Document how users re-scan skills in their own projects (`scan-project`).

#### 3.4 CLI / Tooling (thin; layered on existing installers)
- Provide an `npx` CLI focused on the two differentiators:
  - `new <boilerplate-name> [project-dir]` — scaffold a project with the vetted
    skill set wired for the chosen agents.
  - `scan-project` — run SkillSpector on the project's installed skills and
    print/emit a report.
  - `list-boilerplates` — list available starters.
- Skill installation across agents SHOULD reuse `getsuperpower`/Superpowers
  rather than a from-scratch multi-agent installer. `search-skills` is
  de-scoped in favor of pointing at existing directories.
- Built with Node.js or Bun (align with the chosen upstream installer).

#### 3.5 Reproducibility & Provenance
- Pin every skill source by commit; record installed skills + scan scores in
  `skills.lock`.
- Support deterministic re-install and re-scan so teams/enterprises can audit
  exactly what was installed and why it was allowed.

#### 3.6 Documentation & Onboarding
- Root README with quick start, the security model (how the gate works and how
  to read `safety-reports/`), and how skills work across Claude/Cursor/Codex/
  Copilot.
- Per-boilerplate docs and a contribution guide for new boilerplates/skills
  (including the mandatory scan gate).

### 4. Non-Functional Requirements
- **Security:** All included skills must pass the SkillSpector gate; reports are
  transparent and committed. No execution of unvetted code in CI.
- **Standards compliance:** Emit and consume spec-compliant `SKILL.md`; stay
  portable across supported agents.
- **Reproducibility:** Pinned sources + `skills.lock` enable deterministic
  re-installs and audits.
- **Cross-agent parity (tested):** CI verifies each boilerplate's skills install
  and load on every supported agent; publish a compatibility matrix.
- **Maintainability:** Modular structure; automated tests (lint, build, scan
  gate) for each boilerplate.
- **Performance:** Skills should be lightweight and context-efficient (progressive
  disclosure via YAML frontmatter).
- **Licensing:** MIT or Apache 2.0. Attribute upstream skill sources and require
  the same for contributions.
- **Scalability:** Easy to add new boilerplates; categorize by stack/domain.
- **Accessibility:** Beginner-friendly with advanced sections for power users.

### 5. Tech Stack Suggestions
- **Repo Management:** GitHub with Actions for the scan gate and cross-agent
  install tests.
- **CLI:** Node.js or Bun, layered on `getsuperpower`/Superpowers where possible.
- **Scanning:** SkillSpector via subprocess or Docker, wired into CI with its
  exit-code contract.
- **Scaffolding:** `degit`/`cookiecutter` or the upstream installer's scaffolding.
- **Skill format:** `SKILL.md` per the agentskills.io specification.

### 6. User Personas & Use Cases
- **Solo Developer:** Start a new AI-optimized project with vetted skills
  pre-loaded, in one command.
- **Team Lead:** Standardize AI workflows with a vetted skill set and committed
  safety reports.
- **AI Enthusiast:** Experiment with community skills that have passed a gate.
- **Enterprise:** Audit exactly which skills are installed (via `skills.lock` +
  `safety-reports/`) before internal use.

### 7. Out of Scope (Phase 1)
- A general skill crawler or central skill index/marketplace (large directories
  already exist — link out instead).
- A from-scratch cross-agent installer (reuse `getsuperpower`/Superpowers).
- Defining a new skill format (use the `SKILL.md` standard).
- Real-time skill execution or MCP server hosting.
- Advanced analytics on skill usage.
- Support for non-GitHub sources initially.

### 8. Success Metrics
- Adoption of boilerplates (stars/forks, `npx new` usage).
- Active contributions of boilerplates and vetted skills.
- Positive feedback on setup speed and *safety confidence* (the gate is the
  headline value).
- Regular vetted skill updates without security incidents.

### Phase 1 Scope Cut (recommended)
Drop the crawler/central index. Ship instead:
1. **Two boilerplates** (e.g., Next.js AI-first, FastAPI + React), each with a
   tiny, scanned skill set wired for all supported agents.
2. **SkillSpector CI gate** producing committed `safety-reports/` + a README
   badge.
3. **A thin CLI** — `new <boilerplate>` and `scan-project` — layered on
   `getsuperpower`/Superpowers.
4. **`skills.lock` provenance** for installed skills, with cross-agent install
   tests in CI.

### Next Steps for Implementation
1. Choose the upstream installer to build on (`getsuperpower` vs. Superpowers)
   and the CLI runtime (Node vs. Bun) to match it.
2. Implement the SkillSpector CI gate (SARIF output, threshold, committed
   reports, `skills.lock`).
3. Author the first two boilerplates with a small, vetted skill set.
4. Build the thin CLI (`new`, `scan-project`, `list-boilerplates`).
5. Document the security model and contribution process (including the scan gate).

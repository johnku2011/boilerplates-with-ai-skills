**Requirements Document: boilerplates-with-ai-skills**

**Version:** 1.0  
**Date:** July 2026  
**Author:** Grok (assisted)  
**Project Goal:** Create a GitHub repository that serves as a central hub for high-quality, ready-to-use project boilerplates enhanced with AI agent skills. The repo enables developers to quickly scaffold new projects optimized for AI coding assistants (Claude Code, Cursor, Codex CLI, etc.), with automated discovery, integration, and safety validation of the latest community and official skills.

### 1. Objectives
- Provide a collection of opinionated, production-ready boilerplates for common tech stacks (e.g., Next.js, FastAPI + React, Python data/AI apps, full-stack SaaS, etc.).
- Each boilerplate includes pre-configured AI agent support: `.claude/`, `.cursor/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`, `SKILL.md` patterns, hooks, rules, and sub-agent setups.
- Automate fetching and updating the latest relevant AI skills from trusted sources.
- Integrate safety scanning using NVIDIA SkillSpector to vet skills before inclusion or installation.
- Lower the barrier for developers to adopt agentic workflows securely and efficiently.

### 2. Key Features

#### 2.1 Boilerplate Structure
Each boilerplate directory should follow a consistent layout:
```
boilerplate-name/
├── README.md                  # Quick start, AI setup instructions
├── .github/                   # Workflows (CI, lint, agent-friendly PR checks)
├── .claude/                   # Skills, agents, hooks for Claude Code
├── .cursor/                   # Cursor rules/skills (migratable)
├── .codex/ or similar         # Support for other agents
├── CLAUDE.md / AGENTS.md      # Project steering files
├── SKILL.md examples          # Custom/project-specific skills
├── src/ / app/                # Core code
├── tests/                     # Pre-configured testing
├── docker-compose.yml         # Optional dev/prod setup
└── skills/                    # Bundled/curated skills for this stack
```

- Include templates for common patterns: TDD, code review, documentation generation, deployment, security scanning.
- Support progressive disclosure and context-efficient skill loading.

#### 2.2 Automated Skill Discovery & Update
- **Sources:** 
  - Official (Anthropic skills, etc.)
  - Curated repos (e.g., awesome lists, community collections for Claude/Cursor/Codex).
  - GitHub searches for high-star SKILL.md files or skill bundles.
- Mechanism: CI/CD workflow (GitHub Actions) that periodically:
  1. Discovers new/relevant skills via API or scripts.
  2. Downloads/clones candidates.
  3. Runs safety checks.
  4. Categorizes (e.g., by domain: testing, refactoring, PM, frontend, etc.).
  5. Updates a central `skills/` index or per-boilerplate bundles.
- Users can run a local CLI command (e.g., `npx boilerplates-with-ai-skills update-skills`) to pull latest into their project.

#### 2.3 Safety Validation with SkillSpector
- Mandatory integration with https://github.com/NVIDIA/SkillSpector.
- For every discovered skill:
  - Run `skillspector scan <path-or-url>` (support directory, Git URL, ZIP, single SKILL.md).
  - Capture risk score (0-100), SARIF report, findings (vulnerabilities like prompt injection, data exfiltration, excessive agency, etc.).
  - Threshold: Only include/ recommend skills below a configurable risk level (e.g., <30). Flag or quarantine higher-risk ones with warnings.
- Generate reports in repo: `safety-reports/` with summaries.
- Optional LLM-based semantic analysis (with `--no-llm` fallback).
- Documentation on how users can re-scan skills in their own projects.

#### 2.4 CLI / Tooling
- Provide an `npx` or global CLI for:
  - `new <boilerplate-name> [project-dir]` — Scaffold a new project with latest skills.
  - `update-skills` — Pull and validate latest skills.
  - `scan-project` — Run SkillSpector on current `.claude/skills/` etc.
  - `list-boilerplates` / `search-skills <keyword>`.
- Built with Node.js or Python for ease.

#### 2.5 Documentation & Onboarding
- Comprehensive root README with:
  - Quick start examples.
  - How skills work across Claude, Cursor, Codex, etc.
  - Best practices for creating/extending skills.
  - Security guidelines.
- Per-boilerplate docs.
- Contribution guide for new boilerplates/skills.
- Examples of skill usage (e.g., `/code-review`, custom workflows).

### 3. Non-Functional Requirements
- **Security:** All included skills must pass SkillSpector. Provide transparency via reports. No execution of unvetted code in CI.
- **Maintainability:** Modular structure. Automated tests for boilerplates (lint, build, basic agent interactions if feasible).
- **Performance:** Skills should be lightweight (context-efficient). Use YAML frontmatter for discovery/triggering.
- **Compatibility:** Cross-platform support for major AI coding tools (Claude Code, Cursor, Codex CLI, Gemini CLI, Copilot where applicable). Portable SKILL.md format.
- **Licensing:** MIT or Apache 2.0. Clearly attribute sources and require same for contributions.
- **Scalability:** Easy to add new boilerplates. Categorize by stack/domain (web, AI/ML, mobile, etc.).
- **Accessibility:** Beginner-friendly with advanced sections for power users.

### 4. Tech Stack Suggestions
- **Repo Management:** GitHub with Actions for automation.
- **CLI:** Node.js (for broad compatibility) or Python.
- **Scanning:** Integrate SkillSpector via subprocess or Docker.
- **Templating:** Use tools like `degit`, `cookiecutter`, or custom scripts.
- **Discovery:** GitHub API, optional semantic search.

### 5. User Personas & Use Cases
- **Solo Developer:** Quickly start a new AI-optimized project with safe skills pre-loaded.
- **Team Lead:** Standardize AI workflows across projects with vetted skills and safety reports.
- **AI Enthusiast:** Experiment with latest community skills safely.
- **Enterprise:** Audit and customize skill bundles before internal use.

### 6. Out of Scope (Phase 1)
- Full marketplace / hosting of skills (link to existing).
- Real-time skill execution or MCP server hosting.
- Advanced analytics on skill usage.
- Support for non-GitHub sources initially.

### 7. Success Metrics
- High GitHub stars/forks.
- Active contributions of boilerplates and skills.
- Positive feedback on speed of project setup and safety confidence.
- Regular automated skill updates without incidents.

### Next Steps for Implementation
1. Initialize repo with initial boilerplates (e.g., Next.js AI-first, Python FastAPI).
2. Implement SkillSpector integration in CI.
3. Build basic CLI.
4. Document skill contribution process.
5. Seed with popular safe skills from community sources.

This requirements document provides a solid foundation. You can expand it into a full spec or use it directly to guide development. Let me know if you need templates, sample boilerplate code, CLI stubs, or further refinements!

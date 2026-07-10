# node-service

Minimal Node.js (ESM) service starter, scaffolded by
[`boilerplates-with-ai-skills`](https://github.com/johnku2011/boilerplates-with-ai-skills).
It ships with AI-agent config and a curated, security-vetted skill set.

## Quick start

```bash
npm test      # zero-dependency tests via node:test
npm start     # prints a greeting
npm start Ada # prints "Hello, Ada!"
```

## AI agent skills

Curated skills were installed for your agents during scaffolding. A canonical
copy lives under `.bwai/skills/`, mirrored into each agent's skill directory
(e.g. `.claude/skills/`, `.cursor/rules/`). Provenance and scan status are
recorded in `skills.lock`.

Re-scan the skills at any time with the SkillSpector safety gate:

```bash
bwai scan-project
```

On GitHub, `.github/workflows/skill-scan.yml` runs the same gate on push and pull requests.

Reports are written to `safety-reports/`.

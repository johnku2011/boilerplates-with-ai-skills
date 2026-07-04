# AGENTS.md

## Cursor Cloud specific instructions

### Repository state (as of this writing)

This repository is currently **spec-only**. The only tracked source is
`requirements.md`, a planning document for a project named
`boilerplates-with-ai-skills`. There is **no application code, no package
manifest, no lockfile, no services, and no build/test/run tooling yet**.

Consequences for environment setup:

- There is nothing to install, lint, build, test, or run end to end. Any
  "run the app" request cannot be satisfied until an implementation exists.
- The implementation stack is intentionally undecided in `requirements.md`
  (the CLI is proposed as "Node.js or Python"). Do not assume a stack.
- The startup update script is intentionally a guarded no-op today: it only
  installs dependencies if a manifest appears later (`package.json` →
  `npm install`). Update it once a real stack and manifests are added.

### Available runtimes in the VM

The base image already provides (versions may drift over time):

- Node.js `v22.x` and npm `10.x`
- Python `3.12.x`

### When implementation begins

Once boilerplates / a CLI are added, update this file and the Cloud startup
update script to install the real dependencies (e.g. `npm install`, or
`pip install`/`uv sync` for a Python CLI), and document the lint/test/build/run
commands here.

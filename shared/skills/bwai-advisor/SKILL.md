---
name: bwai-advisor
description: "Use before scaffolding a bwai project — runs the full startup-goal workflow then recommends the right boilerplate and outputs the exact bwai new command to run."
---

# bwai Advisor

Use this skill when you have a product idea but haven't scaffolded yet. It runs
the full startup-goal workflow to shape your goal, then maps the output to the
right bwai boilerplate and gives you the exact command to run.

## Required Companion Skill

- `startup-goal` — runs first; the full intake loop, role subagents, and
  decision log are all startup-goal's responsibility. bwai-advisor adds only
  the final scaffold recommendation on top.

If `startup-goal` is unavailable, stop and tell the user to install both:

```bash
npx bwai-cli install-skill bwai-advisor --global
```

That command installs `bwai-advisor` and its companion `startup-goal` into the
user's global agent skill directories.

## Idea Document Input

If the user points at a markdown (or other) idea brief — via `@file.md`, a path,
or "read this doc" — treat that file as the starting hypothesis for
`startup-goal`:

1. Read the file before asking intake questions.
2. Skip questions the document already answers clearly.
3. Only ask about missing or ambiguous high-risk unknowns.

**Fast path:** if the user says the document is already an approved brief
(e.g. "treat this as the approved brief and recommend a boilerplate"), skip the
full startup-goal role bench and go straight to Scaffold Recommendation using
signals from the document.

## How to Run

1. Unless the user requested the fast path above, follow the `startup-goal`
   skill in full — intake loop, role subagents, decision log.
2. Once the decision log (or approved brief) is ready, continue to Scaffold
   Recommendation.

## Scaffold Recommendation

After the brief is ready, choose a boilerplate using **live catalog data when
available**, then fall back to the table below.

### Prefer live catalog

If the `bwai` / `bwai-cli` CLI is available, run:

```bash
bwai list-boilerplates
```

Use the printed names, stacks, and descriptions to pick the best match for the
goal. Prefer an exact catalog name over inventing a new one.

### Fallback mapping (when CLI is unavailable)

Pick the **first row that matches**:

| If the goal is… | Boilerplate |
| --- | --- |
| A web product that needs a UI — React, Next.js, full-stack | `nextjs-app` |
| A REST or HTTP API in Node where raw performance matters | `fastify-api` |
| A REST or HTTP API in Node where middleware and ecosystem matter | `express-api` |
| A Python service, data pipeline, ML endpoint, or FastAPI project | `python-service` |
| A mobile app targeting iOS and/or Android | `react-native-app` |
| A CLI tool, background worker, cron job, or pure Node service | `node-service` |

**If no row matches:** say so explicitly. Name the closest boilerplate and
explain what it covers and what it doesn't. Do not silently force a bad fit.

When useful, name one **alternative** boilerplate and when the user would
prefer it (e.g. API-only first vs full-stack UI).

## Output Format

Append this block at the end of the startup-goal decision log (or after the
fast-path brief summary):

---

### Recommended scaffold

**Boilerplate:** `<name>` — `<one-line reason tied to the goal>`

**Alternative (optional):** `<name>` — `<when to prefer this>`

**Command:**
```bash
bwai new <boilerplate-name> ./<project-folder> --agents claude,cursor
```

**Keep fresh:**
```bash
bwai sync-upstream   # pull latest omni-skills content into a scaffolded project
```

> Once scaffolded, the project includes `$startup-goal`, `$founding-engineer`,
> `$qa-lead`, `$cto`, and `$product-manager` — pick up where you left off
> using those skills inside your new project.

---

## Maintenance Note

The fallback mapping table is a last resort. Prefer `bwai list-boilerplates`.
Update the table when the catalog changes and the CLI is not the primary
source. The startup-goal workflow stays in the `startup-goal` skill and updates
via `bwai sync-upstream` / global reinstall.

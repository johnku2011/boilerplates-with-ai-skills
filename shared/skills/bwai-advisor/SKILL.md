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

## Mode Choice

At the start, pick a mode (ask once if unclear):

| Mode | When | What you run |
| --- | --- | --- |
| **Full** (default) | Idea is fuzzy; need PRD + roles | Full `startup-goal`, then scaffold recommendation |
| **Quick pick** | Stack/product type is already clear, or user asks only for a boilerplate | Skip role bench; recommend from signals + catalog |

Also use **Quick pick** when the user says the idea doc is an approved brief.

## Idea Document Input

If the user points at a markdown (or other) idea brief — via `@file.md`, a path,
or "read this doc" — treat that file as the starting hypothesis:

1. Read the file before asking intake questions.
2. Skip questions the document already answers clearly.
3. Only ask about missing or ambiguous high-risk unknowns.

## How to Run (Full mode)

1. Follow the `startup-goal` skill — intake loop, role subagents, decision log.
2. Once the decision log is ready, continue to Scaffold Recommendation.

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

### Confidence

Always state confidence for the primary pick:

| Confidence | Meaning |
| --- | --- |
| **High** | Stack and product shape match one boilerplate clearly |
| **Medium** | Two boilerplates could work; primary is a judgment call |
| **Low** | Partial fit or missing catalog option; say what is missing |

When confidence is Medium or Low, **always** include an Alternative with when
to prefer it (e.g. API-only first vs full-stack UI).

## Output Format

Append this block at the end of the decision log (or after the quick-pick summary):

---

### Recommended scaffold

**Mode:** Full | Quick pick

**Boilerplate:** `<name>` — `<one-line reason tied to the goal>`

**Confidence:** High | Medium | Low — `<one-line why>`

**Alternative:** `<name or "none">` — `<when to prefer this>`

**Command:**
```bash
bwai new <boilerplate-name> ./<project-folder> --agents claude,cursor
```

**After scaffold, continue with:**
```text
cd <project-folder>
$founding-engineer  implement the first slice from the decision log
$qa-lead            verify acceptance before calling the slice done
```

**Keep fresh:**
```bash
bwai sync-upstream   # pull latest omni-skills content into the project
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

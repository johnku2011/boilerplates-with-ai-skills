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

If `startup-goal` is unavailable, stop and tell the user to install it:
`bwai sync-skills`

## How to Run

1. Follow the `startup-goal` skill in full — intake loop, role subagents,
   decision log, all of it.
2. Once the startup-goal decision log is assembled, do not stop there.
   Continue to the Scaffold Recommendation step below.

## Scaffold Recommendation

After startup-goal completes, read the assembled decision log and map the
goal to one boilerplate using this table. Pick the **first row that matches**.

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

## Output Format

Append this block at the end of the startup-goal decision log:

---

### Recommended scaffold

**Boilerplate:** `<name>` — `<one-line reason tied to the goal>`

**Command:**
```bash
bwai new <boilerplate-name> ./<project-folder> --agents claude,cursor
```

**Keep fresh:**
```bash
bwai sync-upstream   # pull latest omni-skills content
```

> Once scaffolded, the project includes `$startup-goal`, `$founding-engineer`,
> `$qa-lead`, `$cto`, and `$product-manager` — pick up where you left off
> using those skills inside your new project.

---

## Maintenance Note

The boilerplate mapping table above is maintained in this file. Update it
whenever a new boilerplate is added to the catalog (`bwai list-boilerplates`
is the source of truth). The startup-goal workflow logic stays in the
`startup-goal` skill and updates independently via `bwai sync-upstream`.

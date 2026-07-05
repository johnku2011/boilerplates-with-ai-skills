---
name: bwai-security-gate
description: Run the SkillSpector safety gate on this project's installed skills before merge or release.
---

# bwai Security Gate

Run the SkillSpector gate on every skill installed in this project.

## Command

From the project root:

```bash
bwai scan-project . --threshold 50 --require-scanner
```

If SkillSpector is not installed:

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

## Pass criteria

- Exit code **0** — all skills at or below the risk threshold
- Review `safety-reports/` (JSON + SARIF when available)
- `skills.lock` updated with scan status per skill

## On failure

Do not merge or release until risk scores are understood and remediated, or the
user explicitly accepts the risk with documented rationale.

If skills were edited during delivery, re-scan before closing the workflow.

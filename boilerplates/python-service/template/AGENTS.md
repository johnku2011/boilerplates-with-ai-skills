# AGENTS.md

Guidance for AI coding agents working in this Python (FastAPI) project.

## Commands

- `pip install -r requirements.txt` — install dependencies.
- `pytest` — run the test suite.
- `uvicorn app.main:app --reload` — local dev server (port 8000).

## Conventions

- Python 3.11+ with type hints on public functions.
- Export `create_app()` from `app/main.py`; tests use `TestClient(create_app())`.
- Add a pytest case for each new route or behavior.

## Skills

Curated skills live under `.bwai/skills/`. Prefer `python-api-design`,
`test-driven-development`, and `project-security`; re-validate with
`bwai scan-project`.

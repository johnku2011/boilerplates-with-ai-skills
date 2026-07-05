# python-service

Minimal FastAPI + pytest starter with AI agent skills pre-wired.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload
```

## Layout

- `app/main.py` — `create_app()` factory
- `tests/` — pytest with `TestClient`
- `requirements.txt` — dependencies

Skills are installed under `.bwai/skills/` when scaffolded with `bwai new`.

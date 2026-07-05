---
name: python-api-design
description: Use when adding or changing FastAPI routes, dependencies, or tests in this Python service — keep endpoints typed, validated, and covered by pytest.
---

# Python API Design (FastAPI)

## Overview

Keep the FastAPI app small and testable. Build with `create_app()` so pytest can
use `TestClient` without starting a real server on a fixed port.

## Process

1. Register routes on the app from `create_app()` in `app/main.py`.
2. Use Pydantic models for request/response bodies when shapes matter.
3. Return correct status codes; use `HTTPException` for client errors.
4. Add a pytest case for each new route or behavior change.
5. Run `pytest` before claiming completion.

## Project Layout

- `app/main.py` — `create_app()` factory and route definitions
- `tests/` — pytest tests using `fastapi.testclient.TestClient`
- `requirements.txt` — pinned runtime + test dependencies

## Testing

```python
from fastapi.testclient import TestClient
from app.main import create_app

def test_health():
    client = TestClient(create_app())
    assert client.get("/api/health").json() == {"status": "ok"}
```

## Guidelines

- Type hints on route functions and shared helpers.
- Secrets from environment variables (`os.environ`), never hardcoded.
- Keep route handlers thin; extract logic to pure functions when non-trivial.
- Prefer dependency injection for DB sessions and auth when the app grows.

## Anti-patterns

- Business logic embedded directly in route decorators without tests.
- Returning raw exception strings to clients in production.
- Skipping tests because "FastAPI validates for us" — test behavior, not just schemas.

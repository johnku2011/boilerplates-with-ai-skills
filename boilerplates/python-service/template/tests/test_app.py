from fastapi.testclient import TestClient

from app.main import create_app


def test_root():
    client = TestClient(create_app())
    response = client.get("/")
    assert response.status_code == 200
    assert "python-service" in response.json()["message"]


def test_health():
    client = TestClient(create_app())
    assert client.get("/api/health").json() == {"status": "ok"}


def test_echo():
    client = TestClient(create_app())
    response = client.post("/api/echo", json={"hello": "world"})
    assert response.json() == {"youSent": {"hello": "world"}}

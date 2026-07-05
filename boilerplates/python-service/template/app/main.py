"""FastAPI application factory."""

from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="python-service")

    @app.get("/")
    def root() -> dict[str, str]:
        return {"message": "Hello from python-service!"}

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/echo")
    def echo(body: dict | None = None) -> dict:
        return {"youSent": body}

    return app


app = create_app()

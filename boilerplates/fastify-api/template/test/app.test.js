import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

async function withServer(fn) {
  const app = await createApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    await fn(port);
  } finally {
    await app.close();
  }
}

test("GET / returns a greeting", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.message, /Hello from fastify-api/);
  });
});

test("GET /api/health returns ok", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });
});

test("POST /api/echo echoes the JSON body", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    assert.deepEqual(await res.json(), { youSent: { hello: "world" } });
  });
});

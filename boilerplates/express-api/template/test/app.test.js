import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

/**
 * Start the app on an ephemeral port, run `fn(port)`, then close.
 * @param {(port: number) => Promise<void>} fn
 */
async function withServer(fn) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    await fn(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET / returns a greeting", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Hello from express-api/);
  });
});

test("GET /api/health returns ok", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });
});

test("POST /api/echo echoes the JSON body", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://localhost:${port}/api/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    assert.deepEqual(await res.json(), { youSent: { hello: "world" } });
  });
});

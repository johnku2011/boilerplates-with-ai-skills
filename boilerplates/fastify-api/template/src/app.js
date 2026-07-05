import Fastify from "fastify";

/**
 * Build the Fastify application. Exported separately from the server so tests
 * can inject it without binding a fixed port.
 * @returns {import('fastify').FastifyInstance}
 */
export async function createApp() {
  const app = Fastify({ logger: false });

  app.get("/", async () => {
    return { message: "Hello from fastify-api!" };
  });

  app.get("/api/health", async () => {
    return { status: "ok" };
  });

  app.post("/api/echo", async (request) => {
    return { youSent: request.body ?? null };
  });

  return app;
}

export default createApp;

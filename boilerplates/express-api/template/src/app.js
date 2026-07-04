import express from "express";

/**
 * Build the Express application. Exported separately from the server so tests
 * can mount it without binding a fixed port.
 * @returns {import("express").Express}
 */
export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send("Hello from express-api!");
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/echo", (req, res) => {
    res.json({ youSent: req.body ?? null });
  });

  return app;
}

export default createApp;

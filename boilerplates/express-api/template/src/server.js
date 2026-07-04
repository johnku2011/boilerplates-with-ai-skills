import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

createApp().listen(port, () => {
  console.log(`express-api listening on http://localhost:${port}`);
});

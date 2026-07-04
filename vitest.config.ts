import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Boilerplate templates ship their own `node:test` suites; they are not
    // part of this package's vitest run.
    exclude: ["node_modules/**", "dist/**", "boilerplates/**"],
  },
});

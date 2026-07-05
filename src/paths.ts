import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Resolve the package root regardless of whether we run from `src/` (dev/tests
 * via tsx/vitest) or from the bundled `dist/cli.js`. In both cases the running
 * module lives one directory below the package root.
 */
export function packageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
}

export function defaultBoilerplatesDir(): string {
  return resolve(packageRoot(), "boilerplates");
}

export function defaultSharedSkillsDir(): string {
  return resolve(packageRoot(), "shared", "skills");
}

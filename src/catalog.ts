import { defaultBoilerplatesDir } from "./paths.js";
import {
  assertValidCatalog,
  loadCatalogSnapshot,
  type CatalogBoilerplate,
} from "./catalog-snapshot.js";

export type Boilerplate = CatalogBoilerplate;

export async function listBoilerplates(
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<Boilerplate[]> {
  const snapshot = await loadCatalogSnapshot({ boilerplatesDir });
  assertValidCatalog(snapshot);
  return [...snapshot.boilerplates];
}

export async function getBoilerplate(
  name: string,
  boilerplatesDir = defaultBoilerplatesDir(),
): Promise<Boilerplate> {
  const snapshot = await loadCatalogSnapshot({ boilerplatesDir });
  assertValidCatalog(snapshot);
  const match = snapshot.boilerplates.find((boilerplate) => boilerplate.manifest.name === name);
  if (!match) {
    const available =
      snapshot.boilerplates.map((boilerplate) => boilerplate.manifest.name).join(", ") || "(none)";
    throw new Error(`Unknown boilerplate: "${name}". Available: ${available}.`);
  }
  return match;
}

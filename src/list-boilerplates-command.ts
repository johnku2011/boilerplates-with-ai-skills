import {
  CatalogValidationError,
  formatCatalogError,
  type CatalogBoilerplate,
  type CatalogSnapshot,
} from "./catalog-snapshot.js";

export interface ListBoilerplatesIo {
  loadSnapshot: () => Promise<CatalogSnapshot>;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

function renderBoilerplate(boilerplate: CatalogBoilerplate, write: (line: string) => void): void {
  write(`${boilerplate.manifest.name}  (${boilerplate.manifest.stack})`);
  write(`  ${boilerplate.manifest.description}`);
  write(`  skills: ${boilerplate.skills.map((skill) => skill.name).join(", ") || "(none)"}`);
  if (boilerplate.manifest.workflow) {
    write(
      `  workflow: ${boilerplate.manifest.workflow.source}:${boilerplate.manifest.workflow.name}`,
    );
  }
  write(`  default agents: ${boilerplate.manifest.defaultAgents.join(", ")}`);
}

export async function runListBoilerplates(io: ListBoilerplatesIo): Promise<0 | 1> {
  const snapshot = await io.loadSnapshot();
  if (snapshot.boilerplates.length === 0) io.stdout("No boilerplates found.");
  for (const boilerplate of snapshot.boilerplates) renderBoilerplate(boilerplate, io.stdout);
  for (const line of formatCatalogError(new CatalogValidationError(snapshot.diagnostics))) {
    io.stderr(line);
  }
  return snapshot.valid ? 0 : 1;
}

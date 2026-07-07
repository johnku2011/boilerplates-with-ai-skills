import { join } from "node:path";
import { stat } from "node:fs/promises";
import type { BoilerplateManifest } from "./schema.js";
import { defaultSharedWorkflowsDir } from "./paths.js";

export type WorkflowRef = NonNullable<BoilerplateManifest["workflow"]>;

export interface WorkflowCatalogPaths {
  boilerplateName: string;
  boilerplateDir: string;
  sharedWorkflowsDir?: string;
}

/**
 * Resolve the on-disk directory for a workflow declared in boilerplate.json.
 * `local` → boilerplates/<name>/workflow/<workflow>
 * `shared` → shared/workflows/<workflow>
 */
export function resolveWorkflowDirectory(
  workflow: WorkflowRef,
  paths: WorkflowCatalogPaths,
): string {
  const sharedDir = paths.sharedWorkflowsDir ?? defaultSharedWorkflowsDir();
  if (workflow.source === "shared") {
    return join(sharedDir, workflow.name);
  }
  return join(paths.boilerplateDir, "workflow", workflow.name);
}

export async function assertWorkflowExists(
  workflowDir: string,
  workflowName: string,
): Promise<void> {
  const workflowJson = join(workflowDir, "workflow.json");
  try {
    await stat(workflowJson);
  } catch {
    throw new Error(`Workflow not found: ${workflowName} (expected ${workflowJson})`);
  }
}

export function workflowAgentsSnippet(workflowName: string, workflowPath: string): string {
  return `

## GetSuperpower workflow

This boilerplate includes \`${workflowPath}/\` — a [GetSuperpower](https://github.com/0xroylee/getsuperpower) delivery workflow (shape → plan → implement → review → security gate).

\`\`\`bash
npx getsuperpower install ./${workflowPath} --agents claude,cursor
\`\`\`

Restart your agent after install. Planning steps use Superpowers skills; implementation uses the bwai skills under \`.bwai/skills/\`.
`;
}

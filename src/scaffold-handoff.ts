/**
 * Post-scaffold next-step copy for `bwai new`.
 * Keeps the CLI action thin and unit-testable.
 */

export interface ScaffoldHandoffInput {
  /** Relative or user-facing directory shown in `cd` hints. */
  dir: string;
  skills: string[];
  agents: string[];
  workflowPath?: string;
}

/** Lines printed after a successful scaffold (excluding the blank separator). */
export function formatScaffoldHandoff(input: ScaffoldHandoffInput): string[] {
  const lines: string[] = ["Next steps:"];
  lines.push(`  cd ${input.dir}`);

  if (input.workflowPath) {
    lines.push(
      `  npx getsuperpower install ./${input.workflowPath} --agents ${input.agents.join(",")}`,
    );
  }

  lines.push(`  bwai scan-project        # run the SkillSpector safety gate`);

  const hasOmni = ["startup-goal", "founding-engineer", "qa-lead"].every((s) =>
    input.skills.includes(s),
  );
  if (hasOmni) {
    lines.push("");
    lines.push("Continue in your agent (inside the new project):");
    lines.push("  $founding-engineer  implement the first slice from your brief / decision log");
    lines.push("  $qa-lead            verify acceptance before calling the slice done");
    if (input.skills.includes("startup-goal")) {
      lines.push("  $startup-goal       resume the full role workflow if scope is still open");
    }
  }

  return lines;
}

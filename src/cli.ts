import { Command } from "commander";
import { resolve } from "node:path";
import { listBoilerplates } from "./catalog.js";
import { scaffold } from "./scaffold.js";
import { parseAgents, type AgentId } from "./agents.js";
import { scanProject, SkillSpectorScanner } from "./scan.js";
import { getBoilerplate } from "./catalog.js";

const program = new Command();

program
  .name("bwai")
  .description(
    "boilerplates-with-ai-skills: scaffold projects pre-wired with curated, " +
      "security-vetted, cross-agent AI skills.",
  )
  .version("0.1.0");

program
  .command("list-boilerplates")
  .alias("list")
  .description("List available boilerplates in the catalog.")
  .action(async () => {
    const boilerplates = await listBoilerplates();
    if (boilerplates.length === 0) {
      console.log("No boilerplates found.");
      return;
    }
    for (const b of boilerplates) {
      console.log(`${b.manifest.name}  (${b.manifest.stack})`);
      console.log(`  ${b.manifest.description}`);
      console.log(`  skills: ${b.manifest.skills.map((s) => s.name).join(", ") || "(none)"}`);
      console.log(`  default agents: ${b.manifest.defaultAgents.join(", ")}`);
    }
  });

program
  .command("new")
  .argument("<boilerplate>", "boilerplate name (see list-boilerplates)")
  .argument("[dir]", "target directory for the new project", ".")
  .option(
    "-a, --agents <agents>",
    "comma-separated agents to wire skills for (claude,cursor,codex,copilot,opencode)",
  )
  .description("Scaffold a new project with its curated, cross-agent skill set.")
  .action(async (boilerplateName: string, dir: string, opts: { agents?: string }) => {
    const boilerplate = await getBoilerplate(boilerplateName);
    const agents: AgentId[] = parseAgents(
      opts.agents,
      boilerplate.manifest.defaultAgents as AgentId[],
    );
    const targetDir = resolve(process.cwd(), dir);

    const result = await scaffold({ boilerplateName, targetDir, agents });

    console.log(`Created project: ${result.targetDir}`);
    console.log(`Boilerplate: ${result.boilerplate}`);
    console.log(`Agents wired: ${result.agents.join(", ")}`);
    console.log(`Skills installed: ${result.skills.join(", ") || "(none)"}`);
    console.log(`Provenance: skills.lock`);
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${dir}`);
    console.log(`  bwai scan-project        # run the SkillSpector safety gate`);
  });

program
  .command("scan-project")
  .alias("scan")
  .argument("[dir]", "project directory to scan", ".")
  .option("-t, --threshold <n>", "max allowed risk score (0-100)", "50")
  .option("--llm", "enable SkillSpector LLM semantic analysis", false)
  .option("--require-scanner", "fail if the SkillSpector CLI is not installed", false)
  .description("Run the SkillSpector safety gate on the project's installed skills.")
  .action(
    async (dir: string, opts: { threshold: string; llm: boolean; requireScanner: boolean }) => {
      const projectDir = resolve(process.cwd(), dir);
      const threshold = Number.parseInt(opts.threshold, 10);
      if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
        throw new Error(`Invalid --threshold: ${opts.threshold} (expected 0-100).`);
      }

      const report = await scanProject({
        projectDir,
        scanner: new SkillSpectorScanner(),
        threshold,
        useLlm: opts.llm,
        requireScanner: opts.requireScanner,
      });

      if (!report.scannerAvailable) {
        console.log(
          "SkillSpector not found on PATH; skills were recorded as 'skipped'. " +
            "Install with `pip install skillspector` for a real scan.",
        );
      }
      for (const r of report.results) {
        console.log(
          `${r.name}: ${r.status}${r.riskScore === null ? "" : ` (risk ${r.riskScore})`}`,
        );
      }
      console.log(`Reports: ${report.reportsDir}`);

      if (!report.passed) {
        console.error(`Safety gate FAILED: a skill exceeded threshold ${report.threshold}.`);
        process.exitCode = 1;
      } else {
        console.log(`Safety gate passed (threshold ${report.threshold}).`);
      }
    },
  );

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});

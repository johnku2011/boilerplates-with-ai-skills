import { Command } from "commander";
import { resolve } from "node:path";
import { listBoilerplates } from "./catalog.js";
import { scaffold } from "./scaffold.js";
import { parseAgents, type AgentId } from "./agents.js";
import { scanCatalog } from "./catalog-scan.js";
import { scanProject, SkillSpectorScanner } from "./scan.js";
import { getBoilerplate } from "./catalog.js";
import {
  GitHubSkillSource,
  SkillsMpSkillSource,
  searchSkills,
  type SkillSource,
  type SortOrder,
} from "./discovery.js";

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
  .command("scan-catalog")
  .description("Scan all shared and boilerplate-local skills in the repo catalog")
  .option("--threshold <n>", "Maximum acceptable risk score", "30")
  .option("--require-scanner", "Fail if SkillSpector is not installed", false)
  .option("--llm", "Enable LLM-assisted scanning when supported", false)
  .action(async (options: { threshold: string; requireScanner?: boolean; llm?: boolean }) => {
    try {
      const result = await scanCatalog({
        scanner: new SkillSpectorScanner(),
        threshold: Number(options.threshold),
        requireScanner: Boolean(options.requireScanner),
        useLlm: Boolean(options.llm),
      });
      console.log(`Catalog scan complete. Reports: ${result.reportsDir}`);
      console.log(`Skills scanned: ${result.results.length}`);
      console.log(`Passed: ${result.passed ? "yes" : "no"}`);
      if (!result.passed) process.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
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
            "Install with `uv tool install git+https://github.com/NVIDIA/skillspector.git`.",
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

program
  .command("search-skills")
  .alias("search")
  .argument("[query]", "keyword to search for (e.g. testing, security)", "")
  .option("-s, --source <source>", "github | skillsmp | all", "all")
  .option("-l, --limit <n>", "max results", "10")
  .option("--sort <order>", "recent | stars", "recent")
  .option("--scan <n>", "scan the top N results with SkillSpector and show risk scores", "0")
  .description("Discover recently-updated agent skills from public hubs.")
  .action(
    async (query: string, opts: { source: string; limit: string; sort: string; scan: string }) => {
      const limit = Number.parseInt(opts.limit, 10);
      const scanTop = Number.parseInt(opts.scan, 10) || 0;
      const sort: SortOrder = opts.sort === "stars" ? "stars" : "recent";

      const sources: SkillSource[] = [];
      if (opts.source === "all" || opts.source === "github") {
        sources.push(new GitHubSkillSource());
      }
      if (opts.source === "all" || opts.source === "skillsmp") {
        sources.push(new SkillsMpSkillSource());
      }
      if (sources.length === 0) {
        throw new Error(`Invalid --source: ${opts.source} (expected github, skillsmp, or all).`);
      }

      const { candidates, errors } = await searchSkills(sources, query, {
        sort,
        limit: Number.isNaN(limit) ? 10 : limit,
      });

      for (const err of errors) {
        console.error(`[${err.source}] ${err.message}`);
      }
      if (candidates.length === 0) {
        console.log("No skills found.");
        return;
      }

      const scanner = new SkillSpectorScanner();
      const scannerReady = scanTop > 0 ? await scanner.isAvailable() : false;
      if (scanTop > 0 && !scannerReady) {
        console.error(
          "SkillSpector not found on PATH; showing results without risk scores. " +
            "Install with `uv tool install git+https://github.com/NVIDIA/skillspector.git`.",
        );
      }

      let index = 0;
      for (const c of candidates) {
        index += 1;
        const updated = c.updatedAt ? c.updatedAt.slice(0, 10) : "unknown";
        console.log(`${index}. ${c.fullName}  [${c.source}]  ★${c.stars}  updated ${updated}`);
        if (c.description) console.log(`   ${c.description.slice(0, 100)}`);
        console.log(`   ${c.url}`);
        if (scannerReady && index <= scanTop && c.url) {
          try {
            const result = await scanner.scan(c.url, { useLlm: false });
            const verdict = result.riskScore > 50 ? "HIGH RISK" : "ok";
            console.log(
              `   SkillSpector: risk ${result.riskScore} (${verdict}), ${result.findings} finding(s)`,
            );
          } catch (e) {
            console.log(`   SkillSpector: scan failed (${e instanceof Error ? e.message : e})`);
          }
        }
      }
    },
  );

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});

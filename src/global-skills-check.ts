import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { GLOBAL_AGENT_TARGETS } from "./install-skill.js";
import type { AgentId } from "./agents.js";
import type { DoctorCheck } from "./doctor.js";

const ADVISOR_SKILLS = ["bwai-advisor", "startup-goal"] as const;

async function pathReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export interface GlobalSkillsCheckOptions {
  homeDir?: string;
  /** Agents whose global skill dirs to inspect. Default: claude, cursor. */
  agents?: AgentId[];
}

/**
 * Warn when global bwai-advisor / startup-goal are missing for common agents.
 * Never fails doctor — global install is optional until the user wants advisor.
 */
export async function checkGlobalAdvisorSkills(
  opts: GlobalSkillsCheckOptions = {},
): Promise<DoctorCheck> {
  const homeDir = opts.homeDir ?? homedir();
  const agents: AgentId[] = opts.agents ?? ["claude", "cursor"];

  const missing: string[] = [];
  const present: string[] = [];

  for (const agent of agents) {
    const root = join(homeDir, GLOBAL_AGENT_TARGETS[agent]);
    for (const skill of ADVISOR_SKILLS) {
      const skillMd = join(root, skill, "SKILL.md");
      const label = `${skill} (${agent})`;
      if (await pathReadable(skillMd)) {
        present.push(label);
      } else {
        missing.push(label);
      }
    }
  }

  if (missing.length === 0) {
    return {
      name: "global-advisor",
      status: "ok",
      message: `Global advisor skills installed (${present.join(", ")})`,
    };
  }

  if (present.length === 0) {
    return {
      name: "global-advisor",
      status: "warn",
      message:
        "bwai-advisor / startup-goal not installed globally — run `bwai install-skill bwai-advisor --global` to use $bwai-advisor in any chat",
    };
  }

  return {
    name: "global-advisor",
    status: "warn",
    message: `Partial global install — missing: ${missing.join(", ")}. Fix: bwai install-skill bwai-advisor --global`,
  };
}

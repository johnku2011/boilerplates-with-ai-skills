export const AGENT_TARGETS = {
  claude: ".claude/skills",
  cursor: ".cursor/rules",
  codex: ".codex/skills",
  copilot: ".agents/skills",
  opencode: ".agents/skills",
} as const;

export type AgentId = keyof typeof AGENT_TARGETS;

export const KNOWN_AGENTS = Object.keys(AGENT_TARGETS) as AgentId[];

export function isAgentId(value: string): value is AgentId {
  return Object.prototype.hasOwnProperty.call(AGENT_TARGETS, value);
}

/**
 * Parse a comma-separated `--agents` value into a validated, de-duplicated list.
 * Falls back to the provided defaults when input is empty.
 */
export function parseAgents(input: string | undefined, defaults: AgentId[]): AgentId[] {
  if (!input || input.trim() === "") {
    return dedupe(defaults);
  }
  const parsed = input
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);

  const unknown = parsed.filter((a) => !isAgentId(a));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown agent(s): ${unknown.join(", ")}. Known agents: ${KNOWN_AGENTS.join(", ")}.`,
    );
  }
  return dedupe(parsed as AgentId[]);
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

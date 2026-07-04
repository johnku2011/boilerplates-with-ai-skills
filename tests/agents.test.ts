import { describe, it, expect } from "vitest";
import { parseAgents } from "../src/agents.js";

describe("parseAgents", () => {
  it("returns defaults when input is empty", () => {
    expect(parseAgents(undefined, ["claude", "cursor"])).toEqual(["claude", "cursor"]);
    expect(parseAgents("", ["claude"])).toEqual(["claude"]);
  });

  it("parses, lowercases, trims, and dedupes", () => {
    expect(parseAgents(" Claude , cursor,claude ", ["codex"])).toEqual(["claude", "cursor"]);
  });

  it("throws on unknown agents", () => {
    expect(() => parseAgents("claude,bogus", ["claude"])).toThrow(/Unknown agent/);
  });
});

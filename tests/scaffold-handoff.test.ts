import { describe, it, expect } from "vitest";
import { formatScaffoldHandoff } from "../src/scaffold-handoff.js";

describe("formatScaffoldHandoff", () => {
  it("includes omni-skills continue hints when role skills are present", () => {
    const lines = formatScaffoldHandoff({
      dir: "./my-app",
      agents: ["claude", "cursor"],
      skills: [
        "test-driven-development",
        "startup-goal",
        "founding-engineer",
        "qa-lead",
        "cto",
        "product-manager",
      ],
      workflowPath: "workflows/bwai-delivery",
    });

    expect(lines.join("\n")).toContain("cd ./my-app");
    expect(lines.join("\n")).toContain("npx getsuperpower install ./workflows/bwai-delivery");
    expect(lines.join("\n")).toContain("$founding-engineer");
    expect(lines.join("\n")).toContain("$qa-lead");
    expect(lines.join("\n")).toContain("$startup-goal");
  });

  it("omits continue hints when omni role skills are absent", () => {
    const lines = formatScaffoldHandoff({
      dir: "./api",
      agents: ["claude"],
      skills: ["express-api-design", "project-security"],
    });

    expect(lines.join("\n")).not.toContain("$founding-engineer");
    expect(lines.join("\n")).toContain("bwai scan-project");
  });
});

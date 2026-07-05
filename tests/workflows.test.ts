import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { defaultSharedWorkflowsDir } from "../src/paths.js";
import {
  assertWorkflowExists,
  resolveWorkflowDirectory,
} from "../src/workflows.js";

describe("workflows", () => {
  it("resolves shared workflow directory", () => {
    const dir = resolveWorkflowDirectory(
      { name: "bwai-delivery", source: "shared" },
      { boilerplateName: "nextjs-app", boilerplateDir: "/tmp/bp" },
    );
    expect(dir).toBe(join(defaultSharedWorkflowsDir(), "bwai-delivery"));
  });

  it("resolves local workflow directory", () => {
    const dir = resolveWorkflowDirectory(
      { name: "nextjs-delivery", source: "local" },
      { boilerplateName: "nextjs-app", boilerplateDir: "/tmp/boilerplates/nextjs-app" },
    );
    expect(dir).toBe("/tmp/boilerplates/nextjs-app/workflow/nextjs-delivery");
  });

  it("assertWorkflowExists passes for bwai-delivery", async () => {
    const dir = join(defaultSharedWorkflowsDir(), "bwai-delivery");
    await expect(assertWorkflowExists(dir, "bwai-delivery")).resolves.toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { listBoilerplates, getBoilerplate } from "../src/catalog.js";

describe("catalog", () => {
  it("discovers the node-service boilerplate", async () => {
    const all = await listBoilerplates();
    const names = all.map((b) => b.manifest.name);
    expect(names).toContain("node-service");
  });

  it("loads a valid manifest with skills", async () => {
    const b = await getBoilerplate("node-service");
    expect(b.manifest.stack).toBe("node-esm");
    expect(b.manifest.skills.map((s) => s.name)).toEqual([
      "test-driven-development",
      "code-review",
    ]);
  });

  it("throws for an unknown boilerplate", async () => {
    await expect(getBoilerplate("does-not-exist")).rejects.toThrow(/Unknown boilerplate/);
  });
});

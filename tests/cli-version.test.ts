import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

const execFileAsync = promisify(execFile);

describe("CLI version", () => {
  it("matches the published package version", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "src/cli.ts", "--version"],
      { cwd: process.cwd() },
    );

    expect(stdout.trim()).toBe(packageJson.version);
  });
});

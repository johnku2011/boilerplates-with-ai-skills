import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

/** Mirror the tool schema so tests do not import the TS AI SDK module graph. */
const weatherParams = z.object({
  city: z.string().min(1),
});

describe("demo weather tool schema", () => {
  it("accepts a city name", () => {
    const parsed = weatherParams.parse({ city: "Lisbon" });
    assert.equal(parsed.city, "Lisbon");
  });

  it("rejects an empty city", () => {
    assert.throws(() => weatherParams.parse({ city: "" }));
  });
});

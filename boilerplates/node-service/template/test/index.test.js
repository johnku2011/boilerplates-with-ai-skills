import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/index.js";

test("greets a provided name", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});

test("falls back to world when empty", () => {
  assert.equal(greet(""), "Hello, world!");
  assert.equal(greet(undefined), "Hello, world!");
});

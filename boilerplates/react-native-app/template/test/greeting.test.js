import test from "node:test";
import assert from "node:assert/strict";
import { greeting } from "../src/greeting.js";

test("greets a provided name", () => {
  assert.equal(greeting("Ada"), "Hello, Ada!");
});

test("falls back to world when empty", () => {
  assert.equal(greeting(""), "Hello, world!");
  assert.equal(greeting(undefined), "Hello, world!");
});

/**
 * Pure greeting helper — unit tested with node:test (no native test runner required).
 * @param {string | undefined} [name]
 * @returns {string}
 */
export function greeting(name) {
  const trimmed = (name ?? "").trim();
  return `Hello, ${trimmed.length > 0 ? trimmed : "world"}!`;
}

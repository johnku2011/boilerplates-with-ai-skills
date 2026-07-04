/**
 * Minimal domain function for the starter. Replace with your service logic.
 * @param {string} name
 * @returns {string}
 */
export function greet(name) {
  const trimmed = (name ?? "").trim();
  return `Hello, ${trimmed.length > 0 ? trimmed : "world"}!`;
}

// Allow `npm start` to print a friendly message.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(greet(process.argv[2]));
}

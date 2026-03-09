#!/usr/bin/env node
/* global console, process */

let hasFailure = false;

try {
  const module = await import("better-sqlite3");
  const Database = module.default;
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.close();
} catch (error) {
  hasFailure = true;
  const reason = error instanceof Error ? error.message : String(error);
  console.error("[native-check] Failed to initialize better-sqlite3.");
  console.error(`[native-check] ${reason}`);
}

if (hasFailure) {
  console.error(
    "[native-check] Run `npm rebuild better-sqlite3` (or reinstall dependencies with the current Node.js version) before building or starting production.",
  );
  process.exit(1);
}

console.log("[native-check] Native modules look healthy.");

#!/usr/bin/env node
/* global console, process */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const TESTS_DIR = path.resolve(process.cwd(), "src/tests");
const DB_OPTIONAL_TEST_FILES = new Set([
  "finance-email-routing.test.ts",
  "google-oauth-domain.test.ts",
  "import-template-generation.test.ts",
  "online-training-separation.test.ts",
  "training-participant-import-helpers.test.ts",
]);

function collectTestFiles() {
  if (!fs.existsSync(TESTS_DIR)) {
    throw new Error(`Test directory does not exist: ${TESTS_DIR}`);
  }
  return fs
    .readdirSync(TESTS_DIR)
    .filter((file) => file.endsWith(".test.ts"))
    .sort()
    .map((file) => path.posix.join("src/tests", file));
}

function hasDatabaseUrl() {
  return (process.env.DATABASE_URL ?? "").trim().length > 0;
}

function resolveMode(arg) {
  const normalized = (arg ?? "auto").trim().toLowerCase();
  if (normalized === "auto" || normalized === "postgres") {
    return normalized;
  }
  throw new Error(`Unsupported test suite mode: ${arg}`);
}

function runTscTests(files) {
  const result = spawnSync("tsx", ["--test", ...files], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  process.exit(typeof result.status === "number" ? result.status : 1);
}

const mode = resolveMode(process.argv[2]);
const dbConfigured = hasDatabaseUrl();
const allTests = collectTestFiles();
const dbOptionalTests = allTests.filter((file) =>
  DB_OPTIONAL_TEST_FILES.has(path.basename(file)),
);

if (mode === "postgres" && !dbConfigured) {
  console.error("[tests] DATABASE_URL is required for postgres test suite mode.");
  process.exit(1);
}

if (mode === "auto" && !dbConfigured) {
  console.log(
    `[tests] DATABASE_URL is not configured. Running DB-optional tests only (${dbOptionalTests.length}/${allTests.length} files).`,
  );
  runTscTests(dbOptionalTests);
}

console.log(`[tests] Running full test suite (${allTests.length} files).`);
runTscTests(allTests);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import db from "../lib/db";
import { assertPostgres, isPostgresDatabaseUrl, isSqliteDatabaseUrl } from "../lib/assertPostgres";

const REPO_ROOT = path.resolve(process.cwd());

function listFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".next" || entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full));
      continue;
    }
    files.push(full);
  }
  return files;
}

test("assertPostgres rejects missing DATABASE_URL", () => {
  assert.throws(() => assertPostgres(""), /DATABASE_URL is not configured/);
});

test("assertPostgres rejects sqlite and file URLs", () => {
  assert.equal(isSqliteDatabaseUrl("file:./data/app.db"), true);
  assert.equal(isSqliteDatabaseUrl("sqlite:///tmp/app.db"), true);
  assert.throws(() => assertPostgres("file:./data/app.db"), /SQLite detected/);
  assert.throws(() => assertPostgres("sqlite:///tmp/app.db"), /SQLite detected/);
});

test("assertPostgres accepts postgres URLs", () => {
  const url = "postgresql://reader:secret@example.com:5432/orbf";
  assert.equal(isPostgresDatabaseUrl(url), true);
  assert.equal(assertPostgres(url), url);
});

test("db singleton stays stable within one runtime", async () => {
  const imported = await import("../lib/db");
  assert.equal(imported.default, db);
});

test("app code imports service modules instead of legacy db entry points", () => {
  const files = listFiles(path.join(REPO_ROOT, "src"));
  const offenders: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
      continue;
    }
    const normalized = file.replaceAll(path.sep, "/");
    if (normalized.startsWith(path.join(REPO_ROOT, "src/services").replaceAll(path.sep, "/"))) {
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    if (
      /from\s+["']@\/lib\/db["']/.test(text) ||
      /from\s+["']@\/lib\/blog-db["']/.test(text) ||
      /from\s+["']@\/lib\/finance-db["']/.test(text)
    ) {
      offenders.push(normalized.replace(`${REPO_ROOT.replaceAll(path.sep, "/")}/`, ""));
    }
  }
  assert.deepEqual(offenders, []);
});

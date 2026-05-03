import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(__dirname, "../database/postgres");

function getSchemaPaths() {
  return fs
    .readdirSync(schemaDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(schemaDir, entry));
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("remaining connection slots are reserved") ||
    message.includes("too many clients") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Connection terminated unexpectedly")
  );
}

async function main() {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let pool: ReturnType<typeof getPostgresPool> | undefined;
    // Errors we silently skip on every run (genuine idempotency races):
    //   42P07 duplicate_table   42710 duplicate_object
    //   42701 duplicate_column  42723 duplicate_function
    const ALWAYS_TOLERABLE = new Set(["42P07", "42710", "42701", "42723"]);
    // Errors that are USUALLY a benign re-run (index/trigger references a
    // not-yet-present column, DROP on a constraint that was already removed)
    // but CAN mask real "you forgot a column" bugs in newer migrations. We
    // keep tolerating them so existing prod doesn't break, but every hit is
    // surfaced in the end-of-run summary so a human can audit.
    //   42703 undefined_column  42P01 undefined_table
    //   42704 undefined_object
    const SUSPICIOUS_TOLERABLE = new Set(["42703", "42P01", "42704"]);
    const suspiciousHits: Array<{ file: string; code: string; message: string }> = [];

    try {
      pool = getPostgresPool();
      // Test connectivity first
      await pool.query("SELECT 1");
      for (const schemaPath of getSchemaPaths()) {
        const sql = fs.readFileSync(schemaPath, "utf8");
        try {
          await pool.query(sql);
          console.log(`Applied PostgreSQL schema from ${schemaPath}`);
        } catch (err) {
          const code = (err as { code?: string })?.code;
          const fileName = path.basename(schemaPath);
          if (code && ALWAYS_TOLERABLE.has(code)) {
            console.warn(`[bootstrap] Skipping ${fileName} (${code}): ${(err as Error).message}`);
            continue;
          }
          if (code && SUSPICIOUS_TOLERABLE.has(code)) {
            suspiciousHits.push({ file: fileName, code, message: (err as Error).message });
            console.warn(`[bootstrap] ⚠ Suspicious skip in ${fileName} (${code}): ${(err as Error).message}`);
            continue;
          }
          throw err;
        }
      }
      if (suspiciousHits.length > 0) {
        console.warn(
          `[bootstrap] ⚠ ${suspiciousHits.length} suspicious skip(s) — review the migrations above. ` +
          `If any of these references a column or table that should exist, the prior migration is broken.`,
        );
        for (const h of suspiciousHits) {
          console.warn(`  • ${h.file} (${h.code}): ${h.message}`);
        }
      }
      return; // success
    } catch (error) {
      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[bootstrap] Attempt ${attempt}/${MAX_RETRIES} failed (${error instanceof Error ? error.message : error}). Retrying in ${delayMs / 1000}s...`,
        );
        // Force close the pool so a fresh one is created on retry
        try { await pool?.end(); } catch { /* ignore */ }
        // Clear cached pool reference so getPostgresPool() creates a new one
        (globalThis as Record<string, unknown>).__orbfPgPool = undefined;
        await sleep(delayMs);
      } else {
        throw error;
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (isPostgresConfigured()) {
      try { await getPostgresPool().end(); } catch { /* pool may already be closed */ }
    }
  });

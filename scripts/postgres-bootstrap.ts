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
          // Tolerate idempotent re-run hazards that IF NOT EXISTS cannot fully
          // defend against. Each skipped error is logged for visibility.
          //   42P07 = duplicate_table/relation (index-vs-constraint name clash)
          //   42710 = duplicate_object
          //   42701 = duplicate_column
          //   42723 = duplicate_function
          //   42703 = undefined_column  (index references column not yet present)
          //   42P01 = undefined_table   (referential DROP on non-existent table)
          //   42704 = undefined_object  (DROP on non-existent constraint/index)
          const code = (err as { code?: string })?.code;
          const tolerableCodes = new Set(["42P07", "42710", "42701", "42723", "42703", "42P01", "42704"]);
          if (code && tolerableCodes.has(code)) {
            console.warn(
              `[bootstrap] Skipping ${path.basename(schemaPath)} (${code}): ${(err as Error).message}`,
            );
            continue;
          }
          throw err;
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

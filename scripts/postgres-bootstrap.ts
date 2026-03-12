import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../database/postgres/0001_foundation.sql");

async function main() {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = fs.readFileSync(schemaPath, "utf8");
  const pool = getPostgresPool();
  await pool.query(sql);
  console.log(`Applied PostgreSQL foundation schema from ${schemaPath}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });

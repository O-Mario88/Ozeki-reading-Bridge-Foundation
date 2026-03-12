import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(
  process.env.SQLITE_DB_PATH?.trim() || path.resolve(__dirname, "../data/app.db"),
);
const schemaDir = path.resolve(__dirname, "../database/postgres");

const TABLES = [
  "training_report_artifacts",
  "benchmark_profiles",
  "benchmark_rules",
  "edu_audit_exceptions",
  "edu_data_quality_summary",
  "edu_priority_queue_assignments",
  "intervention_plan",
  "intervention_actions",
  "national_report_packs",
  "partner_api_clients",
  "partner_export_audit_logs",
] as const;

function getSchemaPaths() {
  return fs
    .readdirSync(schemaDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(schemaDir, entry));
}

function sqliteValue(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

async function resetIdentitySequence(table: string, idColumn: string) {
  const pool = getPostgresPool();
  const sequenceResult = await pool.query<{ sequence_name: string | null }>(
    `SELECT pg_get_serial_sequence($1, $2) AS sequence_name`,
    [table, idColumn],
  );
  const sequenceName = sequenceResult.rows[0]?.sequence_name;
  if (!sequenceName) {
    return;
  }

  const maxIdResult = await pool.query<{ max_id: number | null; row_count: string }>(
    `SELECT MAX(${idColumn}) AS max_id, COUNT(*)::text AS row_count FROM ${table}`,
  );
  const maxId = Number(maxIdResult.rows[0]?.max_id ?? 0);
  const hasRows = Number(maxIdResult.rows[0]?.row_count ?? 0) > 0;
  await pool.query(`SELECT setval($1::regclass, $2, $3)`, [
    sequenceName,
    hasRows ? Math.max(maxId, 1) : 1,
    hasRows,
  ]);
}

async function main() {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite source not found at ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const pool = getPostgresPool();

  for (const schemaPath of getSchemaPaths()) {
    await pool.query(fs.readFileSync(schemaPath, "utf8"));
  }

  for (const table of TABLES) {
    const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; pk: number }>;
    if (columns.length === 0) {
      console.warn(`Skipping ${table}: not found in SQLite source.`);
      continue;
    }

    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
    const columnNames = columns.map((column) => column.name);
    console.log(`Importing ${table}: ${rows.length} rows`);

    await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    if (rows.length === 0) {
      continue;
    }

    for (const row of rows) {
      const placeholders = columnNames.map((_, index) => `$${index + 1}`).join(", ");
      const values = columnNames.map((column) => sqliteValue(row[column]));
      await pool.query(
        `INSERT INTO ${table} (${columnNames.join(", ")}) VALUES (${placeholders})`,
        values,
      );
    }

    const primaryKeyColumn = columns.find((column) => Number(column.pk) > 0)?.name;
    if (primaryKeyColumn && columns.filter((column) => Number(column.pk) > 0).length === 1) {
      await resetIdentitySequence(table, primaryKeyColumn);
    }
  }

  sqlite.close();
  console.log(`Imported intelligence/reporting tables from ${sqlitePath}`);
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

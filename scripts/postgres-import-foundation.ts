import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(process.env.SQLITE_DB_PATH?.trim() || path.resolve(__dirname, "../data/app.db"));
const schemaPath = path.resolve(__dirname, "../database/postgres/0001_foundation.sql");

const TABLES = [
  "portal_users",
  "portal_sessions",
  "audit_logs",
  "geo_regions",
  "geo_subregions",
  "geo_districts",
  "geo_subcounties",
  "geo_parishes",
  "schools_directory",
  "school_contacts",
  "school_learners",
  "teacher_roster",
  "learner_roster",
  "training_sessions",
  "training_participants",
  "online_training_events",
  "legacy_assessment_records",
  "assessment_sessions",
  "assessment_session_results",
  "assessment_records",
  "portal_records",
  "bookings",
  "contacts",
  "download_leads",
  "newsletter_subscribers",
] as const;

function sqliteValue(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
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
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  await pool.query(schemaSql);

  for (const table of TABLES) {
    const columns = sqlite
      .prepare(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
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
  }

  sqlite.close();
  console.log(`Imported foundation tables from ${sqlitePath}`);
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

import { queryPostgres } from "../src/lib/server/postgres/client";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

async function runMigration() {
  const sql = readFileSync(join(process.cwd(), "database/postgres/0027_school_reports_meta.sql"), "utf-8");
  console.log("Running migration 0027...");
  try {
    await queryPostgres(sql);
    console.log("Migration 0027 successful.");
  } catch (err) {
    console.error("Migration 0027 failed:", err);
  }
}

runMigration();

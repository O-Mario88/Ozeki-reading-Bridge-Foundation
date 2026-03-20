import { getPostgresPool } from "../src/lib/server/postgres/client";

async function run() {
  const pool = getPostgresPool();
  await pool.query("ALTER TABLE schools_directory ADD COLUMN IF NOT EXISTS classes_json TEXT DEFAULT '[]'");
  console.log("Migration successful");
  await pool.end();
}
run();

import { getPostgresPool } from "../src/lib/server/postgres/client";
import { v4 as uuidv4 } from "uuid";

async function main() {
  const pool = getPostgresPool();
  
  // Find an admin
  const res = await pool.query(`SELECT id, email FROM portal_users WHERE is_superadmin = true LIMIT 1`);
  if (res.rows.length === 0) {
    console.log("No super admin found");
    process.exit(1);
  }
  
  const userId = res.rows[0].id;
  const email = res.rows[0].email;
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await pool.query(
    `INSERT INTO portal_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  
  console.log(`ADMIN_EMAIL=${email}`);
  console.log(`COOKIE_TOKEN=${token}`);
  process.exit(0);
}

main().catch(console.error);

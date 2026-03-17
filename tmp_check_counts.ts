import { getPostgresPool, isPostgresConfigured } from './src/lib/server/postgres/client.js';

async function main() {
  if (!isPostgresConfigured()) {
    console.error('DATABASE_URL not configured');
    process.exit(1);
  }
  const pool = getPostgresPool();
  const tables = [
    'portal_users',
    'schools_directory',
    'finance_expenses',
    'online_training_events',
    'portal_blog_posts'
  ];
  console.log('--- Database Row Counts ---');
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${res.rows[0].count}`);
    } catch (e) {
      console.log(`${table}: table missing or error: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => getPostgresPool().end());

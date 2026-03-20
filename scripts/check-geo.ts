import fs from 'fs';
import { queryPostgres } from '../src/lib/server/postgres/client';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1].trim();

async function main() {
  const res = await queryPostgres(`SELECT * FROM geo_regions;`);
  console.table(res.rows);
  process.exit(0);
}
main();

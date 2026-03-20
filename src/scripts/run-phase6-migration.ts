import fs from 'fs';
import { queryPostgres } from '../lib/server/postgres/client';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1].trim();

async function main() {
  console.log("=== Running Phase 6 Data Migration ===");

  // 1. Normalize portal_records.payload_json for training records
  console.log("Migrating training records to include region in payload_json...");
  
  const updateRes = await queryPostgres(`
    UPDATE portal_records
    SET payload_json = jsonb_set(
      payload_json::jsonb, 
      '{region}', 
      to_jsonb(sd.region)
    )::text
    FROM schools_directory sd
    WHERE portal_records.module = 'training' 
      AND portal_records.school_id = sd.id
      AND (portal_records.payload_json::jsonb->>'region' IS NULL OR portal_records.payload_json::jsonb->>'region' = '')
    RETURNING portal_records.id;
  `);

  console.log(`Updated ${updateRes.rowCount} training records with their school's region.`);

  // 2. Normalize existing schools_directory.region values to exact strings
  // Wait, my audit showed they are ALL 'Central'. 
  // But just to be safe and idempotent, we run a normalization.
  console.log("Normalizing schools_directory.region values...");
  const normalizeRes = await queryPostgres(`
    UPDATE schools_directory
    SET region = CASE 
      WHEN region ILIKE 'central%' THEN 'Central'
      WHEN region ILIKE 'northern%' THEN 'Northern'
      WHEN region ILIKE 'eastern%' THEN 'Eastern'
      WHEN region ILIKE 'western%' THEN 'Western'
      ELSE region
    END
    WHERE region ILIKE 'central%' OR region ILIKE 'northern%' OR region ILIKE 'eastern%' OR region ILIKE 'western%';
  `);

  console.log(`Normalized ${normalizeRes.rowCount} schools_directory.region values.`);

  // Verify Training Records have consistent region values NOW
  const trainingRes = await queryPostgres(`
    SELECT 
      (payload_json::jsonb)->>'region' as region,
      COUNT(*) as count
    FROM portal_records
    WHERE module = 'training'
    GROUP BY (payload_json::jsonb)->>'region'
  `);
  console.log("\nVerify: Training Records Region Values:");
  console.table(trainingRes.rows);

  process.exit(0);
}

main().catch(console.error);

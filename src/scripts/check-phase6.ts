import fs from 'fs';
import { queryPostgres } from '../lib/server/postgres/client';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1].trim();

async function main() {
  console.log("=== Phase 6 Data Integrity Audit ===");

  // 1. Audit schools_directory.region
  const regionRes = await queryPostgres(`
    SELECT region, COUNT(*) as count 
    FROM schools_directory 
    GROUP BY region
    ORDER BY count DESC
  `);
  console.log("\n1. Existing Region Values:");
  console.table(regionRes.rows);

  // 2. Audit schools_directory classes_json vs enrollment
  const classesRes = await queryPostgres(`
    SELECT 
      COUNT(*) as total_schools,
      COUNT(classes_json) as has_classes_json,
      COUNT(*) FILTER (WHERE enrolled_baby > 0 OR enrolled_middle > 0 OR enrolled_top > 0 OR enrolled_p1 > 0) as has_enrollment
    FROM schools_directory
  `);
  console.log("\n2. Classes JSON vs Enrollment:");
  console.table(classesRes.rows);

  // 3. Verify Visit Records have proper school_id linkage
  const visitRes = await queryPostgres(`
    SELECT 
      COUNT(*) as total_visits,
      COUNT(school_id) as visits_with_school_id
    FROM coaching_visits
  `);
  console.log("\n3. Visit Records Linkage:");
  console.table(visitRes.rows);

  // 4. Verify Training Records have consistent region values
  const trainingRes = await queryPostgres(`
    SELECT 
      (payload_json::jsonb)->>'region' as region,
      COUNT(*) as count
    FROM portal_records
    WHERE module = 'training'
    GROUP BY (payload_json::jsonb)->>'region'
  `);
  console.log("\n4. Training Records Region Values:");
  console.table(trainingRes.rows);

  process.exit(0);
}

main().catch(console.error);

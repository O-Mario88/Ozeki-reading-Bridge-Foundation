import fs from 'fs';
import { queryPostgres } from "../src/lib/server/postgres/client";
import { ugandaRegions } from "../src/lib/uganda-locations";

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1].trim();

async function main() {
  console.log("Starting geography synchronization...");
  
  let regionsInserted = 0;
  let subRegionsInserted = 0;
  let districtsInserted = 0;

  for (const region of ugandaRegions) {
    // 1. Upsert Region
    const regionRes = await queryPostgres(
      `
      INSERT INTO geo_regions (name, country_id) 
      VALUES ($1, 1) 
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
      `,
      [region.region]
    );
    const regionId = regionRes.rows[0].id;
    regionsInserted++;

    for (const subRegion of region.subRegions) {
      // 2. Upsert Sub Region
      const subRegionRes = await queryPostgres(
        `
        INSERT INTO geo_subregions (name, region_id) 
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET region_id = EXCLUDED.region_id
        RETURNING id
        `,
        [subRegion.subRegion, regionId]
      );
      const subRegionId = subRegionRes.rows[0].id;
      subRegionsInserted++;

      for (const district of subRegion.districts) {
        // 3. Upsert District
        const districtRes = await queryPostgres(
          `
          INSERT INTO geo_districts (name, subregion_id, region_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET subregion_id = EXCLUDED.subregion_id, region_id = EXCLUDED.region_id
          RETURNING id
          `,
          [district, subRegionId, regionId]
        );
        const districtId = districtRes.rows[0].id;
        districtsInserted++;
      }
    }
  }

  console.log(`✅ Synchronized ${regionsInserted} regions, ${subRegionsInserted} sub-regions, and ${districtsInserted} districts.`);

  // 4. Update schools_directory foreign keys based on text matches
  console.log("Linking schools_directory to geo instances...");
  const updateRes = await queryPostgres(`
    UPDATE schools_directory sd
    SET 
      geo_district_id = gd.id::text,
      geo_subregion_id = gd.subregion_id::text,
      geo_region_id = gd.region_id::text
    FROM geo_districts gd
    WHERE lower(sd.district) = lower(gd.name)
      AND (sd.geo_district_id IS NULL OR sd.geo_district_id = '');
  `);

  console.log(`✅ Linked ${updateRes.rowCount ?? 0} schools to geo entities successfully.`);
  console.log("Done.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

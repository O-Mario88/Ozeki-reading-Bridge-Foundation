import { queryPostgres } from "../src/lib/server/postgres/client";

async function main() {
    console.log("Normalizing geo_regions table...");
    await queryPostgres(`UPDATE geo_regions SET name = 'Central' WHERE name = 'Central Region'`);
    await queryPostgres(`UPDATE geo_regions SET name = 'Eastern' WHERE name = 'Eastern Region'`);
    await queryPostgres(`UPDATE geo_regions SET name = 'Northern' WHERE name = 'Northern Region'`);
    await queryPostgres(`UPDATE geo_regions SET name = 'Western' WHERE name = 'Western Region'`);

    console.log("Normalizing schools_directory.region values...");
    await queryPostgres(`UPDATE schools_directory SET region = 'Central' WHERE region ILIKE '%Central%'`);
    await queryPostgres(`UPDATE schools_directory SET region = 'Eastern' WHERE region ILIKE '%Eastern%'`);
    await queryPostgres(`UPDATE schools_directory SET region = 'Northern' WHERE region ILIKE '%Northern%'`);
    await queryPostgres(`UPDATE schools_directory SET region = 'Western' WHERE region ILIKE '%Western%'`);

    console.log("Done.");
    process.exit(0);
}

main().catch(console.error);

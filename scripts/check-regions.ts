import { queryPostgres } from "../src/lib/server/postgres/client";

async function main() {
    const res = await queryPostgres(`SELECT id, name FROM geo_regions`);
    console.log(res.rows);
    process.exit(0);
}

main().catch(console.error);

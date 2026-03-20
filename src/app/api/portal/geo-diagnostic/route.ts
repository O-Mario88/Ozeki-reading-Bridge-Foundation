import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint to check geo table state.
 * DELETE THIS FILE after confirming production DB is seeded correctly.
 */
export async function GET() {
  try {
    const countries = await queryPostgres(
      `SELECT id, iso_code, name FROM geo_countries ORDER BY id LIMIT 10`,
    );
    const regions = await queryPostgres(
      `SELECT id, region_uid, name, country_id FROM geo_regions ORDER BY id LIMIT 10`,
    );
    const subregions = await queryPostgres(
      `SELECT id, name, region_id FROM geo_subregions ORDER BY id LIMIT 20`,
    );
    const districts = await queryPostgres(
      `SELECT COUNT(*) AS count FROM geo_districts`,
    );
    const parishes = await queryPostgres(
      `SELECT COUNT(*) AS count FROM geo_parishes`,
    );

    return NextResponse.json({
      ok: true,
      geo_countries: countries.rows,
      geo_regions: regions.rows,
      geo_subregions: subregions.rows,
      geo_districts_count: Number(districts.rows[0]?.count ?? 0),
      geo_parishes_count: Number(parishes.rows[0]?.count ?? 0),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

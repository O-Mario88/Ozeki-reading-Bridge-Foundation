import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint to check geo table state and schools schema.
 * DELETE THIS FILE after confirming production DB is working correctly.
 */
export async function GET() {
  try {
    const countries = await queryPostgres(
      `SELECT id, name FROM geo_countries ORDER BY id LIMIT 10`,
    );
    const regions = await queryPostgres(
      `SELECT id, name, country_id FROM geo_regions ORDER BY id LIMIT 10`,
    );
    const districtCount = await queryPostgres(
      `SELECT COUNT(*) AS count FROM geo_districts`,
    );
    const parishCount = await queryPostgres(
      `SELECT COUNT(*) AS count FROM geo_parishes`,
    );

    // Check schools_directory table columns
    const schoolColumns = await queryPostgres(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'schools_directory'
       ORDER BY ordinal_position`,
    );

    return NextResponse.json({
      ok: true,
      geo_countries: countries.rows,
      geo_regions: regions.rows,
      geo_districts_count: Number(districtCount.rows[0]?.count ?? 0),
      geo_parishes_count: Number(parishCount.rows[0]?.count ?? 0),
      schools_directory_columns: schoolColumns.rows.map(
        (r: Record<string, unknown>) => `${r.column_name} (${r.data_type})`,
      ),
      schools_directory_column_count: schoolColumns.rows.length,
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

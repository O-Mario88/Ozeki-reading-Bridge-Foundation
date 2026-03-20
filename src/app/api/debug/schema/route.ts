import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await queryPostgres(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'schools_directory'
       ORDER BY ordinal_position`,
      [],
    );

    // Also check which tables exist
    const tables = await queryPostgres(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`,
      [],
    );

    return NextResponse.json({
      schoolsDirectoryColumns: result.rows,
      tables: tables.rows.map((r: Record<string, unknown>) => r.table_name),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

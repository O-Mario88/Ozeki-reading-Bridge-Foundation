import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || searchParams.get("search") || "";

  if (query.length < 2) {
    return NextResponse.json({ schools: [] });
  }

  try {
    const res = await queryPostgres(
      `SELECT id, name, district 
       FROM schools_directory 
       WHERE name ILIKE $1 OR district ILIKE $1 
       ORDER BY name ASC 
       LIMIT 10`,
      [`%${query}%`]
    );
    return NextResponse.json({ schools: res.rows });
  } catch (error) {
    logger.error("[public/schools] Search error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ schools: [] });
  }
}

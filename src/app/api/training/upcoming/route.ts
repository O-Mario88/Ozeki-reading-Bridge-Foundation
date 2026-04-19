import { NextResponse } from "next/server";
import { getUpcomingTrainingsPostgres } from "@/lib/server/postgres/repositories/training-intelligence";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);
    const data = await getUpcomingTrainingsPostgres({ district, limit });

    return NextResponse.json(
      { data, lastUpdated: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    console.error("[api/training/upcoming]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

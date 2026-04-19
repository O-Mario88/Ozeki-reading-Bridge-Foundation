import { NextResponse } from "next/server";
import {
  getAtRiskRadarPostgres,
  getCompositeProjectionPostgres,
} from "@/lib/server/postgres/repositories/at-risk-radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 30);
    const district = searchParams.get("district") ?? undefined;

    const [radar, projection] = await Promise.all([
      getAtRiskRadarPostgres({ limit, district }),
      getCompositeProjectionPostgres(),
    ]);

    return NextResponse.json(
      { radar, projection, lastUpdated: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1200" } },
    );
  } catch (error) {
    console.error("[api/impact/at-risk-radar]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  getTrainingEffectivenessPostgres,
  getFacilitatorLeagueTablePostgres,
  getTrainingCoverageGapsPostgres,
  getUpcomingTrainingsPostgres,
} from "@/lib/server/postgres/repositories/training-intelligence";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    if (section === "effectiveness") {
      const limit = Number(searchParams.get("limit") ?? 50);
      const data = await getTrainingEffectivenessPostgres({ limit });
      return NextResponse.json(
        { data, lastUpdated: new Date().toISOString() },
        { headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=1800" } },
      );
    }
    if (section === "facilitators") {
      const data = await getFacilitatorLeagueTablePostgres();
      return NextResponse.json(
        { data, lastUpdated: new Date().toISOString() },
        { headers: { "Cache-Control": "public, max-age=900" } },
      );
    }
    if (section === "coverage-gaps") {
      const days = Number(searchParams.get("days") ?? 180);
      const data = await getTrainingCoverageGapsPostgres({ daysThreshold: days });
      return NextResponse.json(
        { data, threshold: days, lastUpdated: new Date().toISOString() },
        { headers: { "Cache-Control": "public, max-age=900" } },
      );
    }
    if (section === "upcoming") {
      const limit = Number(searchParams.get("limit") ?? 50);
      const district = searchParams.get("district") ?? undefined;
      const data = await getUpcomingTrainingsPostgres({ limit, district });
      return NextResponse.json(
        { data, lastUpdated: new Date().toISOString() },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    // Bundle view
    const [effectiveness, facilitators, coverageGaps, upcoming] = await Promise.all([
      getTrainingEffectivenessPostgres({ limit: 20 }),
      getFacilitatorLeagueTablePostgres(),
      getTrainingCoverageGapsPostgres({ daysThreshold: 180 }),
      getUpcomingTrainingsPostgres({ limit: 20 }),
    ]);

    return NextResponse.json(
      {
        effectiveness,
        facilitators,
        coverageGaps,
        upcoming,
        lastUpdated: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1200" } },
    );
  } catch (error) {
    console.error("[api/impact/training-intelligence]", error);
    return NextResponse.json({ error: "Training intelligence unavailable" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import {
  getCoachWorkloadPostgres,
  getDistrictCoverageMapPostgres,
} from "@/lib/server/postgres/repositories/coaching-qa";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const termStart = searchParams.get("termStart") ?? undefined;
    const target = Number(searchParams.get("target") ?? 20);

    const [workload, coverage] = await Promise.all([
      getCoachWorkloadPostgres({ termStart, targetPerCoach: target }),
      getDistrictCoverageMapPostgres({ termStart }),
    ]);

    const summary = {
      totalCoaches: workload.length,
      overloaded: workload.filter((r) => r.utilizationStatus === "overloaded").length,
      balanced: workload.filter((r) => r.utilizationStatus === "balanced").length,
      underutilized: workload.filter((r) => r.utilizationStatus === "underutilized").length,
      inactive: workload.filter((r) => r.utilizationStatus === "inactive").length,
      totalVisits: workload.reduce((a, b) => a + b.visitsThisTerm, 0),
      districtsUncovered: coverage.filter((d) => d.schoolsVisitedThisTerm === 0).length,
    };

    return NextResponse.json({
      workload,
      coverage,
      summary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/portal/coaching-qa/workload]", error);
    return NextResponse.json({ error: "Workload data unavailable" }, { status: 500 });
  }
}

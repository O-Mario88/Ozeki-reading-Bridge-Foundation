import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getCoachingCycleStatusPostgres } from "@/lib/server/postgres/repositories/coaching-qa";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const target = Number(searchParams.get("target") ?? 4);
    const termStart = searchParams.get("termStart") ?? undefined;

    const data = await getCoachingCycleStatusPostgres({
      targetVisitsPerTerm: target,
      termStart,
    });

    const summary = {
      total: data.length,
      onTrackOrAhead: data.filter((r) => r.status === "on_track" || r.status === "ahead").length,
      behind: data.filter((r) => r.status === "behind").length,
      critical: data.filter((r) => r.status === "critical" || r.status === "no_activity").length,
      overallCompletionPct: data.length > 0
        ? Math.round(data.reduce((a, b) => a + b.completionPct, 0) / data.length)
        : 0,
    };

    return NextResponse.json({ data, summary, target, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/coaching-qa/cycle-status]", error);
    return NextResponse.json({ error: "Cycle status unavailable" }, { status: 500 });
  }
}

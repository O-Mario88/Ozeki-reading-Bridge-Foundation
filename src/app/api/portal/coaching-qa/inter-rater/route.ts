import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getInterRaterReliabilityPostgres } from "@/lib/server/postgres/repositories/coaching-qa";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? 90);
    const minObservers = Number(searchParams.get("minObservers") ?? 2);

    const data = await getInterRaterReliabilityPostgres({
      daysWindow: days,
      minObservers,
      minObservationsPerObserver: 1,
    });

    const summary = {
      total: data.length,
      highVariance: data.filter((r) => r.flag === "high_variance").length,
      moderateVariance: data.filter((r) => r.flag === "moderate_variance").length,
      aligned: data.filter((r) => r.flag === "aligned").length,
      avgStdDev: data.length > 0
        ? Number((data.reduce((a, b) => a + (b.stdDevScore ?? 0), 0) / data.length).toFixed(3))
        : null,
    };

    return NextResponse.json({ data, summary, windowDays: days, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/coaching-qa/inter-rater]", error);
    return NextResponse.json({ error: "Inter-rater analysis unavailable" }, { status: 500 });
  }
}

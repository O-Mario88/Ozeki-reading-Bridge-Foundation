import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getLearnerAttributionForEngagementPostgres } from "@/lib/server/postgres/repositories/school-engagements";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePortalUser();
    const { id } = await ctx.params;
    const rows = await getLearnerAttributionForEngagementPostgres(Number(id));

    const learnerCount = rows.length;
    const withDelta = rows.filter((r) => r.readingStageDelta != null);
    const improved = withDelta.filter((r) => (r.readingStageDelta ?? 0) > 0).length;
    const unchanged = withDelta.filter((r) => (r.readingStageDelta ?? 0) === 0).length;
    const regressed = withDelta.filter((r) => (r.readingStageDelta ?? 0) < 0).length;
    const avgDelta = withDelta.length > 0
      ? withDelta.reduce((a, b) => a + (b.readingStageDelta ?? 0), 0) / withDelta.length
      : 0;

    return NextResponse.json({
      engagementId: Number(id),
      summary: {
        learnerCount,
        pairedCount: withDelta.length,
        improved,
        unchanged,
        regressed,
        averageStageDelta: Number(avgDelta.toFixed(2)),
      },
      rows,
    });
  } catch (err) {
    console.error("[api/portal/school-engagements/:id/attribution] GET failed", err);
    return NextResponse.json({ error: "Failed to load attribution." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { listActionPlanFollowUpsPostgres } from "@/lib/server/postgres/repositories/coaching-qa";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "1";
    const schoolId = searchParams.get("schoolId") ? Number(searchParams.get("schoolId")) : undefined;
    const limit = Number(searchParams.get("limit") ?? 200);

    const data = await listActionPlanFollowUpsPostgres({
      ownerUserId: mine ? user.id : undefined,
      schoolId,
      limit,
    });

    const summary = {
      total: data.length,
      overdue: data.filter((r) => r.status === "overdue").length,
      dueSoon: data.filter((r) => r.status === "due_soon").length,
      upcoming: data.filter((r) => r.status === "upcoming").length,
      noDate: data.filter((r) => r.status === "no_date").length,
    };

    return NextResponse.json({ data, summary, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/coaching-qa/follow-ups]", error);
    return NextResponse.json({ error: "Follow-ups unavailable" }, { status: 500 });
  }
}

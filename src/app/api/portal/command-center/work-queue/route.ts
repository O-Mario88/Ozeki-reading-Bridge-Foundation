import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getWorkQueuePostgres, type WorkQueueOptions } from "@/lib/server/postgres/repositories/command-center";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "1";
    const category = searchParams.get("category") || undefined;
    const limit = clampLimit(searchParams.get("limit"), 100, 1000);

    const items = await getWorkQueuePostgres({
      ownerUserId: mine ? user.id : undefined,
      category: category as WorkQueueOptions["category"],
      limit,
    });

    const summary = {
      total: items.length,
      critical: items.filter((i) => i.priority === "critical").length,
      high: items.filter((i) => i.priority === "high").length,
      medium: items.filter((i) => i.priority === "medium").length,
      low: items.filter((i) => i.priority === "low").length,
      overdue: items.filter((i) => (i.daysOverdue ?? 0) > 0).length,
      byCategory: {
        assessment: items.filter((i) => i.category === "assessment").length,
        coaching: items.filter((i) => i.category === "coaching").length,
        certificate: items.filter((i) => i.category === "certificate").length,
        finance: items.filter((i) => i.category === "finance").length,
        action_plan: items.filter((i) => i.category === "action_plan").length,
        training_follow_up: items.filter((i) => i.category === "training_follow_up").length,
        at_risk: items.filter((i) => i.category === "at_risk").length,
      },
    };

    return NextResponse.json({ data: items, summary, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/command-center/work-queue]", error);
    return NextResponse.json({ error: "Work queue unavailable" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getActivityFeedPostgres } from "@/lib/server/postgres/repositories/command-center";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const hours = Number(searchParams.get("hours") ?? 48);
    const limit = Number(searchParams.get("limit") ?? 50);
    const data = await getActivityFeedPostgres({ hours, limit });
    return NextResponse.json({ data, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/command-center/activity-feed]", error);
    return NextResponse.json({ error: "Activity feed unavailable" }, { status: 500 });
  }
}

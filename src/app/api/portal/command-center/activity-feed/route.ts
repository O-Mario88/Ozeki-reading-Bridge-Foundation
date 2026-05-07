import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getActivityFeedPostgres } from "@/lib/server/postgres/repositories/command-center";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const hours = Math.max(1, Math.min(720, Number(searchParams.get("hours") ?? 48) || 48));
    const limit = clampLimit(searchParams.get("limit"), 50, 500);
    const data = await getActivityFeedPostgres({ hours, limit });
    return NextResponse.json({ data, lastUpdated: new Date().toISOString() });
  } catch (error) {
    logger.error("[portal/command-center/activity-feed] activity feed unavailable", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Activity feed unavailable" }, { status: 500 });
  }
}

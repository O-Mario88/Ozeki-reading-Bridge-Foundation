import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { markAllNotificationsReadPostgres } from "@/lib/server/postgres/repositories/notifications";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requirePortalUser();
    const count = await markAllNotificationsReadPostgres(user.id);
    return NextResponse.json({ ok: true, markedRead: count });
  } catch (error) {
    logger.error("[portal/notifications/mark-all-read] failed to mark all read", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

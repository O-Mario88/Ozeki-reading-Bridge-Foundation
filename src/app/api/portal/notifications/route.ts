import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  listNotificationsForUserPostgres,
  countUnreadNotificationsPostgres,
} from "@/lib/server/postgres/repositories/notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const limit = Number(searchParams.get("limit") ?? 30);

    const [data, unreadCount] = await Promise.all([
      listNotificationsForUserPostgres(user.id, { unreadOnly, limit }),
      countUnreadNotificationsPostgres(user.id),
    ]);
    return NextResponse.json({ data, unreadCount, lastUpdated: new Date().toISOString() });
  } catch (error) {
    logger.error("[portal/notifications] notifications unavailable", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

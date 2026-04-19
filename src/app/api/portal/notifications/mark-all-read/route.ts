import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { markAllNotificationsReadPostgres } from "@/lib/server/postgres/repositories/notifications";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requirePortalUser();
    const count = await markAllNotificationsReadPostgres(user.id);
    return NextResponse.json({ ok: true, markedRead: count });
  } catch (error) {
    console.error("[api/portal/notifications/mark-all-read]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

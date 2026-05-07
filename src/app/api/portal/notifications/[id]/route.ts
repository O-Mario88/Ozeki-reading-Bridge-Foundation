import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { markNotificationReadPostgres } from "@/lib/server/postgres/repositories/notifications";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    await markNotificationReadPostgres(Number(id), user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[portal/notifications/:id] PATCH update failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getSessionEffectivenessPostgres } from "@/lib/server/postgres/repositories/training-effectiveness";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const data = await getSessionEffectivenessPostgres(Number(id));
    if (!data) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[effectiveness] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

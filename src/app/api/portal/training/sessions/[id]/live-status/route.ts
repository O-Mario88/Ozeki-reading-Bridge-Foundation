import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getLiveSessionStatus } from "@/lib/training-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalUser();
    const { id } = await params;
    const status = await getLiveSessionStatus(Number(id));
    if (!status) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(status);
  } catch (error) {
    logger.error("[training/sessions/live-status] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getWindowCompliancePostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const compliance = await getWindowCompliancePostgres(Number(id));
    if (!compliance) return NextResponse.json({ error: "Window not found." }, { status: 404 });
    return NextResponse.json(compliance);
  } catch (error) {
    logger.error("[schedule/compliance] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

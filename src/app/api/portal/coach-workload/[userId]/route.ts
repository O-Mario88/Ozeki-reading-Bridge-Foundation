import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getCoachWorkloadDetailPostgres } from "@/lib/server/postgres/repositories/coach-workload";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { userId } = await params;
    const data = await getCoachWorkloadDetailPostgres(Number(userId));
    if (!data) return NextResponse.json({ error: "Coach not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[coach-workload/userId] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getCoachWorkloadSummaryPostgres } from "@/lib/server/postgres/repositories/coach-workload";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePortalStaffUser();
    const data = await getCoachWorkloadSummaryPostgres();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[coach-workload] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

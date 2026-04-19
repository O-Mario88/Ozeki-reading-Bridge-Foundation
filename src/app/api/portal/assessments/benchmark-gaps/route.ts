import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getBenchmarkGapAnalysisPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const grade = req.nextUrl.searchParams.get("grade") ?? undefined;
    const data = await getBenchmarkGapAnalysisPostgres(grade);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[benchmark-gaps] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getCostPerLearnerPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const p = req.nextUrl.searchParams;
    const data = await getCostPerLearnerPostgres({
      periodStart: p.get("from") ?? undefined,
      periodEnd: p.get("to") ?? undefined,
      usdRate: p.get("rate") ? Number(p.get("rate")) : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[finance/cost-per-learner] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

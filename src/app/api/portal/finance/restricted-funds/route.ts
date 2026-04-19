import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getRestrictedFundsBurnPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const funds = await getRestrictedFundsBurnPostgres();
    return NextResponse.json({ funds });
  } catch (error) {
    logger.error("[finance/restricted-funds] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

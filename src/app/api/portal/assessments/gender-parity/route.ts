import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getGenderParityPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const params = req.nextUrl.searchParams;
    const data = await getGenderParityPostgres({
      district: params.get("district") ?? undefined,
      region: params.get("region") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[gender-parity] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

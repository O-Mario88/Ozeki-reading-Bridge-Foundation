import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getItemDiagnosticsPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const params = req.nextUrl.searchParams;
    const data = await getItemDiagnosticsPostgres({
      domainKey: params.get("domain") ?? undefined,
      regionFilter: params.get("region") ?? undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : 50,
    });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[assessments/diagnostics] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { listAuditTrailPostgres } from "@/lib/server/postgres/repositories/audit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const userIdRaw = sp.get("userId");
    const limitRaw = sp.get("limit");
    const offsetRaw = sp.get("offset");

    const page = await listAuditTrailPostgres({
      userId: userIdRaw && /^\d+$/.test(userIdRaw) ? Number(userIdRaw) : undefined,
      action: sp.get("action") || undefined,
      targetTable: sp.get("targetTable") || undefined,
      targetId: sp.get("targetId") || undefined,
      dateFrom: sp.get("dateFrom") || undefined,
      dateTo: sp.get("dateTo") || undefined,
      search: sp.get("search") || undefined,
      limit: limitRaw && /^\d+$/.test(limitRaw) ? Math.min(Number(limitRaw), 200) : 50,
      offset: offsetRaw && /^\d+$/.test(offsetRaw) ? Number(offsetRaw) : 0,
    });

    return NextResponse.json(page);
  } catch (error) {
    logger.error("[admin/audit-trail] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  revokeApiKeyPostgres,
  getApiKeyUsageSummaryPostgres,
} from "@/lib/server/postgres/repositories/api-keys";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

const revokeSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const { id } = await params;
    const usage = await getApiKeyUsageSummaryPostgres(Number(id));
    return NextResponse.json(usage);
  } catch (error) {
    logger.error("[admin/api-keys/id] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const { id } = await params;
    let reason = "Revoked by admin";
    try {
      const body = await req.json();
      const parsed = revokeSchema.parse(body);
      if (parsed.reason) reason = parsed.reason;
    } catch {
      // empty body is ok
    }
    await revokeApiKeyPostgres(Number(id), reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[admin/api-keys/id] DELETE failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

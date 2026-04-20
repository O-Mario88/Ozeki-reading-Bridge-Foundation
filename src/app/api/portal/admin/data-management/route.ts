import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getCategoryCountsPostgres } from "@/lib/server/postgres/repositories/data-management";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePortalUser();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Super-admin only." }, { status: 403 });
    }
    const categories = await getCategoryCountsPostgres();
    return NextResponse.json({ categories });
  } catch (err) {
    logger.error("[admin/data-management] GET failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

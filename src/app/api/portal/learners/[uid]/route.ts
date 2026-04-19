import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getLearnerProfilePostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ uid: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { uid } = await params;
    const profile = await getLearnerProfilePostgres(decodeURIComponent(uid));
    if (!profile) return NextResponse.json({ error: "Learner not found." }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    logger.error("[learners/uid] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

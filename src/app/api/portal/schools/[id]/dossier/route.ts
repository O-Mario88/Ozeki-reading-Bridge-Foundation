import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { buildSchoolDossierPostgres } from "@/lib/server/postgres/repositories/school-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const dossier = await buildSchoolDossierPostgres(Number(id));
    if (!dossier) return NextResponse.json({ error: "School not found." }, { status: 404 });
    return NextResponse.json(dossier);
  } catch (error) {
    logger.error("[schools/dossier] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

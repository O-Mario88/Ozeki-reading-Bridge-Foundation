import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  getProgrammePostgres,
  listProgrammeSessionsPostgres,
  listProgrammeEnrollmentsPostgres,
  recomputeProgrammeProgressPostgres,
} from "@/lib/server/postgres/repositories/training-programmes";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const programmeId = Number(id);

    // Refresh progress counters so list is accurate on load
    await recomputeProgrammeProgressPostgres(programmeId).catch(() => {});

    const [programme, sessions, enrollments] = await Promise.all([
      getProgrammePostgres(programmeId),
      listProgrammeSessionsPostgres(programmeId),
      listProgrammeEnrollmentsPostgres(programmeId),
    ]);
    if (!programme) return NextResponse.json({ error: "Not found." }, { status: 404 });

    return NextResponse.json({ programme, sessions, enrollments });
  } catch (error) {
    logger.error("[programmes/id] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

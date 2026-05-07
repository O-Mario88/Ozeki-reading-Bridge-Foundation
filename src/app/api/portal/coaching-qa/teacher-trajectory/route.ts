import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getTeacherObservationTrajectoryPostgres } from "@/lib/server/postgres/repositories/coaching-qa";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const teacherName = searchParams.get("teacherName");
    const schoolId = searchParams.get("schoolId") ? Number(searchParams.get("schoolId")) : undefined;

    if (!teacherName) {
      return NextResponse.json({ error: "teacherName is required" }, { status: 400 });
    }

    const data = await getTeacherObservationTrajectoryPostgres({ teacherName, schoolId });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[portal/coaching-qa/teacher-trajectory] trajectory unavailable", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Trajectory unavailable" }, { status: 500 });
  }
}

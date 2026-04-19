import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getRecommendationsForUserPostgres } from "@/lib/server/postgres/repositories/lesson-lms";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 6), 20);

    // Resolve teacher's school + class grade from portal_users / teacher_roster
    let schoolId: number | undefined;
    let classGrade: string | undefined;
    const teacherLookup = await queryPostgres(
      `SELECT tr.school_id, tr.class_taught
       FROM teacher_roster tr
       JOIN portal_users pu ON pu.email = tr.email
       WHERE pu.id = $1 LIMIT 1`,
      [user.id],
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
    if (teacherLookup.rows.length > 0) {
      schoolId = teacherLookup.rows[0].school_id ? Number(teacherLookup.rows[0].school_id) : undefined;
      classGrade = teacherLookup.rows[0].class_taught ? String(teacherLookup.rows[0].class_taught) : undefined;
    }

    const recs = await getRecommendationsForUserPostgres({
      userId: user.id,
      schoolId,
      classGrade,
      limit,
    });
    return NextResponse.json({ data: recs, context: { schoolId, classGrade }, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/recorded-lessons/recommendations]", error);
    return NextResponse.json({ error: "Recommendations unavailable" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getResumePositionPostgres } from "@/lib/server/postgres/repositories/lesson-lms";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { slug } = await params;
    const lessonRes = await queryPostgres(
      `SELECT id FROM recorded_lessons WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (lessonRes.rows.length === 0) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    const lessonId = Number(lessonRes.rows[0].id);
    const resume = await getResumePositionPostgres(lessonId, user.id);
    if (!resume) {
      return NextResponse.json({ lessonId, userId: user.id, currentPositionSeconds: 0, maxPositionSeconds: 0, percentWatched: 0, completed: false, lastWatchedAt: null });
    }
    return NextResponse.json(resume);
  } catch (error) {
    console.error("[api/recorded-lessons/resume]", error);
    return NextResponse.json({ error: "Resume unavailable" }, { status: 500 });
  }
}

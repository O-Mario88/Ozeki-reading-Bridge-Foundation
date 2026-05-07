import { NextResponse } from "next/server";
import { getQuizForLessonPostgres } from "@/lib/server/postgres/repositories/lesson-lms";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const quiz = await getQuizForLessonPostgres(slug);
    if (!quiz) {
      return NextResponse.json({ error: "No quiz for this lesson" }, { status: 404 });
    }
    return NextResponse.json(quiz, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch (error) {
    logger.error("[api/recorded-lessons/quiz]", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Quiz unavailable" }, { status: 500 });
  }
}

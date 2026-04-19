import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { gradeQuizAttemptPostgres } from "@/lib/server/postgres/repositories/lesson-lms";

export const runtime = "nodejs";

const schema = z.object({
  quizId: z.number().int().positive(),
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      answer: z.string().max(500),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const body = await request.json();
    const parsed = schema.parse(body);

    const result = await gradeQuizAttemptPostgres(parsed.quizId, user.id, parsed.answers);
    if (!result) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (result.passed) {
      const { publishEvent } = await import("@/lib/server/events/publish");
      const { queryPostgres } = await import("@/lib/server/postgres/client");
      const lessonRes = await queryPostgres(
        `SELECT recorded_lesson_id FROM lesson_quizzes WHERE id = $1`,
        [parsed.quizId],
      ).catch(() => ({ rows: [] as Array<{ recorded_lesson_id: number }> }));
      const lessonId = lessonRes.rows[0]?.recorded_lesson_id;
      if (lessonId) {
        await publishEvent({
          eventType: "quiz.passed",
          actorUserId: user.id,
          entityType: "quiz_attempt",
          entityId: result.attemptId,
          payload: { lessonId, userId: user.id, scorePct: result.scorePct },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      ...result,
      message: result.passed
        ? `You passed with ${result.scorePct}%. Your certificate will arrive shortly.`
        : `You scored ${result.scorePct}%. Keep going — you can retake the quiz.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/recorded-lessons/quiz/submit]", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

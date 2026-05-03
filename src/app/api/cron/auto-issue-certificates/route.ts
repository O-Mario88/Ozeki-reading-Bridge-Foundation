import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { publishEvent } from "@/lib/server/events/publish";
import { requireCronToken } from "@/lib/server/http/cron-auth";

export const runtime = "nodejs";

/**
 * Auto-issue certificates:
 *   A. Training attendees with attended=true and certificate_status IS NULL/Pending
 *   B. Lesson completions where certificate_eligible=true but no email sent
 * For now (B) relies on the quiz.passed handler; this cron catches any stragglers
 * (e.g., when the event bus missed them) by re-publishing quiz.passed events.
 */
export async function GET(request: Request) {
  const authError = requireCronToken(request);
  if (authError) return authError;

  const results = { trainingFlagged: 0, lessonReplayed: 0 };

  try {
    // A. Mark eligible training attendees
    const upd = await queryPostgres(
      `UPDATE portal_training_attendance
       SET certificate_status = 'Pending'
       WHERE attended IS TRUE
         AND (certificate_status IS NULL OR certificate_status = '')
       RETURNING id`,
    );
    results.trainingFlagged = upd.rows.length;
  } catch { /* ignore */ }

  try {
    // B. Re-publish quiz.passed events for lesson_completion rows that are eligible
    //    but their completion hasn't had a quiz.passed event in the last 24h
    const res = await queryPostgres(
      `SELECT lc.recorded_lesson_id AS "lessonId", lc.user_id AS "userId", lc.quiz_score AS "quizScore"
       FROM lesson_completion lc
       LEFT JOIN platform_events pe ON pe.event_type = 'quiz.passed'
         AND pe.entity_type = 'quiz_attempt'
         AND (pe.payload_json->>'lessonId')::int = lc.recorded_lesson_id
         AND (pe.payload_json->>'userId')::int = lc.user_id
         AND pe.occurred_at >= NOW() - INTERVAL '7 days'
       WHERE lc.certificate_eligible IS TRUE
         AND pe.id IS NULL
       LIMIT 100`,
    );
    for (const r of res.rows) {
      await publishEvent({
        eventType: "quiz.passed",
        actorUserId: Number(r.userId),
        entityType: "quiz_attempt",
        entityId: 0,
        payload: {
          lessonId: Number(r.lessonId),
          userId: Number(r.userId),
          scorePct: Number(r.quizScore ?? 100),
        },
      });
      results.lessonReplayed++;
    }
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, ...results, at: new Date().toISOString() });
}

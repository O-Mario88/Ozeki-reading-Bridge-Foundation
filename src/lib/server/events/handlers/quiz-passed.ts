import { queryPostgres } from "@/lib/server/postgres/client";
import { sendFinanceMail } from "@/lib/finance-email";
import {
  generateLessonCertificatePdf,
  generateLessonCertificateNumber,
} from "@/lib/server/pdf/lesson-certificate";
import type { EventHandler } from "../types";

/**
 * When a teacher passes a recorded-lesson quiz:
 *   1. If certificate_eligible is set → auto-generate PDF
 *   2. Auto-email to the teacher with attachment
 *   3. Mark certificate status on lesson_completion
 *
 * Replaces the previous manual "admin clicks issue" workflow.
 */
export const quizPassedHandler: EventHandler = {
  name: "quiz-passed.auto-certificate",
  eventType: "quiz.passed",
  async handle(event) {
    const lessonId = event.payload.lessonId ? Number(event.payload.lessonId) : null;
    const userId = event.payload.userId ? Number(event.payload.userId) : event.actorUserId;
    if (!lessonId || !userId) return { status: "skipped", reason: "missing lessonId or userId" };

    const res = await queryPostgres(
      `SELECT rl.slug, rl.title, rl.teacher_name AS "teacherName", rl.duration,
              lc.completed_at::text AS "completedAt",
              lc.quiz_score AS "quizScore",
              lc.certificate_eligible AS "certEligible",
              pu.full_name AS "participantName",
              pu.email AS "participantEmail"
       FROM lesson_completion lc
       JOIN recorded_lessons rl ON rl.id = lc.recorded_lesson_id
       JOIN portal_users pu ON pu.id = lc.user_id
       WHERE lc.recorded_lesson_id = $1 AND lc.user_id = $2 LIMIT 1`,
      [lessonId, userId],
    );
    if (res.rows.length === 0) return { status: "skipped", reason: "completion row not found" };
    const r = res.rows[0];
    if (!r.certEligible) return { status: "skipped", reason: "not certificate eligible" };

    const completedAt = r.completedAt ? String(r.completedAt) : new Date().toISOString();
    const completedDate = completedAt.slice(0, 10);
    const certificateNumber = generateLessonCertificateNumber(userId, lessonId, completedDate);
    const pdHours = r.duration ? Math.max(1, Math.round(Number(r.duration) / 3600)) : 1;

    try {
      const pdfBuffer = await generateLessonCertificatePdf({
        participantName: String(r.participantName ?? "Teacher"),
        lessonTitle: String(r.title ?? "Recorded Lesson"),
        completedDate,
        quizScore: r.quizScore !== null && r.quizScore !== undefined ? Number(r.quizScore) : null,
        lessonTeacherName: r.teacherName ? String(r.teacherName) : undefined,
        certificateNumber,
        issuedDate: new Date().toISOString().slice(0, 10),
        pdHours,
      });

      if (r.participantEmail) {
        await sendFinanceMail({
          to: [String(r.participantEmail)],
          subject: `🎓 Certificate Earned: ${r.title} — ${certificateNumber}`,
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:620px;color:#111827;line-height:1.55;">
              <h2 style="color:#205b96;">Congratulations, ${String(r.participantName ?? "")}!</h2>
              <p>You have passed the quiz for <strong>"${r.title}"</strong> and your Certificate of Completion is attached.</p>
              ${r.quizScore ? `<p>Quiz score: <strong>${Number(r.quizScore)}%</strong></p>` : ""}
              <p>Certificate number: <code style="font-family:monospace;background:#f3f4f6;padding:3px 8px;border-radius:4px;">${certificateNumber}</code></p>
              <p>— Ozeki Reading Bridge Foundation Academy</p>
            </div>
          `,
          attachments: [{ filename: `${certificateNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
        });
      }
      return { status: "ok", detail: { certificateNumber, emailed: Boolean(r.participantEmail) } };
    } catch (err) {
      return { status: "error", error: err instanceof Error ? err.message : String(err) };
    }
  },
};

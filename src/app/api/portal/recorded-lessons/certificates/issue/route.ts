import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  generateLessonCertificatePdf,
  generateLessonCertificateNumber,
} from "@/lib/server/pdf/lesson-certificate";
import { sendFinanceMail } from "@/lib/finance-email";

export const runtime = "nodejs";

const schema = z.object({
  lessonId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
  sendEmail: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const issuer = await requirePortalUser();
    const body = await request.json();
    const parsed = schema.parse(body);
    const userId = parsed.userId ?? issuer.id;

    const rows = await queryPostgres(
      `SELECT rl.id AS "lessonId", rl.slug, rl.title, rl.teacher_name AS "teacherName",
              rl.duration,
              lc.completed_at::text AS "completedAt",
              lc.quiz_score AS "quizScore",
              lc.certificate_eligible AS "certEligible",
              pu.full_name AS "participantName",
              pu.email AS "participantEmail"
       FROM lesson_completion lc
       JOIN recorded_lessons rl ON rl.id = lc.recorded_lesson_id
       JOIN portal_users pu ON pu.id = lc.user_id
       WHERE lc.recorded_lesson_id = $1 AND lc.user_id = $2 LIMIT 1`,
      [parsed.lessonId, userId],
    );
    if (rows.rows.length === 0) {
      return NextResponse.json({ error: "Completion record not found" }, { status: 404 });
    }
    const r = rows.rows[0];
    if (!r.certEligible) {
      return NextResponse.json({ error: "Not yet certificate-eligible (need watched ≥5min + passed quiz)" }, { status: 400 });
    }

    const completedAt = r.completedAt ? String(r.completedAt) : new Date().toISOString();
    const completedDate = completedAt.slice(0, 10);
    const certificateNumber = generateLessonCertificateNumber(userId, parsed.lessonId, completedDate);
    const pdHours = r.duration ? Math.max(1, Math.round(Number(r.duration) / 3600)) : 1;

    const pdfBuffer = await generateLessonCertificatePdf({
      participantName: String(r.participantName ?? "Unknown"),
      lessonTitle: String(r.title ?? "Ozeki Reading Bridge Lesson"),
      completedDate,
      quizScore: r.quizScore !== null && r.quizScore !== undefined ? Number(r.quizScore) : null,
      lessonTeacherName: r.teacherName ? String(r.teacherName) : undefined,
      certificateNumber,
      issuedDate: new Date().toISOString().slice(0, 10),
      pdHours,
    });

    let emailStatus = "skipped";
    if (parsed.sendEmail && r.participantEmail) {
      const emailRes = await sendFinanceMail({
        to: [String(r.participantEmail)],
        subject: `Certificate of Completion: ${r.title} — ${certificateNumber}`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:620px;color:#111827;line-height:1.55;">
            <h2 style="color:#205b96;margin:0 0 8px;">Congratulations, ${escapeHtml(String(r.participantName))}!</h2>
            <p>You have completed the professional development lesson <strong>"${escapeHtml(String(r.title))}"</strong> and earned your certificate.</p>
            ${r.quizScore !== null ? `<p>Final quiz score: <strong>${Number(r.quizScore)}%</strong></p>` : ""}
            <div style="margin:16px 0;padding:12px 16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#1e40af;">Certificate number</p>
              <p style="margin:4px 0 0;font-family:ui-monospace,SFMono-Regular,monospace;font-size:15px;font-weight:700;">${escapeHtml(certificateNumber)}</p>
            </div>
            <p>Keep learning, keep leading.<br/><strong>Ozeki Reading Bridge Foundation — Academy</strong></p>
          </div>
        `,
        attachments: [{ filename: `${certificateNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
      });
      emailStatus = emailRes.status;
    }

    return NextResponse.json({
      ok: true,
      certificateNumber,
      emailStatus,
      lessonId: parsed.lessonId,
      userId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/recorded-lessons/certificates/issue]", error);
    return NextResponse.json({ error: "Certificate issuance failed" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

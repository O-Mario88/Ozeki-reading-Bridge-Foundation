import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  listCertificateEligibleAttendeesPostgres,
  markCertificateIssuedPostgres,
  markCertificateEmailSentPostgres,
} from "@/lib/server/postgres/repositories/training-intelligence";
import {
  generateTrainingCertificatePdf,
  generateCertificateNumber,
} from "@/lib/server/pdf/training-certificate";
import { sendTrainingCertificateEmail } from "@/lib/training-email";

export const runtime = "nodejs";

const schema = z.object({
  portalRecordId: z.number().int().positive(),
  attendanceIds: z.array(z.number().int().positive()).optional(),
  sendEmail: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const body = await request.json();
    const parsed = schema.parse(body);

    // Lookup training record for topic + date
    const trainingRecord = await queryPostgres(
      `SELECT pr.id, pr.date::text AS "trainingDate", pr.training_topic AS "trainingTopic",
              pr.school_name AS "schoolName", pr.district,
              u.full_name AS "facilitatorName"
       FROM portal_records pr
       LEFT JOIN portal_users u ON u.id = pr.facilitator_user_id
       WHERE pr.id = $1 AND pr.module = 'training'`,
      [parsed.portalRecordId],
    );
    if (trainingRecord.rows.length === 0) {
      return NextResponse.json({ error: "Training session not found" }, { status: 404 });
    }
    const training = trainingRecord.rows[0];

    // Fetch eligible attendees
    const allEligible = await listCertificateEligibleAttendeesPostgres({
      portalRecordId: parsed.portalRecordId,
      includeIssued: false,
      limit: 1000,
    });

    const targets = parsed.attendanceIds
      ? allEligible.filter((a) => parsed.attendanceIds!.includes(a.attendanceId))
      : allEligible;

    const results: Array<{
      attendanceId: number;
      participantName: string;
      certificateNumber: string;
      issued: boolean;
      emailed: boolean;
      emailStatus: string;
      error?: string;
    }> = [];

    for (const attendee of targets) {
      const certificateNumber = generateCertificateNumber(attendee.attendanceId, String(training.trainingDate));
      const issuedDate = new Date().toISOString().slice(0, 10);

      try {
        const pdfBuffer = await generateTrainingCertificatePdf({
          participantName: attendee.participantName,
          participantRole: attendee.participantRole,
          trainingTopic: attendee.trainingTopic ?? training.trainingTopic ?? "Reading Bridge Training",
          trainingDate: String(training.trainingDate),
          schoolName: attendee.schoolName ?? training.schoolName ?? undefined,
          district: training.district ?? undefined,
          facilitatorName: attendee.facilitatorName ?? training.facilitatorName ?? undefined,
          certificateNumber,
          issuedDate,
        });

        await markCertificateIssuedPostgres(attendee.attendanceId, `/certificates/${certificateNumber}.pdf`);

        let emailed = false;
        let emailStatus = "skipped";
        if (parsed.sendEmail && attendee.email) {
          const emailResult = await sendTrainingCertificateEmail({
            to: attendee.email,
            participantName: attendee.participantName,
            trainingTopic: attendee.trainingTopic ?? training.trainingTopic ?? "Reading Bridge Training",
            trainingDate: String(training.trainingDate),
            certificateNumber,
            facilitatorName: attendee.facilitatorName ?? training.facilitatorName ?? undefined,
            pdfBuffer,
          });
          emailStatus = emailResult.status;
          if (emailResult.status === "sent") {
            await markCertificateEmailSentPostgres(attendee.attendanceId);
            emailed = true;
          }
        }

        results.push({
          attendanceId: attendee.attendanceId,
          participantName: attendee.participantName,
          certificateNumber,
          issued: true,
          emailed,
          emailStatus,
        });
      } catch (err) {
        results.push({
          attendanceId: attendee.attendanceId,
          participantName: attendee.participantName,
          certificateNumber,
          issued: false,
          emailed: false,
          emailStatus: "error",
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    return NextResponse.json({
      portalRecordId: parsed.portalRecordId,
      issuedBy: user.id,
      issuedAt: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        issued: results.filter((r) => r.issued).length,
        emailed: results.filter((r) => r.emailed).length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/training/certificates/issue]", error);
    return NextResponse.json({ error: "Failed to issue certificates" }, { status: 500 });
  }
}

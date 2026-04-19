import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  generateTrainingCertificatePdf,
  generateCertificateNumber,
} from "@/lib/server/pdf/training-certificate";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const attendanceId = Number(searchParams.get("attendanceId"));
    if (!attendanceId) {
      return NextResponse.json({ error: "attendanceId required" }, { status: 400 });
    }

    const rows = await queryPostgres(
      `SELECT pta.id AS "attendanceId",
              pta.participant_name AS "participantName",
              pta.participant_role AS "participantRole",
              pta.school_id AS "schoolId",
              sd.name AS "schoolName",
              pr.date::text AS "trainingDate",
              COALESCE(pr.training_topic, 'Ozeki Reading Bridge Training') AS "trainingTopic",
              pr.district,
              u.full_name AS "facilitatorName"
       FROM portal_training_attendance pta
       LEFT JOIN portal_records pr ON pr.id = pta.portal_record_id
       LEFT JOIN schools_directory sd ON sd.id = pta.school_id
       LEFT JOIN portal_users u ON u.id = pr.facilitator_user_id
       WHERE pta.id = $1`,
      [attendanceId],
    );
    if (rows.rows.length === 0) {
      return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    }
    const r = rows.rows[0];
    const certificateNumber = generateCertificateNumber(attendanceId, String(r.trainingDate));
    const pdfBuffer = await generateTrainingCertificatePdf({
      participantName: String(r.participantName),
      participantRole: String(r.participantRole ?? ""),
      trainingTopic: String(r.trainingTopic ?? "Ozeki Reading Bridge Training"),
      trainingDate: String(r.trainingDate ?? ""),
      schoolName: r.schoolName ? String(r.schoolName) : undefined,
      district: r.district ? String(r.district) : undefined,
      facilitatorName: r.facilitatorName ? String(r.facilitatorName) : undefined,
      certificateNumber,
      issuedDate: new Date().toISOString().slice(0, 10),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${certificateNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[api/portal/training/certificates/preview]", error);
    return NextResponse.json({ error: "Preview unavailable" }, { status: 500 });
  }
}

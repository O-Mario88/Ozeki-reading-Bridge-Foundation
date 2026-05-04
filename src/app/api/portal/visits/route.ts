import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const visitSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visitType: z.enum([
    "initial_diagnostic",
    "lesson_evaluation_coaching",
    "demo_lesson",
    "leadership_meeting",
    "endline_review",
    "follow_up",
  ]),
  coachUserId: z.coerce.number().int().positive().nullable().optional(),
  coachingCycleNumber: z.coerce.number().int().min(1).max(20).optional(),
  visitReason: z.string().trim().max(200).optional(),
  visitReasons: z.array(z.string().trim().min(1).max(100)).optional(),
  focusAreas: z.array(z.string().trim().min(1).max(100)).optional(),
  implementationStatus: z.enum(["not_started", "started", "partial", "full"]).optional(),
  visitPathway: z.enum(["observation", "demo_and_meeting", "mixed", "leadership"]).optional(),
  classesImplementing: z.array(z.string().trim().max(50)).optional(),
  classesNotImplementing: z.array(z.string().trim().max(50)).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  sponsorshipType: z.enum(["school", "district", "region", "general", "none"]).nullable().optional(),
  sponsoredByContactId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

/* ── GET — list with simple filters ───────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const p = req.nextUrl.searchParams;
    const schoolId = p.get("schoolId");
    const coachUserId = p.get("coachUserId");
    const limit = Math.min(500, Math.max(1, Number(p.get("limit") ?? 100)));

    const conds: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (schoolId) { conds.push(`cv.school_id = $${idx++}`); params.push(Number(schoolId)); }
    if (coachUserId) { conds.push(`cv.coach_user_id = $${idx++}`); params.push(Number(coachUserId)); }
    const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

    const res = await queryPostgres(
      `SELECT cv.id, cv.visit_uid, cv.school_id, cv.visit_date::text AS visit_date,
              cv.visit_type, cv.coaching_cycle_number, cv.coach_user_id,
              cv.implementation_status, cv.visit_pathway, cv.visit_reason,
              cv.focus_areas_json, cv.created_at::text AS created_at,
              s.name AS school_name, s.district,
              u.full_name AS coach_name
       FROM coaching_visits cv
       LEFT JOIN schools_directory s ON s.id = cv.school_id
       LEFT JOIN portal_users u ON u.id = cv.coach_user_id
       ${where}
       ORDER BY cv.visit_date DESC, cv.created_at DESC
       LIMIT ${limit}`,
      params,
    );
    return NextResponse.json({ visits: res.rows });
  } catch (error) {
    logger.error("[visits] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

/* ── POST — create new coaching visit ─────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalStaffUser();
    const parsed = visitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid visit payload." },
        { status: 400 },
      );
    }
    const v = parsed.data;
    const coachId = v.coachUserId ?? user.id;
    const visitUid = `CV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Default visit pathway by status if not provided
    const status = v.implementationStatus ?? "started";
    const pathway = v.visitPathway ?? (
      status === "not_started" ? "demo_and_meeting" :
      status === "partial" ? "mixed" : "observation"
    );

    const visitId = await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      try {
        // Verify school exists first — gives a clearer error than the foreign-key
        // violation that would otherwise trip later in the transaction.
        const schoolCheck = await client.query(
          `SELECT id, name FROM schools_directory WHERE id = $1 LIMIT 1`,
          [v.schoolId],
        );
        const schoolRow = schoolCheck.rows[0] as { id: number; name: string } | undefined;
        if (!schoolRow) {
          throw new Error(`School #${v.schoolId} not found.`);
        }

        // Create a portal_record for the audit trail. payload_json is TEXT
        // (not JSONB) per the foundation schema, so we serialise without the
        // ::jsonb cast that previously caused the INSERT to fail silently.
        const rec = await client.query(
          `INSERT INTO portal_records
             (module, school_id, school_name, date, status, program_type, payload_json, created_by_user_id)
           VALUES ('visit', $1, $2, $3::date, 'submitted', 'coaching', $4, $5)
           RETURNING id`,
          [schoolRow.id, schoolRow.name, v.visitDate, JSON.stringify(parsed.data), user.id],
        );
        const portalRecordId = Number((rec.rows[0] as { id: number }).id);

        const insertRes = await client.query(
          `INSERT INTO coaching_visits (
             visit_uid, portal_record_id, school_id, visit_date, visit_type,
             coaching_cycle_number, coach_user_id, focus_areas_json,
             implementation_status, visit_pathway, classes_implementing_json,
             classes_not_implementing_json, visit_reason,
             visit_reasons_json, time_from, time_to, sponsorship_type, sponsored_by_contact_id,
             created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
           RETURNING id`,
          [
            visitUid, portalRecordId, v.schoolId, v.visitDate, v.visitType,
            v.coachingCycleNumber ?? 1, coachId,
            JSON.stringify(v.focusAreas ?? []),
            status, pathway,
            JSON.stringify(v.classesImplementing ?? []),
            JSON.stringify(v.classesNotImplementing ?? []),
            v.visitReason ?? "lesson_evaluation_coaching",
            JSON.stringify(v.visitReasons ?? []),
            v.startTime ?? null, v.endTime ?? null,
            v.sponsorshipType ?? null, v.sponsoredByContactId ?? null,
          ],
        );
        await client.query("COMMIT");
        return Number((insertRes.rows[0] as { id: number }).id);
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      }
    });

    await auditLog({
      actor: user,
      action: "create",
      targetTable: "coaching_visits",
      targetId: visitId,
      after: { visitUid, schoolId: v.schoolId, visitDate: v.visitDate, coachUserId: coachId },
      detail: `Created visit ${visitUid} on school ${v.schoolId}`,
      request: req,
    });
    return NextResponse.json({ ok: true, id: visitId, visitUid }, { status: 201 });
  } catch (error) {
    // Surface the underlying message + pg error code (when available) to the
    // client. We're not exposing connection strings or row data — only the
    // diagnostic the operator needs to fix their input.
    const e = error as { message?: string; code?: string; detail?: string };
    logger.error("[visits] POST failed", {
      error: e?.message,
      code: e?.code,
      detail: e?.detail,
    });
    return NextResponse.json(
      {
        error: e?.message ?? "Internal error.",
        code: e?.code ?? null,
        detail: e?.detail ?? null,
      },
      { status: 500 },
    );
  }
}

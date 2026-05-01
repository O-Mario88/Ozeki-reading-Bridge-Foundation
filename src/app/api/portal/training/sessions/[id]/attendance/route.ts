import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { getTrainingSession } from "@/lib/training-db";
import { queryPostgres } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const attendanceSchema = z.object({
  action: z.enum(["join", "leave"]),
  participantId: z.coerce.number().int().positive().optional(),
  teacherUserId: z.coerce.number().int().positive().optional(),
  schoolId: z.coerce.number().int().positive().optional(),
});

/**
 * GET /api/portal/training/sessions/[id]/attendance
 * Returns all participant attendance records for the session.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const sessionId = parseInt(id, 10);

    const session = await getTrainingSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const isAdmin = user.isAdmin || user.isSuperAdmin;
    if (!isAdmin && Number(session.hostUserId) !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const result = await queryPostgres<{
      id: number;
      session_id: number;
      school_id: number | null;
      teacher_user_id: number | null;
      role: string;
      attendance_status: string;
      joined_at: string | null;
      left_at: string | null;
      created_at: string;
      full_name: string | null;
      school_name: string | null;
    }>(
      `SELECT
         p.id, p.session_id, p.school_id, p.teacher_user_id, p.role,
         p.attendance_status, p.joined_at, p.left_at, p.created_at,
         u.full_name,
         s.name AS school_name
       FROM online_training_participants p
       LEFT JOIN portal_users u ON u.id = p.teacher_user_id
       LEFT JOIN schools_directory s ON s.id = p.school_id
       WHERE p.session_id = $1
       ORDER BY p.joined_at ASC NULLS LAST, p.created_at ASC`,
      [sessionId],
    );

    return NextResponse.json({ participants: result.rows });
  } catch (error) {
    logger.error("[training/sessions/attendance] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

/**
 * POST /api/portal/training/sessions/[id]/attendance
 * Records a participant join or leave event.
 *
 * Body: { action: "join" | "leave", participantId?: number, teacherUserId?: number, schoolId?: number }
 *
 * - action="join": creates or updates participant record, sets joined_at and status="joined"
 * - action="leave": sets left_at and status="attended" (if they joined) or "missed"
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const sessionId = parseInt(id, 10);

    const session = await getTrainingSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const parsed = attendanceSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid attendance payload." },
        { status: 400 },
      );
    }
    const { action, participantId, teacherUserId, schoolId } = parsed.data;

    const now = new Date().toISOString();

    if (action === "join") {
      // Find or create participant row, then mark as joined
      let pid: number;
      const existing = teacherUserId
        ? await queryPostgres<{ id: number }>(
            `SELECT id FROM online_training_participants WHERE session_id = $1 AND teacher_user_id = $2 LIMIT 1`,
            [sessionId, teacherUserId],
          )
        : { rows: [] };

      if (existing.rows.length > 0) {
        pid = existing.rows[0].id;
        await queryPostgres(
          `UPDATE online_training_participants
           SET attendance_status = 'joined', joined_at = COALESCE(joined_at, $1)
           WHERE id = $2`,
          [now, pid],
        );
      } else {
        const ins = await queryPostgres<{ id: number }>(
          `INSERT INTO online_training_participants
             (session_id, school_id, teacher_user_id, role, attendance_status, joined_at)
           VALUES ($1, $2, $3, 'attendee', 'joined', $4)
           RETURNING id`,
          [sessionId, schoolId ?? null, teacherUserId ?? null, now],
        );
        pid = ins.rows[0].id;
      }
      return NextResponse.json({ ok: true, participantId: pid });
    }

    // action === "leave"
    if (!participantId && !teacherUserId) {
      return NextResponse.json({ error: "participantId or teacherUserId required for leave." }, { status: 400 });
    }

    const whereClause = participantId
      ? "id = $1"
      : "session_id = $2 AND teacher_user_id = $1";
    const whereValues = participantId
      ? [participantId]
      : [teacherUserId, sessionId];

    await queryPostgres(
      `UPDATE online_training_participants
       SET left_at = $${whereValues.length + 1},
           attendance_status = CASE WHEN joined_at IS NOT NULL THEN 'attended' ELSE 'missed' END
       WHERE ${whereClause}`,
      [...whereValues, now],
    );

    void user; // actor logged implicitly via session context
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[training/sessions/attendance] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

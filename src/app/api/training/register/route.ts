import { NextResponse } from "next/server";
import { z } from "zod";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

const schema = z.object({
  trainingScheduleId: z.number().int().positive(),
  schoolId: z.number().int().positive().optional(),
  participantName: z.string().trim().min(2).max(200),
  participantRole: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    // Verify schedule exists and is accepting registration
    const scheduleCheck = await queryPostgres(
      `SELECT id, topic, capacity, registered_count, status
       FROM training_schedule
       WHERE id = $1 AND status IN ('scheduled', 'open_registration')`,
      [parsed.trainingScheduleId],
    );
    if (scheduleCheck.rows.length === 0) {
      return NextResponse.json({ error: "Training not available for registration" }, { status: 404 });
    }
    const schedule = scheduleCheck.rows[0];
    if (schedule.capacity && Number(schedule.registered_count) >= Number(schedule.capacity)) {
      return NextResponse.json({ error: "Training is at full capacity" }, { status: 409 });
    }

    // Insert — unique constraint handles duplicate registrations
    try {
      await queryPostgres(
        `INSERT INTO training_schedule_registrations
           (training_schedule_id, school_id, participant_name, participant_role, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          parsed.trainingScheduleId,
          parsed.schoolId ?? null,
          parsed.participantName,
          parsed.participantRole ?? null,
          parsed.phone ?? null,
          parsed.email,
        ],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return NextResponse.json({ error: "You have already registered for this training" }, { status: 409 });
      }
      throw err;
    }

    await queryPostgres(
      `UPDATE training_schedule SET registered_count = registered_count + 1, updated_at = NOW() WHERE id = $1`,
      [parsed.trainingScheduleId],
    );

    return NextResponse.json({
      ok: true,
      topic: String(schedule.topic),
      message: `Thank you, ${parsed.participantName}. Your registration for "${String(schedule.topic)}" has been recorded.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/training/register]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

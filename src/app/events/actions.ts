"use server";

import { getCurrentPortalUser } from "@/lib/portal-auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { revalidatePath } from "next/cache";

export async function joinOnlineTrainingSessionAction(sessionId: number) {
  const user = await getCurrentPortalUser();
  if (!user) {
    return { error: "Authentication required", redirectTo: "/portal/login?continue=/events" };
  }

  // Check if they are already signed up
  const check = await queryPostgres(
    `SELECT 1 FROM online_training_participants WHERE session_id = $1 AND teacher_user_id = $2 LIMIT 1`,
    [sessionId, user.id]
  );

  if (check.rows.length === 0) {
    // Insert new participant record
    await queryPostgres(
      `
        INSERT INTO online_training_participants (
          session_id,
          teacher_user_id,
          role,
          attendance_status
        ) VALUES ($1, $2, 'attendee', 'joined')
      `,
      [sessionId, user.id]
    );

    // Increment attendee counter
    await queryPostgres(
      `UPDATE online_training_sessions SET attendee_count = attendee_count + 1, updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  }

  revalidatePath("/events");
  return { ok: true };
}

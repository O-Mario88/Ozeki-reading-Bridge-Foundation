import { queryPostgres } from "@/lib/server/postgres/client";

export type PublicUpcomingEvent = {
  id: number;
  topic: string;
  description: string | null;
  scheduledDate: string;          // YYYY-MM-DD
  scheduledStartTime: string | null; // HH:MM
  scheduledEndTime: string | null;
  venue: string | null;
  district: string | null;
  region: string | null;
  capacity: number | null;
  registeredCount: number;
  audience: string | null;
  status: "scheduled" | "open_registration" | "in_progress";
};

type Row = Record<string, unknown>;

function toEvent(row: Row): PublicUpcomingEvent {
  const raw = row.scheduled_date;
  const scheduledDate =
    raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw ?? "").slice(0, 10);
  return {
    id: Number(row.id),
    topic: String(row.topic ?? ""),
    description: (row.description ?? null) as string | null,
    scheduledDate,
    scheduledStartTime: row.scheduled_start_time ? String(row.scheduled_start_time).slice(0, 5) : null,
    scheduledEndTime: row.scheduled_end_time ? String(row.scheduled_end_time).slice(0, 5) : null,
    venue: (row.venue ?? null) as string | null,
    district: (row.district ?? null) as string | null,
    region: (row.region ?? null) as string | null,
    capacity: row.capacity == null ? null : Number(row.capacity),
    registeredCount: Number(row.registered_count ?? 0),
    audience: (row.audience ?? null) as string | null,
    status: String(row.status) as PublicUpcomingEvent["status"],
  };
}

/**
 * Returns the next N non-cancelled training_schedule rows with scheduled_date
 * on or after today. Used by the public homepage + /events page.
 *
 * Silently returns [] if training_schedule isn't present (fresh env bootstrap
 * before migration 0051 has run).
 */
export async function listUpcomingPublicEventsPostgres(
  limit = 3,
): Promise<PublicUpcomingEvent[]> {
  try {
    const res = await queryPostgres<Row>(
      `SELECT id, topic, description, scheduled_date, scheduled_start_time,
              scheduled_end_time, venue, district, region, capacity,
              registered_count, audience, status
         FROM training_schedule
        WHERE status IN ('scheduled', 'open_registration', 'in_progress')
          AND scheduled_date >= CURRENT_DATE
        ORDER BY scheduled_date ASC, scheduled_start_time ASC NULLS LAST
        LIMIT $1`,
      [Math.max(1, Math.min(24, limit))],
    );
    return res.rows.map(toEvent);
  } catch {
    return [];
  }
}

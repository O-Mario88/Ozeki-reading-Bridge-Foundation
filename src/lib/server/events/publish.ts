import { queryPostgres } from "@/lib/server/postgres/client";
import type { PlatformEventInput, PlatformEventRow } from "./types";
import { dispatchEvent } from "./dispatcher";

/**
 * Publish a platform event. The event is persisted first (durable ledger),
 * then handlers are dispatched asynchronously — failures don't block the caller.
 *
 * Call sites: every write endpoint that should trigger downstream automation.
 * If this helper throws, the caller's own transaction should not be rolled back —
 * we always prefer "data saved, automation retried later" over "data lost".
 */
export async function publishEvent(input: PlatformEventInput): Promise<number | null> {
  try {
    const res = await queryPostgres(
      `INSERT INTO platform_events (event_type, actor_user_id, entity_type, entity_id, payload_json)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, occurred_at`,
      [
        input.eventType,
        input.actorUserId ?? null,
        input.entityType ?? null,
        input.entityId !== undefined && input.entityId !== null ? String(input.entityId) : null,
        JSON.stringify(input.payload ?? {}),
      ],
    );
    const eventId = Number(res.rows[0]?.id ?? 0);
    if (!eventId) return null;

    const eventRow: PlatformEventRow = {
      id: eventId,
      eventType: input.eventType,
      occurredAt: String(res.rows[0]?.occurred_at ?? new Date().toISOString()),
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId !== undefined && input.entityId !== null ? String(input.entityId) : null,
      payload: input.payload ?? {},
      status: "pending",
      processedAt: null,
      errorMessage: null,
      retryCount: 0,
      handlerResults: [],
    };

    // Fire-and-forget dispatch. We don't await the return to avoid delaying the caller.
    dispatchEvent(eventRow).catch((err) => {
      console.error(`[events] dispatch failed for event ${eventId}`, err);
    });

    return eventId;
  } catch (err) {
    console.error("[events] publishEvent failed", err);
    return null;
  }
}

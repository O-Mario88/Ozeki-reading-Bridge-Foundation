import { queryPostgres } from "@/lib/server/postgres/client";
import type { EventHandler, PlatformEventRow, PlatformEventType } from "./types";
import { registeredHandlers } from "./handlers";

function getHandlersFor(type: PlatformEventType): EventHandler[] {
  return registeredHandlers.filter((h) => h.eventType === type);
}

async function logHandler(
  eventId: number,
  handlerName: string,
  status: "ok" | "error" | "skipped",
  durationMs: number,
  result?: unknown,
  errorMessage?: string,
) {
  try {
    await queryPostgres(
      `INSERT INTO automation_logs (event_id, handler_name, status, duration_ms, result_json, error_message)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [eventId, handlerName, status, durationMs, JSON.stringify(result ?? {}), errorMessage ?? null],
    );
  } catch (_e) { /* never fail automation because logging failed */ }
}

/**
 * Dispatch a published event to every registered handler for its type.
 * Runs each handler with its own try/catch so one failure doesn't stop the rest.
 * Persists results back to the event row for auditability.
 */
export async function dispatchEvent(event: PlatformEventRow): Promise<void> {
  const handlers = getHandlersFor(event.eventType);
  if (handlers.length === 0) {
    await queryPostgres(
      `UPDATE platform_events SET status = 'skipped', processed_at = NOW() WHERE id = $1`,
      [event.id],
    ).catch(() => {});
    return;
  }

  await queryPostgres(
    `UPDATE platform_events SET status = 'processing' WHERE id = $1`,
    [event.id],
  ).catch(() => {});

  const results: Array<{ handler: string; status: string; ms: number; result?: unknown; error?: string }> = [];
  let anyFailed = false;

  for (const handler of handlers) {
    const start = Date.now();
    try {
      const r = await handler.handle(event);
      const ms = Date.now() - start;
      if (r.status === "ok") {
        results.push({ handler: handler.name, status: "ok", ms, result: r.detail });
        await logHandler(event.id, handler.name, "ok", ms, r.detail);
      } else if (r.status === "skipped") {
        results.push({ handler: handler.name, status: "skipped", ms, result: { reason: r.reason } });
        await logHandler(event.id, handler.name, "skipped", ms, { reason: r.reason });
      } else {
        anyFailed = true;
        results.push({ handler: handler.name, status: "error", ms, error: r.error });
        await logHandler(event.id, handler.name, "error", ms, undefined, r.error);
      }
    } catch (err) {
      const ms = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      anyFailed = true;
      results.push({ handler: handler.name, status: "error", ms, error: msg });
      await logHandler(event.id, handler.name, "error", ms, undefined, msg);
    }
  }

  await queryPostgres(
    `UPDATE platform_events
     SET status = $2,
         processed_at = NOW(),
         handler_results_json = $3::jsonb,
         error_message = $4
     WHERE id = $1`,
    [
      event.id,
      anyFailed ? "failed" : "completed",
      JSON.stringify(results),
      anyFailed ? results.filter((r) => r.status === "error").map((r) => `${r.handler}: ${r.error}`).join("; ") : null,
    ],
  ).catch(() => {});
}

/**
 * Replay pending or failed events. Called by the cron worker.
 */
export async function processPendingEvents(options: { limit?: number; maxRetries?: number } = {}): Promise<{ processed: number; completed: number; failed: number }> {
  const limit = options.limit ?? 50;
  const maxRetries = options.maxRetries ?? 5;

  const res = await queryPostgres(
    `UPDATE platform_events
     SET retry_count = retry_count + 1, status = 'processing'
     WHERE id IN (
       SELECT id FROM platform_events
       WHERE (status = 'pending' OR (status = 'failed' AND retry_count < $2))
       ORDER BY occurred_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, event_type AS "eventType", occurred_at AS "occurredAt",
               actor_user_id AS "actorUserId", entity_type AS "entityType",
               entity_id AS "entityId", payload_json AS payload,
               retry_count AS "retryCount"`,
    [limit, maxRetries],
  );

  let completed = 0;
  let failed = 0;
  for (const r of res.rows) {
    const event: PlatformEventRow = {
      id: Number(r.id),
      eventType: r.eventType as PlatformEventType,
      occurredAt: String(r.occurredAt),
      actorUserId: r.actorUserId ? Number(r.actorUserId) : null,
      entityType: r.entityType ? String(r.entityType) : null,
      entityId: r.entityId ? String(r.entityId) : null,
      payload: (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload) ?? {},
      status: "processing",
      processedAt: null,
      errorMessage: null,
      retryCount: Number(r.retryCount ?? 0),
      handlerResults: [],
    };
    try {
      await dispatchEvent(event);
      completed++;
    } catch {
      failed++;
    }
  }
  return { processed: res.rows.length, completed, failed };
}

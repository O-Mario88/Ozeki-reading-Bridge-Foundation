import { queryPostgres } from "@/lib/server/postgres/client";

export type AutomationHealthSummary = {
  eventsPublishedToday: number;
  eventsCompletedToday: number;
  eventsFailedToday: number;
  eventsPendingTotal: number;
  handlerErrorRatePct: number;
  oldestPendingEventAgeMinutes: number | null;
  cronJobsRunToday: number;
  workflowsActive: number;
  workflowsFiredToday: number;
  notificationsDeliveredToday: number;
};

export async function getAutomationHealthSummaryPostgres(): Promise<AutomationHealthSummary> {
  const s: AutomationHealthSummary = {
    eventsPublishedToday: 0,
    eventsCompletedToday: 0,
    eventsFailedToday: 0,
    eventsPendingTotal: 0,
    handlerErrorRatePct: 0,
    oldestPendingEventAgeMinutes: null,
    cronJobsRunToday: 0,
    workflowsActive: 0,
    workflowsFiredToday: 0,
    notificationsDeliveredToday: 0,
  };

  try {
    const eventRes = await queryPostgres(
      `SELECT
         COUNT(*) FILTER (WHERE occurred_at::date = CURRENT_DATE)::int AS published,
         COUNT(*) FILTER (WHERE occurred_at::date = CURRENT_DATE AND status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE occurred_at::date = CURRENT_DATE AND status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE status IN ('pending', 'failed'))::int AS pending,
         EXTRACT(EPOCH FROM NOW() - MIN(occurred_at) FILTER (WHERE status IN ('pending', 'failed'))) / 60 AS oldest_age_mins
       FROM platform_events`,
    );
    const r = eventRes.rows[0] ?? {};
    s.eventsPublishedToday = Number(r.published ?? 0);
    s.eventsCompletedToday = Number(r.completed ?? 0);
    s.eventsFailedToday = Number(r.failed ?? 0);
    s.eventsPendingTotal = Number(r.pending ?? 0);
    s.oldestPendingEventAgeMinutes = r.oldest_age_mins !== null && r.oldest_age_mins !== undefined ? Number(r.oldest_age_mins) : null;
  } catch { /* ignore */ }

  try {
    const errRes = await queryPostgres(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'error')::int AS errors,
         COUNT(*)::int AS total
       FROM automation_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`,
    );
    const r = errRes.rows[0] ?? {};
    const total = Number(r.total ?? 0);
    s.handlerErrorRatePct = total > 0 ? Math.round(100 * Number(r.errors ?? 0) / total) : 0;
  } catch { /* ignore */ }

  try {
    const wfRes = await queryPostgres(
      `SELECT
         (SELECT COUNT(*) FROM workflows WHERE is_enabled IS TRUE)::int AS active,
         (SELECT COUNT(*) FROM workflow_executions WHERE matched IS TRUE AND executed_at::date = CURRENT_DATE)::int AS fired_today`,
    );
    const r = wfRes.rows[0] ?? {};
    s.workflowsActive = Number(r.active ?? 0);
    s.workflowsFiredToday = Number(r.fired_today ?? 0);
  } catch { /* ignore */ }

  try {
    const notifRes = await queryPostgres(
      `SELECT COUNT(*)::int AS n FROM in_app_notifications WHERE created_at::date = CURRENT_DATE`,
    );
    s.notificationsDeliveredToday = Number(notifRes.rows[0]?.n ?? 0);
  } catch { /* ignore */ }

  return s;
}

export type HandlerHealthRow = {
  handlerName: string;
  invocationsLast24h: number;
  errorsLast24h: number;
  errorRatePct: number;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
};

export async function getHandlerHealthPostgres(): Promise<HandlerHealthRow[]> {
  try {
    const res = await queryPostgres(
      `SELECT handler_name,
              COUNT(*)::int AS invocations,
              COUNT(*) FILTER (WHERE status = 'error')::int AS errors,
              AVG(duration_ms)::int AS avg_ms,
              PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY duration_ms)::int AS p95_ms
       FROM automation_logs
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY handler_name
       ORDER BY invocations DESC`,
    );
    return res.rows.map((r) => {
      const inv = Number(r.invocations ?? 0);
      const err = Number(r.errors ?? 0);
      return {
        handlerName: String(r.handler_name),
        invocationsLast24h: inv,
        errorsLast24h: err,
        errorRatePct: inv > 0 ? Math.round(100 * err / inv) : 0,
        avgDurationMs: r.avg_ms !== null && r.avg_ms !== undefined ? Number(r.avg_ms) : null,
        p95DurationMs: r.p95_ms !== null && r.p95_ms !== undefined ? Number(r.p95_ms) : null,
      };
    });
  } catch { return []; }
}

export type RecentEventRow = {
  id: number;
  eventType: string;
  status: string;
  occurredAt: string;
  durationMs: number | null;
  errorMessage: string | null;
};

export async function getRecentEventsPostgres(limit = 30): Promise<RecentEventRow[]> {
  try {
    const res = await queryPostgres(
      `SELECT id, event_type, status, occurred_at::text AS occurred_at,
              EXTRACT(EPOCH FROM processed_at - occurred_at) * 1000 AS duration_ms,
              error_message
       FROM platform_events
       ORDER BY occurred_at DESC LIMIT $1`,
      [limit],
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      eventType: String(r.event_type),
      status: String(r.status),
      occurredAt: String(r.occurred_at),
      durationMs: r.duration_ms !== null && r.duration_ms !== undefined ? Math.round(Number(r.duration_ms)) : null,
      errorMessage: r.error_message ? String(r.error_message) : null,
    }));
  } catch { return []; }
}

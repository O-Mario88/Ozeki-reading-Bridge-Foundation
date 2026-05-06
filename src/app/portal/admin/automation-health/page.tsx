import { requireAdmin } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import {
  getAutomationHealthSummaryPostgres,
  getHandlerHealthPostgres,
  getRecentEventsPostgres,
} from "@/lib/server/postgres/repositories/automation-health";

export const dynamic = "force-dynamic";

export default async function AutomationHealthPage() {
  const user = await requireAdmin();
  const [summary, handlers, events] = await Promise.all([
    getAutomationHealthSummaryPostgres(),
    getHandlerHealthPostgres(),
    getRecentEventsPostgres(40),
  ]);

  const pendingAlert = summary.eventsPendingTotal > 20 || (summary.oldestPendingEventAgeMinutes ?? 0) > 60;
  const errorAlert = summary.handlerErrorRatePct > 10;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/automation-health"
      title="Automation Health"
      description="Self-monitoring for the event bus, workflow engine, notification dispatcher, and cron jobs."
    >
      <div className="automation-health">
        <section className="auto-kpis">
          <article>
            <span>Events published today</span>
            <strong>{summary.eventsPublishedToday}</strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{summary.eventsCompletedToday}</strong>
          </article>
          <article className={summary.eventsFailedToday > 0 ? "is-warn" : ""}>
            <span>Failed today</span>
            <strong>{summary.eventsFailedToday}</strong>
          </article>
          <article className={pendingAlert ? "is-alert" : ""}>
            <span>Pending backlog</span>
            <strong>{summary.eventsPendingTotal}</strong>
            <small>
              {summary.oldestPendingEventAgeMinutes !== null
                ? `Oldest ${Math.round(summary.oldestPendingEventAgeMinutes)} min ago`
                : "—"}
            </small>
          </article>
          <article className={errorAlert ? "is-alert" : ""}>
            <span>Handler error rate (24h)</span>
            <strong>{summary.handlerErrorRatePct}%</strong>
          </article>
          <article>
            <span>Workflows active</span>
            <strong>{summary.workflowsActive}</strong>
            <small>{summary.workflowsFiredToday} fired today</small>
          </article>
          <article>
            <span>Notifications delivered today</span>
            <strong>{summary.notificationsDeliveredToday}</strong>
          </article>
        </section>

        <section className="auto-section">
          <h2>Handler performance (last 24h)</h2>
          <div className="auto-table">
            <DashboardListHeader template="minmax(0,1.6fr) 110px 80px 100px 90px 90px">
              <span>Handler</span>
              <span>Invocations</span>
              <span>Errors</span>
              <span>Error rate</span>
              <span>Avg ms</span>
              <span>p95 ms</span>
            </DashboardListHeader>
            {handlers.length === 0 ? (
              <div className="auto-empty py-3">No handler activity in the last 24 hours.</div>
            ) : handlers.map((h) => (
              <DashboardListRow
                key={h.handlerName}
                template="minmax(0,1.6fr) 110px 80px 100px 90px 90px"
                className={h.errorRatePct > 10 ? "row-alert" : h.errorRatePct > 0 ? "row-warn" : ""}
              >
                <span className="min-w-0"><code className="truncate inline-block max-w-full">{h.handlerName}</code></span>
                <span>{h.invocationsLast24h}</span>
                <span>{h.errorsLast24h}</span>
                <span>{h.errorRatePct}%</span>
                <span>{h.avgDurationMs ?? "—"}</span>
                <span>{h.p95DurationMs ?? "—"}</span>
              </DashboardListRow>
            ))}
          </div>
        </section>

        <section className="auto-section">
          <h2>Recent events</h2>
          <div className="auto-table">
            <DashboardListHeader template="100px minmax(0,1.4fr) 110px 100px minmax(0,1.6fr)">
              <span>Time</span>
              <span>Event type</span>
              <span>Status</span>
              <span>Duration</span>
              <span>Error</span>
            </DashboardListHeader>
            {events.length === 0 ? (
              <div className="auto-empty py-3">No events yet. Publish one from a write endpoint to see activity.</div>
            ) : events.map((e) => (
              <DashboardListRow
                key={e.id}
                template="100px minmax(0,1.4fr) 110px 100px minmax(0,1.6fr)"
                className={e.status === "failed" ? "row-alert" : ""}
              >
                <span><small>{new Date(e.occurredAt).toLocaleTimeString()}</small></span>
                <span className="min-w-0"><code className="truncate inline-block max-w-full">{e.eventType}</code></span>
                <span>
                  <span className={`auto-status auto-status-${e.status}`}>{e.status}</span>
                </span>
                <span>{e.durationMs !== null ? `${e.durationMs} ms` : "—"}</span>
                <span className="min-w-0">{e.errorMessage ? <small className="auto-error truncate inline-block max-w-full">{e.errorMessage.slice(0, 120)}</small> : "—"}</span>
              </DashboardListRow>
            ))}
          </div>
        </section>

        <section className="auto-section auto-cron-panel">
          <h2>Cron schedule</h2>
          <p className="text-gray-500">Configure an external scheduler (Railway cron, Vercel cron, cron-as-a-service) to invoke:</p>
          <ul>
            <li><code>GET /api/cron/dispatch</code> — <strong>every hour</strong> (fan-out to all scheduled jobs)</li>
            <li>Individual jobs can also be triggered directly:</li>
            <li style={{ paddingLeft: 20 }}><code>/api/cron/process-events</code> — drain pending events</li>
            <li style={{ paddingLeft: 20 }}><code>/api/cron/refresh-kpis</code> — rebuild KPI snapshots</li>
            <li style={{ paddingLeft: 20 }}><code>/api/cron/digest</code> — email digest</li>
            <li style={{ paddingLeft: 20 }}><code>/api/cron/auto-issue-certificates</code> — catch orphaned eligibles</li>
            <li style={{ paddingLeft: 20 }}><code>/api/cron/sync-recordings</code> — Drive → Vimeo sync</li>
          </ul>
          <p className="text-gray-500">All endpoints require <code>Authorization: Bearer $CRON_SECRET_TOKEN</code>.</p>
        </section>
      </div>
    </PortalShell>
  );
}

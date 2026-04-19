import { requireAdmin } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
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
          <table className="auto-table">
            <thead>
              <tr>
                <th>Handler</th>
                <th>Invocations</th>
                <th>Errors</th>
                <th>Error rate</th>
                <th>Avg ms</th>
                <th>p95 ms</th>
              </tr>
            </thead>
            <tbody>
              {handlers.length === 0 ? (
                <tr><td colSpan={6} className="auto-empty">No handler activity in the last 24 hours.</td></tr>
              ) : handlers.map((h) => (
                <tr key={h.handlerName} className={h.errorRatePct > 10 ? "row-alert" : h.errorRatePct > 0 ? "row-warn" : ""}>
                  <td><code>{h.handlerName}</code></td>
                  <td>{h.invocationsLast24h}</td>
                  <td>{h.errorsLast24h}</td>
                  <td>{h.errorRatePct}%</td>
                  <td>{h.avgDurationMs ?? "—"}</td>
                  <td>{h.p95DurationMs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="auto-section">
          <h2>Recent events</h2>
          <table className="auto-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event type</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={5} className="auto-empty">No events yet. Publish one from a write endpoint to see activity.</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className={e.status === "failed" ? "row-alert" : ""}>
                  <td><small>{new Date(e.occurredAt).toLocaleTimeString()}</small></td>
                  <td><code>{e.eventType}</code></td>
                  <td>
                    <span className={`auto-status auto-status-${e.status}`}>{e.status}</span>
                  </td>
                  <td>{e.durationMs !== null ? `${e.durationMs} ms` : "—"}</td>
                  <td>{e.errorMessage ? <small className="auto-error">{e.errorMessage.slice(0, 120)}</small> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="auto-section auto-cron-panel">
          <h2>Cron schedule</h2>
          <p className="text-gray-500">Configure an external scheduler (Vercel, Amplify, cron-as-a-service) to invoke:</p>
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

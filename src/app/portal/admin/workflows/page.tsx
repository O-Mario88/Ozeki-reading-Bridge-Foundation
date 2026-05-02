import { requireAdmin } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { listWorkflowsPostgres } from "@/lib/server/postgres/repositories/workflows";

export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  "observation.submitted",
  "assessment.submitted",
  "quiz.passed",
  "lesson.completed",
  "training.session.recorded",
  "coaching.visit.logged",
  "donation.completed",
  "sponsorship.completed",
  "school.flagged.at_risk",
  "support.request.created",
];

export default async function WorkflowsAdminPage() {
  const user = await requireAdmin();
  const workflows = await listWorkflowsPostgres({});

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/workflows"
      title="Workflow Engine"
      description="Configure automation rules without a code deploy. Rules react to platform events and execute actions like emails, interventions, or certificate issuance."
    >
      <div className="workflows-admin">
        <section className="workflows-intro">
          <div>
            <h3>How workflows work</h3>
            <p>
              When a staff member submits an observation, an assessment, or any tracked event, the
              platform publishes it to the event bus. Every enabled workflow is evaluated against that
              event; if all conditions pass, its actions fire.
            </p>
            <p>Events currently supported: <code>{EVENT_TYPES.join(", ")}</code></p>
          </div>
        </section>

        <section className="workflows-list">
          <header className="workflows-list-header">
            <h2>Active rules ({workflows.length})</h2>
          </header>

          {workflows.length === 0 ? (
            <p className="text-gray-500">No workflows yet. Default rules should seed automatically on the next deploy.</p>
          ) : (
            <div className="workflows-table">
              <DashboardListHeader template="60px minmax(0,1.4fr) minmax(0,1.1fr) minmax(0,1.4fr) minmax(0,1.2fr) 140px 80px">
                <span>Status</span>
                <span>Name</span>
                <span>Trigger</span>
                <span>Conditions</span>
                <span>Actions</span>
                <span>Last fired</span>
                <span>Fire count</span>
              </DashboardListHeader>
              {workflows.map((w) => (
                <DashboardListRow
                  key={w.id}
                  template="60px minmax(0,1.4fr) minmax(0,1.1fr) minmax(0,1.4fr) minmax(0,1.2fr) 140px 80px"
                  className={w.isEnabled ? "" : "workflow-disabled"}
                >
                  <span>
                    <span className={`workflow-pill ${w.isEnabled ? "workflow-pill-on" : "workflow-pill-off"}`}>
                      {w.isEnabled ? "ON" : "OFF"}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate">{w.name}</strong>
                    {w.description ? <small className="block text-gray-500 truncate">{w.description}</small> : null}
                  </span>
                  <span className="min-w-0"><code className="truncate inline-block max-w-full">{w.triggerEvent}</code></span>
                  <span className="min-w-0">
                    {w.conditions.length === 0 ? (
                      <small className="text-gray-400">always</small>
                    ) : (
                      <ul className="workflow-list m-0 p-0">
                        {w.conditions.map((c, i) => (
                          <li key={i}><code>{c.field}</code> {c.operator} {c.value !== undefined ? <code>{JSON.stringify(c.value)}</code> : ""}</li>
                        ))}
                      </ul>
                    )}
                  </span>
                  <span className="min-w-0">
                    <ul className="workflow-list m-0 p-0">
                      {w.actions.map((a, i) => (
                        <li key={i}><strong>{a.type}</strong></li>
                      ))}
                    </ul>
                  </span>
                  <span><small>{w.lastFiredAt ? new Date(w.lastFiredAt).toLocaleString() : "—"}</small></span>
                  <span><strong>{w.fireCount}</strong></span>
                </DashboardListRow>
              ))}
            </div>
          )}
        </section>

        <section className="workflows-create">
          <h3>Create a new workflow</h3>
          <p className="text-gray-500">POST to <code>/api/portal/workflows</code> with <code>{"{ name, triggerEvent, conditions, actions }"}</code>. Full form UI coming next.</p>
          <pre className="workflows-example">
{`POST /api/portal/workflows
{
  "name": "Alert coach on low-rating observation",
  "triggerEvent": "observation.submitted",
  "conditions": [
    { "field": "rating", "operator": "equals", "value": "low" }
  ],
  "actions": [
    { "type": "email_admins", "subject": "Low-rating observation flagged" },
    { "type": "seed_intervention", "daysOut": 7, "actionType": "urgent_coaching_review" }
  ]
}`}
          </pre>
        </section>
      </div>
    </PortalShell>
  );
}

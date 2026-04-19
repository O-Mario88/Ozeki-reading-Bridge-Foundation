import { requireAdmin } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
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
            <table className="workflows-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Trigger</th>
                  <th>Conditions</th>
                  <th>Actions</th>
                  <th>Last fired</th>
                  <th>Fire count</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr key={w.id} className={w.isEnabled ? "" : "workflow-disabled"}>
                    <td>
                      <span className={`workflow-pill ${w.isEnabled ? "workflow-pill-on" : "workflow-pill-off"}`}>
                        {w.isEnabled ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td>
                      <strong>{w.name}</strong>
                      {w.description ? <><br /><small>{w.description}</small></> : null}
                    </td>
                    <td><code>{w.triggerEvent}</code></td>
                    <td>
                      {w.conditions.length === 0 ? (
                        <small className="text-gray-400">always</small>
                      ) : (
                        <ul className="workflow-list">
                          {w.conditions.map((c, i) => (
                            <li key={i}><code>{c.field}</code> {c.operator} {c.value !== undefined ? <code>{JSON.stringify(c.value)}</code> : ""}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <ul className="workflow-list">
                        {w.actions.map((a, i) => (
                          <li key={i}><strong>{a.type}</strong></li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <small>{w.lastFiredAt ? new Date(w.lastFiredAt).toLocaleString() : "—"}</small>
                    </td>
                    <td><strong>{w.fireCount}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
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

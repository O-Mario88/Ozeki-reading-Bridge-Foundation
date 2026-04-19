import { sendFinanceMail } from "@/lib/finance-email";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  listWorkflowsPostgres,
  recordWorkflowExecutionPostgres,
  type WorkflowCondition,
  type WorkflowAction,
  type WorkflowRow,
} from "@/lib/server/postgres/repositories/workflows";
import type { EventHandler, PlatformEventRow, PlatformEventType } from "../types";

function getFieldValue(event: PlatformEventRow, field: string): unknown {
  if (field === "eventType") return event.eventType;
  if (field === "actorUserId") return event.actorUserId;
  if (field === "entityId") return event.entityId;
  if (field.startsWith("payload.")) {
    return event.payload[field.slice("payload.".length)];
  }
  return event.payload[field];
}

function evaluateCondition(event: PlatformEventRow, c: WorkflowCondition): boolean {
  const actual = getFieldValue(event, c.field);
  switch (c.operator) {
    case "equals": return actual === c.value;
    case "not_equals": return actual !== c.value;
    case "greater_than": return typeof actual === "number" && typeof c.value === "number" && actual > c.value;
    case "less_than": return typeof actual === "number" && typeof c.value === "number" && actual < c.value;
    case "contains":
      return typeof actual === "string" && typeof c.value === "string" && actual.includes(c.value);
    case "exists":
      return actual !== null && actual !== undefined;
    default: return false;
  }
}

function conditionsPass(event: PlatformEventRow, conditions: WorkflowCondition[]): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(event, c));
}

async function executeAction(event: PlatformEventRow, action: WorkflowAction): Promise<Record<string, unknown>> {
  switch (action.type) {
    case "email_admins": {
      try {
        const adminRes = await queryPostgres(
          `SELECT email FROM portal_users WHERE (is_admin IS TRUE OR is_superadmin IS TRUE) AND email IS NOT NULL LIMIT 10`,
        );
        const recipients = adminRes.rows.map((r) => String(r.email)).filter(Boolean);
        if (recipients.length === 0) return { sent: 0 };
        await sendFinanceMail({
          to: recipients,
          subject: String(action.subject ?? `Workflow alert: ${event.eventType}`),
          html: `
            <div style="font-family:system-ui,sans-serif;color:#111827;">
              <h3>${event.eventType}</h3>
              <pre style="background:#f3f4f6;padding:10px;border-radius:6px;font-size:11px;">${JSON.stringify(event.payload, null, 2)}</pre>
              <p><a href="https://ozekiread.org/portal/command-center">Open Command Center →</a></p>
            </div>
          `,
        });
        return { sent: recipients.length };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }
    case "seed_intervention": {
      try {
        const schoolId = event.payload.schoolId ? Number(event.payload.schoolId) : null;
        const ownerUserId = event.actorUserId;
        if (!schoolId || !ownerUserId) return { skipped: "no schoolId or actor" };
        const daysOut = Number(action.daysOut ?? 14);
        const actionType = String(action.actionType ?? "workflow_follow_up");

        const planRes = await queryPostgres(
          `SELECT plan_id FROM intervention_plan WHERE school_id = $1 AND status IN ('planned','in_progress') ORDER BY created_at DESC LIMIT 1`,
          [schoolId],
        );
        let planId = planRes.rows[0]?.plan_id;
        if (!planId) {
          const created = await queryPostgres(
            `INSERT INTO intervention_plan (scope_type, scope_id, school_id, title, created_by, status)
             VALUES ('school', $1::text, $1, 'Workflow-seeded plan', $2, 'in_progress') RETURNING plan_id`,
            [schoolId, ownerUserId],
          );
          planId = created.rows[0]?.plan_id;
        }
        if (!planId) return { error: "could not resolve plan" };
        await queryPostgres(
          `INSERT INTO intervention_actions (plan_id, action_type, owner_user_id, due_date, status)
           VALUES ($1, $2, $3, (CURRENT_DATE + ($4 || ' days')::interval)::text, 'planned')`,
          [planId, actionType, ownerUserId, String(daysOut)],
        );
        return { seeded: true, planId, actionType };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }
    case "issue_lesson_certificate":
    case "issue_training_certificate":
      // These actions are already fired by dedicated handlers; just record.
      return { handledBy: "dedicated_handler" };
    case "publish_event": {
      try {
        const { publishEvent } = await import("../publish");
        await publishEvent({
          eventType: String(action.eventType ?? "log") as PlatformEventType,
          actorUserId: event.actorUserId,
          entityType: "workflow",
          entityId: event.id,
          payload: (action.payload as Record<string, unknown>) ?? {},
        });
        return { published: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }
    case "log":
      return { logged: true };
    default:
      return { skipped: "unknown action type" };
  }
}

/**
 * Universal workflow-runner handler: subscribes to a wildcard-like set of events
 * by registering once per known event type. For simplicity we keep it as a single
 * handler that the dispatcher invokes per event; it loads matching workflows at runtime.
 */
async function runWorkflowsForEvent(event: PlatformEventRow) {
  const workflows = await listWorkflowsPostgres({
    triggerEvent: event.eventType,
    enabledOnly: true,
  });
  for (const wf of workflows) {
    const start = Date.now();
    const matched = conditionsPass(event, wf.conditions);
    const results: unknown[] = [];
    let errorMessage: string | undefined;

    if (matched) {
      for (const action of wf.actions) {
        try {
          const r = await executeAction(event, action);
          results.push({ action: action.type, result: r });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ action: action.type, error: msg });
          errorMessage = msg;
        }
      }
    }

    await recordWorkflowExecutionPostgres({
      workflowId: wf.id,
      eventId: event.id,
      matched,
      actionsResults: results,
      durationMs: Date.now() - start,
      errorMessage,
    });
  }
}

function makeWorkflowHandler(eventType: PlatformEventType): EventHandler {
  return {
    name: `workflow-runner.${eventType}`,
    eventType,
    async handle(event) {
      try {
        await runWorkflowsForEvent(event);
        return { status: "ok" };
      } catch (err) {
        return { status: "error", error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/**
 * All event types that should route through the user-configurable workflow engine.
 * Add new types here as they are introduced.
 */
export const workflowHandlers: EventHandler[] = [
  makeWorkflowHandler("observation.submitted"),
  makeWorkflowHandler("assessment.submitted"),
  makeWorkflowHandler("quiz.passed"),
  makeWorkflowHandler("lesson.completed"),
  makeWorkflowHandler("training.session.recorded"),
  makeWorkflowHandler("coaching.visit.logged"),
  makeWorkflowHandler("donation.completed"),
  makeWorkflowHandler("sponsorship.completed"),
  makeWorkflowHandler("school.flagged.at_risk"),
  makeWorkflowHandler("support.request.created"),
];

// Ignore unused imports for the dedicated WorkflowRow type
export type { WorkflowRow };

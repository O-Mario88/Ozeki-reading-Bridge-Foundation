import { queryPostgres } from "@/lib/server/postgres/client";

export type WorkflowCondition = {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "exists";
  value?: unknown;
};

export type WorkflowAction = {
  type: "email_admins" | "seed_intervention" | "issue_lesson_certificate" | "issue_training_certificate" | "publish_event" | "log";
  [key: string]: unknown;
};

export type WorkflowRow = {
  id: number;
  name: string;
  description: string | null;
  triggerEvent: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isEnabled: boolean;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  lastFiredAt: string | null;
  fireCount: number;
};

export type WorkflowExecutionRow = {
  id: number;
  workflowId: number;
  eventId: number | null;
  matched: boolean;
  actionsResults: Array<Record<string, unknown>>;
  durationMs: number | null;
  errorMessage: string | null;
  executedAt: string;
};

function mapWorkflow(r: Record<string, unknown>): WorkflowRow {
  const conds = typeof r.conditions_json === "string" ? JSON.parse(r.conditions_json) : r.conditions_json;
  const acts = typeof r.actions_json === "string" ? JSON.parse(r.actions_json) : r.actions_json;
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    description: r.description ? String(r.description) : null,
    triggerEvent: String(r.trigger_event ?? ""),
    conditions: Array.isArray(conds) ? (conds as WorkflowCondition[]) : [],
    actions: Array.isArray(acts) ? (acts as WorkflowAction[]) : [],
    isEnabled: Boolean(r.is_enabled),
    createdByUserId: r.created_by_user_id ? Number(r.created_by_user_id) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    lastFiredAt: r.last_fired_at ? String(r.last_fired_at) : null,
    fireCount: Number(r.fire_count ?? 0),
  };
}

export async function listWorkflowsPostgres(options: { triggerEvent?: string; enabledOnly?: boolean } = {}): Promise<WorkflowRow[]> {
  try {
    const params: unknown[] = [];
    const filters: string[] = [];
    if (options.triggerEvent) {
      params.push(options.triggerEvent);
      filters.push(`trigger_event = $${params.length}`);
    }
    if (options.enabledOnly) filters.push(`is_enabled IS TRUE`);
    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const res = await queryPostgres(
      `SELECT * FROM workflows ${where} ORDER BY trigger_event, name`,
      params,
    );
    return res.rows.map(mapWorkflow);
  } catch { return []; }
}

export async function getWorkflowByIdPostgres(id: number): Promise<WorkflowRow | null> {
  try {
    const res = await queryPostgres(`SELECT * FROM workflows WHERE id = $1`, [id]);
    return res.rows.length > 0 ? mapWorkflow(res.rows[0]) : null;
  } catch { return null; }
}

export async function createWorkflowPostgres(input: {
  name: string;
  description?: string;
  triggerEvent: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  createdByUserId: number;
  isEnabled?: boolean;
}): Promise<number> {
  const res = await queryPostgres(
    `INSERT INTO workflows (name, description, trigger_event, conditions_json, actions_json, is_enabled, created_by_user_id)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
     RETURNING id`,
    [
      input.name,
      input.description ?? null,
      input.triggerEvent,
      JSON.stringify(input.conditions),
      JSON.stringify(input.actions),
      input.isEnabled ?? true,
      input.createdByUserId,
    ],
  );
  return Number(res.rows[0]?.id ?? 0);
}

export async function updateWorkflowPostgres(id: number, input: Partial<{
  name: string;
  description: string | null;
  triggerEvent: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isEnabled: boolean;
}>): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) { updates.push(`name = $${i++}`); values.push(input.name); }
  if (input.description !== undefined) { updates.push(`description = $${i++}`); values.push(input.description); }
  if (input.triggerEvent !== undefined) { updates.push(`trigger_event = $${i++}`); values.push(input.triggerEvent); }
  if (input.conditions !== undefined) { updates.push(`conditions_json = $${i++}::jsonb`); values.push(JSON.stringify(input.conditions)); }
  if (input.actions !== undefined) { updates.push(`actions_json = $${i++}::jsonb`); values.push(JSON.stringify(input.actions)); }
  if (input.isEnabled !== undefined) { updates.push(`is_enabled = $${i++}`); values.push(input.isEnabled); }
  if (updates.length === 0) return;
  updates.push(`updated_at = NOW()`);
  values.push(id);
  await queryPostgres(`UPDATE workflows SET ${updates.join(", ")} WHERE id = $${i}`, values);
}

export async function recordWorkflowExecutionPostgres(input: {
  workflowId: number;
  eventId: number;
  matched: boolean;
  actionsResults: unknown[];
  durationMs: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await queryPostgres(
      `INSERT INTO workflow_executions (workflow_id, event_id, matched, actions_results_json, duration_ms, error_message)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [
        input.workflowId,
        input.eventId,
        input.matched,
        JSON.stringify(input.actionsResults),
        input.durationMs,
        input.errorMessage ?? null,
      ],
    );
    if (input.matched) {
      await queryPostgres(
        `UPDATE workflows SET last_fired_at = NOW(), fire_count = fire_count + 1 WHERE id = $1`,
        [input.workflowId],
      );
    }
  } catch { /* logging is non-fatal */ }
}

export async function getWorkflowExecutionStatsPostgres(workflowId: number): Promise<{
  totalExecutions: number;
  matched: number;
  errors: number;
  lastExecutedAt: string | null;
  recent: WorkflowExecutionRow[];
}> {
  try {
    const stats = await queryPostgres(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE matched IS TRUE)::int AS matched,
              COUNT(*) FILTER (WHERE error_message IS NOT NULL)::int AS errors,
              MAX(executed_at)::text AS last_at
       FROM workflow_executions WHERE workflow_id = $1`,
      [workflowId],
    );
    const recent = await queryPostgres(
      `SELECT * FROM workflow_executions WHERE workflow_id = $1 ORDER BY executed_at DESC LIMIT 20`,
      [workflowId],
    );
    const row = stats.rows[0] ?? {};
    return {
      totalExecutions: Number(row.total ?? 0),
      matched: Number(row.matched ?? 0),
      errors: Number(row.errors ?? 0),
      lastExecutedAt: row.last_at ? String(row.last_at) : null,
      recent: recent.rows.map((r) => ({
        id: Number(r.id),
        workflowId: Number(r.workflow_id),
        eventId: r.event_id ? Number(r.event_id) : null,
        matched: Boolean(r.matched),
        actionsResults: typeof r.actions_results_json === "string" ? JSON.parse(r.actions_results_json) : r.actions_results_json,
        durationMs: r.duration_ms !== null && r.duration_ms !== undefined ? Number(r.duration_ms) : null,
        errorMessage: r.error_message ? String(r.error_message) : null,
        executedAt: String(r.executed_at),
      })),
    };
  } catch {
    return { totalExecutions: 0, matched: 0, errors: 0, lastExecutedAt: null, recent: [] };
  }
}

/**
 * Read API for the /portal/interventions dashboard.
 *
 * Each function maps 1:1 to a card on the page. Empty results return
 * `null` (or `[]` for list endpoints) so the page can fall through to
 * its FALLBACK constant and render the screenshot mock when the
 * intervention_* tables are empty. None of these functions throw on
 * missing tables — Postgres errors bubble up to the caller, which
 * catches them and falls back too.
 *
 * Tables: see database/postgres/0061_interventions.sql
 */

import { queryPostgres } from "@/lib/server/postgres/client";

/* ── Types ─────────────────────────────────────────────────────────── */

export type InterventionsKpis = {
  activePlans: number;
  schoolsUnderIntervention: number;
  openActions: number;
  overdueActions: number;
  ownersAssigned: number;
  avgPlanCompletionPct: number;
  highRiskSchools: number;
};

export type InterventionPlanRow = {
  id: string;
  title: string;
  scope: string;
  ownerName: string | null;
  ownerInitials: string;
  status: string;
  progress: number;
  due: string | null;            // ISO date
  risk: "Low" | "Medium" | "High";
  updated: string | null;        // ISO timestamp
};

export type InterventionTrendPoint = { month: string; pct: number };
export type InterventionTypeMixRow = { label: string; value: number; pct: number };
export type InterventionFunnelRow = { label: string; value: number; pct: number };
export type InterventionRegionRow = { name: string; value: number };

export type PriorityQueueRow = {
  plan: string;
  issue: string;
  risk: "Low" | "Medium" | "High";
  due: string | null;
};

export type PlanActionRow = {
  action: string;
  plan: string;
  ownerName: string | null;
  due: string | null;
  status: string;
};

export type OwnerWorkloadRow = {
  ownerName: string;
  activePlans: number;
  avgCompletionPct: number;
};

export type InterventionActivityRow = {
  kind: string;
  message: string;
  occurredAt: string;
};

export type InterventionEvidenceRow = {
  fileName: string;
  fileKind: string;
  planId: string | null;
  uploaderName: string | null;
  uploadedAt: string;
  status: string;
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function initialsFrom(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/* ── KPIs ──────────────────────────────────────────────────────────── */

export async function getInterventionsKpis(): Promise<InterventionsKpis | null> {
  const res = await queryPostgres<{
    active_plans: string;
    schools_under: string;
    open_actions: string;
    overdue_actions: string;
    owners_assigned: string;
    avg_completion: string | null;
    high_risk_schools: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM intervention_plans
          WHERE status NOT IN ('Completed','Verified')) AS active_plans,
       (SELECT COALESCE(SUM(schools_count), 0)::int FROM intervention_plans
          WHERE status NOT IN ('Completed','Verified')) AS schools_under,
       (SELECT COUNT(*)::int FROM intervention_plan_actions
          WHERE status IN ('Pending','In Progress')) AS open_actions,
       (SELECT COUNT(*)::int FROM intervention_plan_actions
          WHERE status IN ('Pending','In Progress')
            AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS overdue_actions,
       (SELECT COUNT(DISTINCT owner_user_id)::int FROM intervention_plans
          WHERE owner_user_id IS NOT NULL
            AND status NOT IN ('Completed','Verified')) AS owners_assigned,
       (SELECT AVG(progress_pct)::int FROM intervention_plans
          WHERE status NOT IN ('Completed','Verified')) AS avg_completion,
       (SELECT COALESCE(SUM(schools_count), 0)::int FROM intervention_plans
          WHERE high_risk = TRUE
            AND status NOT IN ('Completed','Verified')) AS high_risk_schools`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const activePlans = Number(r.active_plans) || 0;
  if (activePlans === 0) return null;
  return {
    activePlans,
    schoolsUnderIntervention: Number(r.schools_under) || 0,
    openActions:              Number(r.open_actions) || 0,
    overdueActions:           Number(r.overdue_actions) || 0,
    ownersAssigned:           Number(r.owners_assigned) || 0,
    avgPlanCompletionPct:     Number(r.avg_completion) || 0,
    highRiskSchools:          Number(r.high_risk_schools) || 0,
  };
}

/* ── Plans table ───────────────────────────────────────────────────── */

export async function listInterventionPlans(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ rows: InterventionPlanRow[]; total: number }> {
  const limit  = Math.max(1, Math.min(opts.limit ?? 5, 200));
  const offset = Math.max(0, opts.offset ?? 0);

  const [page, count] = await Promise.all([
    queryPostgres<{
      id: string; title: string; scope_type: string; scope_name: string;
      owner_name: string | null; status: string; progress_pct: number;
      due_date: string | null; risk: string; updated_at: string;
    }>(
      `SELECT id, title, scope_type, scope_name, owner_name, status,
              progress_pct, due_date, risk, updated_at
         FROM intervention_plans
        ORDER BY
          CASE risk WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
          due_date NULLS LAST,
          updated_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    queryPostgres<{ total: string }>(`SELECT COUNT(*)::int AS total FROM intervention_plans`),
  ]);

  const rows: InterventionPlanRow[] = page.rows.map((r) => ({
    id: r.id,
    title: r.title,
    scope: r.scope_name || r.scope_type,
    ownerName: r.owner_name,
    ownerInitials: initialsFrom(r.owner_name),
    status: r.status,
    progress: Number(r.progress_pct) || 0,
    due: isoDate(r.due_date),
    risk: (["Low", "Medium", "High"].includes(r.risk) ? r.risk : "Low") as "Low" | "Medium" | "High",
    updated: isoDate(r.updated_at),
  }));

  return { rows, total: Number(count.rows[0]?.total ?? 0) };
}

/* ── Progress trend (last N months) ────────────────────────────────── */

export async function getInterventionProgressTrend(
  months = 6,
): Promise<InterventionTrendPoint[]> {
  const res = await queryPostgres<{ month: string; avg_pct: string | null }>(
    `WITH window AS (
       SELECT generate_series(
         date_trunc('month', NOW()) - (($1 - 1) || ' months')::interval,
         date_trunc('month', NOW()),
         '1 month'
       )::date AS month_start
     )
     SELECT TO_CHAR(w.month_start, 'Mon ''YY') AS month,
            AVG(p.progress_pct)::int AS avg_pct
       FROM window w
       LEFT JOIN intervention_plans p
         ON p.created_at <= (w.month_start + INTERVAL '1 month')
        AND (p.status IN ('Completed','Verified') = FALSE OR p.updated_at >= w.month_start)
      GROUP BY w.month_start
      ORDER BY w.month_start`,
    [months],
  );
  return res.rows
    .filter((r) => r.avg_pct !== null)
    .map((r) => ({ month: r.month, pct: Number(r.avg_pct) || 0 }));
}

/* ── Type mix donut ────────────────────────────────────────────────── */

export async function getInterventionTypeMix(): Promise<InterventionTypeMixRow[]> {
  const res = await queryPostgres<{ type: string; value: string }>(
    `SELECT COALESCE(type, 'Coaching Cycles') AS type, COUNT(*)::int AS value
       FROM intervention_plans
      WHERE status NOT IN ('Completed','Verified')
      GROUP BY type
      ORDER BY value DESC`,
  );
  const total = res.rows.reduce((n, r) => n + (Number(r.value) || 0), 0);
  if (total === 0) return [];
  return res.rows.map((r) => ({
    label: r.type,
    value: Number(r.value) || 0,
    pct: Math.round(((Number(r.value) || 0) / total) * 100),
  }));
}

/* ── Outcome funnel ────────────────────────────────────────────────── */

export async function getInterventionOutcomeFunnel(): Promise<InterventionFunnelRow[]> {
  const res = await queryPostgres<{ status: string; value: string }>(
    `SELECT status, COUNT(*)::int AS value
       FROM intervention_plans
      GROUP BY status`,
  );
  const counts = new Map<string, number>(
    res.rows.map((r) => [r.status, Number(r.value) || 0]),
  );
  const planned = counts.get("Planned") ?? 0;
  if (planned === 0) return [];

  const stages: { label: string; value: number }[] = [
    { label: "Planned",     value: planned },
    { label: "Approved",    value: counts.get("Approved")    ?? 0 },
    { label: "In Progress", value: counts.get("In Progress") ?? 0 },
    { label: "Completed",   value: counts.get("Completed")   ?? 0 },
    { label: "Verified",    value: counts.get("Verified")    ?? 0 },
  ];

  return stages.map((s) => ({
    label: s.label,
    value: s.value,
    pct: Math.round((s.value / planned) * 100),
  }));
}

/* ── Region coverage ───────────────────────────────────────────────── */

export async function getInterventionRegionCoverage(): Promise<InterventionRegionRow[]> {
  const res = await queryPostgres<{ region: string; value: string }>(
    `SELECT COALESCE(region, 'Unassigned') AS region,
            COALESCE(SUM(schools_count), COUNT(*))::int AS value
       FROM intervention_plans
      WHERE status NOT IN ('Completed','Verified')
      GROUP BY region
      ORDER BY value DESC`,
  );
  return res.rows.map((r) => ({ name: r.region, value: Number(r.value) || 0 }));
}

/* ── Priority queue ────────────────────────────────────────────────── */

export async function listPriorityQueue(limit = 4): Promise<PriorityQueueRow[]> {
  const res = await queryPostgres<{
    title: string; due_date: string | null; risk: string;
    overdue_count: string;
  }>(
    `SELECT p.title,
            p.due_date,
            p.risk,
            COALESCE((
              SELECT COUNT(*)::int FROM intervention_plan_actions a
               WHERE a.plan_id = p.id
                 AND a.status IN ('Pending','In Progress')
                 AND a.due_date < CURRENT_DATE
            ), 0) AS overdue_count
       FROM intervention_plans p
      WHERE p.risk IN ('Medium','High')
        AND p.status NOT IN ('Completed','Verified')
      ORDER BY
        CASE p.risk WHEN 'High' THEN 0 ELSE 1 END,
        p.due_date NULLS LAST
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => {
    const overdue = Number(r.overdue_count) || 0;
    const issue = overdue > 0
      ? `Overdue actions (${overdue})`
      : r.risk === "High"
        ? "High risk — review needed"
        : "Awaiting follow-up";
    return {
      plan: r.title,
      issue,
      risk: (["Low", "Medium", "High"].includes(r.risk) ? r.risk : "Low") as "Low" | "Medium" | "High",
      due: isoDate(r.due_date),
    };
  });
}

/* ── Plan actions (next N due) ─────────────────────────────────────── */

export async function listPlanActions(limit = 5): Promise<PlanActionRow[]> {
  const res = await queryPostgres<{
    action_text: string; plan_id: string; owner_name: string | null;
    due_date: string | null; status: string;
  }>(
    `SELECT action_text, plan_id, owner_name, due_date, status
       FROM intervention_plan_actions
      WHERE status IN ('Pending','In Progress')
      ORDER BY due_date NULLS LAST, created_at
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    action: r.action_text,
    plan: r.plan_id,
    ownerName: r.owner_name,
    due: isoDate(r.due_date),
    status: r.status,
  }));
}

/* ── Owner workload ────────────────────────────────────────────────── */

export async function listOwnerWorkload(limit = 5): Promise<OwnerWorkloadRow[]> {
  const res = await queryPostgres<{
    owner_name: string; active_plans: string; avg_pct: string | null;
  }>(
    `SELECT owner_name,
            COUNT(*)::int AS active_plans,
            AVG(progress_pct)::int AS avg_pct
       FROM intervention_plans
      WHERE owner_name IS NOT NULL
        AND status NOT IN ('Completed','Verified')
      GROUP BY owner_name
      ORDER BY active_plans DESC, avg_pct DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    ownerName: r.owner_name,
    activePlans: Number(r.active_plans) || 0,
    avgCompletionPct: Number(r.avg_pct) || 0,
  }));
}

/* ── Activity feed ─────────────────────────────────────────────────── */

export async function listInterventionActivity(limit = 4): Promise<InterventionActivityRow[]> {
  const res = await queryPostgres<{
    kind: string; message: string; occurred_at: string;
  }>(
    `SELECT kind, message, occurred_at
       FROM intervention_activity
      ORDER BY occurred_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    kind: r.kind,
    message: r.message,
    occurredAt: isoDate(r.occurred_at) ?? "",
  }));
}

/* ── Create / update plan (write side) ─────────────────────────────── */

export type InterventionPlanInput = {
  title: string;
  scopeType?: "Country" | "Region" | "District" | "Cluster" | "School";
  scopeName?: string;
  type?:
    | "Coaching Cycles"
    | "Remedial Reading"
    | "Materials Support"
    | "Leadership Support"
    | "Data Quality Fixes";
  ownerName?: string | null;
  ownerUserId?: number | null;
  status?: "Planned" | "Approved" | "In Progress" | "At Risk" | "Completed" | "Verified";
  progressPct?: number;
  dueDate?: string | null;          // YYYY-MM-DD
  risk?: "Low" | "Medium" | "High";
  region?: string | null;
  schoolsCount?: number;
};

function generatePlanId(): string {
  // Compact, time-sortable id. The PK is TEXT so we generate locally
  // rather than relying on a sequence.
  return `IPLAN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createInterventionPlanRecord(
  actor: { id: number; fullName: string },
  input: InterventionPlanInput,
): Promise<string> {
  const id = generatePlanId();

  await queryPostgres(
    `INSERT INTO intervention_plans (
       id, title, scope_type, scope_name, type, owner_user_id, owner_name,
       status, progress_pct, due_date, risk, region, schools_count
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11, $12, $13
     )`,
    [
      id,
      input.title.trim(),
      input.scopeType ?? "Country",
      (input.scopeName ?? "Uganda").trim() || "Uganda",
      input.type ?? null,
      input.ownerUserId != null ? String(input.ownerUserId) : String(actor.id),
      input.ownerName?.trim() || actor.fullName,
      input.status ?? "Planned",
      Math.max(0, Math.min(100, input.progressPct ?? 0)),
      input.dueDate || null,
      input.risk ?? "Low",
      input.region?.trim() || null,
      Math.max(0, input.schoolsCount ?? 0),
    ],
  );

  // Activity row so the new plan shows up in the dashboard's recent list.
  await queryPostgres(
    `INSERT INTO intervention_activity (plan_id, kind, message, actor_user_id, actor_name)
     VALUES ($1, 'status_change', $2, $3, $4)`,
    [id, `Plan created: ${input.title.trim()}`, String(actor.id), actor.fullName],
  ).catch(() => undefined);

  return id;
}

export async function updateInterventionPlanRecord(
  actor: { id: number; fullName: string },
  id: string,
  patch: Partial<InterventionPlanInput>,
): Promise<void> {
  // Dynamic UPDATE — only set the fields the caller passed.
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.title !== undefined) push("title", patch.title.trim());
  if (patch.scopeType !== undefined) push("scope_type", patch.scopeType);
  if (patch.scopeName !== undefined) push("scope_name", patch.scopeName.trim() || "Uganda");
  if (patch.type !== undefined) push("type", patch.type);
  if (patch.ownerName !== undefined) push("owner_name", patch.ownerName?.trim() || null);
  if (patch.ownerUserId !== undefined) push("owner_user_id", patch.ownerUserId != null ? String(patch.ownerUserId) : null);
  if (patch.status !== undefined) push("status", patch.status);
  if (patch.progressPct !== undefined) push("progress_pct", Math.max(0, Math.min(100, patch.progressPct)));
  if (patch.dueDate !== undefined) push("due_date", patch.dueDate || null);
  if (patch.risk !== undefined) push("risk", patch.risk);
  if (patch.region !== undefined) push("region", patch.region?.trim() || null);
  if (patch.schoolsCount !== undefined) push("schools_count", Math.max(0, patch.schoolsCount));
  if (sets.length === 0) return;
  sets.push("updated_at = NOW()");

  params.push(id);
  await queryPostgres(
    `UPDATE intervention_plans SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params,
  );

  await queryPostgres(
    `INSERT INTO intervention_activity (plan_id, kind, message, actor_user_id, actor_name)
     VALUES ($1, 'status_change', $2, $3, $4)`,
    [id, `Plan updated`, String(actor.id), actor.fullName],
  ).catch(() => undefined);
}

/* ── Evidence list ─────────────────────────────────────────────────── */

export async function listInterventionEvidence(limit = 5): Promise<InterventionEvidenceRow[]> {
  const res = await queryPostgres<{
    file_name: string; file_kind: string; plan_id: string | null;
    uploader_name: string | null; uploaded_at: string; status: string;
  }>(
    `SELECT file_name, file_kind, plan_id, uploader_name, uploaded_at, status
       FROM intervention_evidence
      ORDER BY uploaded_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    fileName: r.file_name,
    fileKind: r.file_kind,
    planId: r.plan_id,
    uploaderName: r.uploader_name,
    uploadedAt: isoDate(r.uploaded_at) ?? "",
    status: r.status,
  }));
}

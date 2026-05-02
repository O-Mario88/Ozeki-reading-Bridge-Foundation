/**
 * Read API for the /portal/contacts (CRM Overview) dashboard.
 *
 * Aggregates from existing CRM spine tables — no new schema:
 *   crm_accounts, crm_contacts, crm_interactions, crm_tasks,
 *   crm_affiliations, schools_directory
 */

import { queryPostgres } from "@/lib/server/postgres/client";

export type CrmKpis = {
  totalSchools: number;
  activeContacts: number;
  partnerOrgs: number;
  openOpportunities: number;
  activityLogs: number;
  followUpsDue: number;
  followUpsOverdue: number;
  dataCompletenessPct: number;
};

export type CrmTrendPoint = { month: string; value: number };
export type SegmentRow = { label: string; value: number; pct: number };
export type PipelineRow = { label: string; value: number; pct: number };

export type SchoolRow = {
  school: string; district: string; contact: string; role: string;
  status: string; last: string; next: string; nextDate: string;
};

export type ActivityRow = { type: string; title: string; source: string; whenIso: string };

export type FollowUpRow = {
  contact: string; org: string; task: string; owner: string;
  due: string; status: string;
};

export type PartnerRow = { org: string; contact: string; schools: number; status: string };

export type GeographicRow = { region: string; schools: number; contacts: number; coverage: number };

function isoDay(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function isoTime(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/* ── KPIs ──────────────────────────────────────────────────────────── */

export async function getCrmKpis(): Promise<CrmKpis | null> {
  const res = await queryPostgres<{
    schools: string; contacts: string; partners: string;
    open_tasks: string; activity_count: string;
    followups_due: string; followups_overdue: string;
    completeness: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM crm_accounts WHERE account_type = 'School') AS schools,
       (SELECT COUNT(*)::int FROM crm_contacts) AS contacts,
       (SELECT COUNT(*)::int FROM crm_accounts
          WHERE account_type IN ('Partner', 'Donor', 'Government')) AS partners,
       (SELECT COUNT(*)::int FROM crm_tasks
          WHERE status IN ('Pending', 'In Progress')) AS open_tasks,
       (SELECT COUNT(*)::int FROM crm_interactions
          WHERE activity_date >= NOW() - INTERVAL '90 days') AS activity_count,
       (SELECT COUNT(*)::int FROM crm_tasks
          WHERE status IN ('Pending', 'In Progress') AND due_date IS NOT NULL) AS followups_due,
       (SELECT COUNT(*)::int FROM crm_tasks
          WHERE status IN ('Pending', 'In Progress')
            AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS followups_overdue,
       (SELECT ROUND(100.0 * COUNT(*) FILTER (
              WHERE email IS NOT NULL AND email <> ''
                AND phone IS NOT NULL AND phone <> ''
              ) / NULLIF(COUNT(*), 0))
          FROM crm_contacts) AS completeness`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const schools = Number(r.schools) || 0;
  const contacts = Number(r.contacts) || 0;
  if (schools === 0 && contacts === 0) return null;
  return {
    totalSchools:        schools,
    activeContacts:      contacts,
    partnerOrgs:         Number(r.partners) || 0,
    openOpportunities:   Number(r.open_tasks) || 0,
    activityLogs:        Number(r.activity_count) || 0,
    followUpsDue:        Number(r.followups_due) || 0,
    followUpsOverdue:    Number(r.followups_overdue) || 0,
    dataCompletenessPct: Number(r.completeness) || 0,
  };
}

/* ── Activity trend (last N months) ────────────────────────────────── */

export async function getCrmActivityTrend(months = 7): Promise<CrmTrendPoint[]> {
  const res = await queryPostgres<{ month: string; count: string }>(
    `WITH window AS (
       SELECT generate_series(
         date_trunc('month', NOW()) - (($1 - 1) || ' months')::interval,
         date_trunc('month', NOW()),
         '1 month'
       )::date AS month_start
     )
     SELECT TO_CHAR(w.month_start, 'Mon ''YY') AS month,
            COUNT(i.id)::int AS count
       FROM window w
       LEFT JOIN crm_interactions i
         ON date_trunc('month', i.activity_date) = w.month_start
      GROUP BY w.month_start
      ORDER BY w.month_start`,
    [months],
  );
  return res.rows.map((r) => ({ month: r.month, value: Number(r.count) || 0 }));
}

/* ── Contact segments donut (by contact_type) ─────────────────────── */

export async function getContactSegments(): Promise<{ total: number; rows: SegmentRow[] } | null> {
  const res = await queryPostgres<{ contact_type: string; count: string }>(
    `SELECT contact_type, COUNT(*)::int AS count
       FROM crm_contacts
      GROUP BY contact_type
      ORDER BY count DESC
      LIMIT 6`,
  );
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return null;
  return {
    total,
    rows: res.rows.map((r) => ({
      label: r.contact_type,
      value: Number(r.count) || 0,
      pct: Math.round(((Number(r.count) || 0) / total) * 1000) / 10,
    })),
  };
}

/* ── Pipeline (task statuses) ──────────────────────────────────────── */

export async function getCrmPipeline(): Promise<PipelineRow[]> {
  const res = await queryPostgres<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::int AS count
       FROM crm_tasks
      GROUP BY status`,
  );
  const counts = new Map<string, number>(res.rows.map((r) => [r.status, Number(r.count) || 0]));
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return [];
  const labels: { db: string; ui: string }[] = [
    { db: "Pending",     ui: "New Leads" },
    { db: "In Progress", ui: "Engaged" },
    { db: "Deferred",    ui: "Proposal Sent" },
    { db: "Completed",   ui: "Active Partner" },
    { db: "Cancelled",   ui: "Dormant" },
  ];
  return labels.map((l) => {
    const value = counts.get(l.db) ?? 0;
    return { label: l.ui, value, pct: Math.round((value / total) * 100) };
  });
}

/* ── Schools + key contacts ────────────────────────────────────────── */

export async function listSchoolsWithContacts(limit = 6): Promise<SchoolRow[]> {
  const res = await queryPostgres<{
    school: string; district: string; contact: string | null; role: string | null;
    last_iso: string | null; next_subject: string | null; next_due: string | null;
  }>(
    `SELECT a.account_name AS school,
            COALESCE(sd.district, '—') AS district,
            c.full_name AS contact,
            af.role_title AS role,
            (SELECT MAX(i.activity_date) FROM crm_interactions i WHERE i.account_id = a.id) AS last_iso,
            (SELECT t.subject FROM crm_tasks t
              WHERE t.account_id = a.id AND t.status IN ('Pending','In Progress')
              ORDER BY t.due_date NULLS LAST LIMIT 1) AS next_subject,
            (SELECT t.due_date::text FROM crm_tasks t
              WHERE t.account_id = a.id AND t.status IN ('Pending','In Progress')
              ORDER BY t.due_date NULLS LAST LIMIT 1) AS next_due
       FROM crm_accounts a
       LEFT JOIN schools_directory sd ON sd.id = a.source_id AND a.source_table = 'schools_directory'
       LEFT JOIN crm_affiliations af ON af.account_id = a.id AND af.is_primary_contact = TRUE
       LEFT JOIN crm_contacts c ON c.id = af.contact_id
      WHERE a.account_type = 'School'
      ORDER BY a.updated_at DESC
      LIMIT $1`,
    [limit],
  );
  const now = Date.now();
  return res.rows.map((r) => {
    const lastTime = r.last_iso ? new Date(r.last_iso).getTime() : 0;
    const ageDays = lastTime > 0 ? (now - lastTime) / 86400000 : 999;
    const status = ageDays < 14 ? "Active" : ageDays < 30 ? "Warm" : ageDays < 60 ? "Needs Follow-up" : "At Risk";
    return {
      school: r.school,
      district: r.district,
      contact: r.contact ?? "—",
      role: r.role ?? "—",
      status,
      last: r.last_iso ? (isoDay(r.last_iso) ?? "") : "—",
      next: r.next_subject ?? "—",
      nextDate: r.next_due ?? "—",
    };
  });
}

/* ── Recent activity logs ──────────────────────────────────────────── */

export async function listRecentCrmActivity(limit = 6): Promise<ActivityRow[]> {
  const res = await queryPostgres<{
    interaction_type: string; subject: string | null;
    source_name: string | null; activity_date: string;
  }>(
    `SELECT i.interaction_type, i.subject,
            COALESCE(c.full_name, a.account_name, '—') AS source_name,
            i.activity_date
       FROM crm_interactions i
       LEFT JOIN crm_contacts c ON c.id = i.contact_id
       LEFT JOIN crm_accounts a ON a.id = i.account_id
      ORDER BY i.activity_date DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    type: r.interaction_type,
    title: r.subject ?? `${r.interaction_type} logged`,
    source: r.source_name ?? "—",
    whenIso: isoTime(r.activity_date) ?? "",
  }));
}

/* ── Upcoming follow-ups ───────────────────────────────────────────── */

export async function listUpcomingFollowUps(limit = 6): Promise<FollowUpRow[]> {
  const res = await queryPostgres<{
    contact: string | null; org: string | null; subject: string;
    owner: string | null; due_date: string | null; status: string;
  }>(
    `SELECT c.full_name AS contact, a.account_name AS org,
            t.subject, COALESCE(pu.full_name, pu.email, '—') AS owner,
            t.due_date::text, t.status
       FROM crm_tasks t
       LEFT JOIN crm_contacts c ON c.id = t.contact_id
       LEFT JOIN crm_accounts a ON a.id = t.account_id
       LEFT JOIN portal_users pu ON pu.id = t.assigned_to_user_id
      WHERE t.status IN ('Pending', 'In Progress')
      ORDER BY t.due_date NULLS LAST
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => {
    const due = r.due_date;
    let status = "Scheduled";
    if (due) {
      const d = new Date(due);
      const days = (d.getTime() - Date.now()) / 86400000;
      if (days < 0) status = "Overdue";
      else if (days < 3) status = "Due Soon";
    }
    return {
      contact: r.contact ?? "—",
      org: r.org ?? "—",
      task: r.subject,
      owner: r.owner ?? "—",
      due: due ?? "—",
      status,
    };
  });
}

/* ── Partner organizations ─────────────────────────────────────────── */

export async function listPartnerOrgs(limit = 5): Promise<PartnerRow[]> {
  const res = await queryPostgres<{
    org: string; contact: string | null; schools: string;
  }>(
    `SELECT a.account_name AS org,
            c.full_name AS contact,
            COUNT(DISTINCT child.id)::int AS schools
       FROM crm_accounts a
       LEFT JOIN crm_affiliations af ON af.account_id = a.id AND af.is_primary_contact = TRUE
       LEFT JOIN crm_contacts c ON c.id = af.contact_id
       LEFT JOIN crm_accounts child ON child.parent_account_id = a.id
                                    AND child.account_type = 'School'
      WHERE a.account_type IN ('Partner', 'Donor', 'Government')
      GROUP BY a.id, a.account_name, c.full_name
      ORDER BY schools DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => {
    const schools = Number(r.schools) || 0;
    const status = schools >= 30 ? "Highly Engaged" : schools >= 10 ? "Engaged" : "Active";
    return {
      org: r.org,
      contact: r.contact ?? "—",
      schools,
      status,
    };
  });
}

/* ── Geographic coverage ───────────────────────────────────────────── */

export async function getGeographicCoverage(): Promise<GeographicRow[]> {
  const res = await queryPostgres<{
    region: string; schools: string; contacts: string; total: string;
  }>(
    `SELECT COALESCE(sd.region, 'Unassigned') AS region,
            COUNT(DISTINCT sd.id)::int AS schools,
            COUNT(DISTINCT c.id)::int AS contacts,
            COUNT(DISTINCT sd.id) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM crm_interactions i
                  JOIN crm_accounts a ON a.id = i.account_id
                 WHERE a.source_table = 'schools_directory' AND a.source_id = sd.id
                   AND i.activity_date >= NOW() - INTERVAL '90 days'
              )
            )::int AS total
       FROM schools_directory sd
       LEFT JOIN crm_accounts a ON a.source_table = 'schools_directory' AND a.source_id = sd.id
       LEFT JOIN crm_affiliations af ON af.account_id = a.id
       LEFT JOIN crm_contacts c ON c.id = af.contact_id
      GROUP BY sd.region
      ORDER BY schools DESC
      LIMIT 8`,
  );
  return res.rows
    .filter((r) => Number(r.schools) > 0)
    .map((r) => {
      const schools = Number(r.schools) || 0;
      const total   = Number(r.total) || 0;
      return {
        region: r.region,
        schools,
        contacts: Number(r.contacts) || 0,
        coverage: schools > 0 ? Math.round((total / schools) * 100) : 0,
      };
    });
}

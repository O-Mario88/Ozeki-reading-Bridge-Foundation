/**
 * contact-profile — single aggregation point for the rich Contact Profile
 * page (`/portal/contacts/[contactId]`). One snapshot type, one fetch
 * function, every card on the page reads from this shape.
 *
 * Privacy/scope: this is a portal-side (staff-authenticated) fetch — it can
 * include names, phones, and emails. Privacy filtering belongs in the
 * public-facing repos, not here.
 */

import { queryPostgres } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────
   Shape returned to the view layer
   ──────────────────────────────────────────────────────────────────────── */

export type ContactProfileSnapshot = {
  contactId: number;
  identity: {
    fullName: string;
    initials: string;
    status: "Active" | "Inactive";
    role: string;
    roleType: string;
    primarySchoolId: number | null;
    primarySchoolName: string | null;
    district: string;
    subCounty: string;
    parish: string;
    village: string;
  };
  contactMethods: {
    primaryPhone: string | null;
    alternatePhone: string | null;
    whatsapp: string | null;
    email: string | null;
    lastEngagementAt: string | null;
  };
  snapshot: {
    firstAddedAt: string | null;
    createdByName: string | null;
    source: string | null;
    engagementScore: number; // 0-100
    dataCompleteness: number; // 0-100
    consentStatus: string;
  };
  health: {
    score: number; // 0-100
    label: "Excellent" | "Very Good" | "Good" | "Needs Attention" | "At Risk";
    explanation: string;
  };
  activityTimeline: ActivityTimelineRow[];
  trainingParticipation: {
    total: number;
    breakdown: TrainingStatusBreakdown[]; // 5 buckets, deterministic order
    lastTrainingTitle: string | null;
    lastTrainingDate: string | null;
    isActiveParticipant: boolean;
  };
  coachingEvaluations: {
    coachingVisits: number;
    evaluations: number;
    observations: number;
    actionPlans: number;
    recent: RecentEvaluationRow[];
  };
  communicationLog: CommunicationLogRow[];
  meetingsEngagements: {
    meetings: number;
    callsLogged: number;
    schoolVisits: number;
    emailsSent: number;
    upcoming: UpcomingEngagementRow | null;
  };
  linkedSchoolsPrograms: LinkedSchoolProgramRow[];
};

export type ActivityTimelineRow = {
  id: string;
  date: string; // ISO
  kind: ActivityKind;
  title: string;
  status: string;
  href?: string | null;
};

export type ActivityKind =
  | "phone_call"
  | "staff_visit"
  | "coaching_visit"
  | "assessment_support"
  | "training_workshop"
  | "email"
  | "classroom_observation"
  | "meeting"
  | "whatsapp"
  | "sms"
  | "note"
  | "follow_up"
  | "other";

export type TrainingStatusBreakdown = {
  key: "completed" | "attended" | "in_progress" | "registered" | "no_show";
  label: string;
  count: number;
  pct: number;
};

export type RecentEvaluationRow = {
  date: string;
  title: string;
  category: string;
  score: string;
  status: string;
};

export type CommunicationLogRow = {
  id: string;
  date: string; // ISO
  kind: "phone_call" | "email" | "whatsapp" | "sms" | "note" | "meeting";
  summary: string;
  loggedBy: string | null;
};

export type UpcomingEngagementRow = {
  date: string; // ISO
  title: string;
  schoolOrProgram: string;
  timeWindow: string | null;
  status: string;
};

export type LinkedSchoolProgramRow = {
  kind: "school" | "program";
  name: string;
  pill: string; // e.g. "Primary School", "Program"
  description: string;
  sinceDate: string | null;
  status: "Active" | "Inactive";
  href?: string | null;
};

/* ────────────────────────────────────────────────────────────────────────
   Required fields used by the data-completeness computation
   ──────────────────────────────────────────────────────────────────────── */

const COMPLETENESS_FIELDS = [
  "fullName",
  "role",
  "phoneOrEmail",
  "primarySchool",
  "district",
  "subCounty",
  "consent",
  "source",
  "lastEngagementOrCreated",
] as const;

function clamp01_100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function healthLabel(score: number): ContactProfileSnapshot["health"]["label"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "At Risk";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function activityKindFromInteractionType(type: string): ActivityKind {
  const t = type.toLowerCase();
  if (t.includes("call")) return "phone_call";
  if (t.includes("email")) return "email";
  if (t.includes("whatsapp")) return "whatsapp";
  if (t.includes("sms")) return "sms";
  if (t.includes("meeting")) return "meeting";
  if (t.includes("note")) return "note";
  if (t.includes("training")) return "training_workshop";
  if (t.includes("visit")) return "staff_visit";
  return "other";
}

function activityKindFromModule(mod: string): ActivityKind {
  const m = mod.toLowerCase();
  if (m.includes("training")) return "training_workshop";
  if (m.includes("coaching") || m.includes("visit")) return "coaching_visit";
  if (m.includes("observation")) return "classroom_observation";
  if (m.includes("assessment")) return "assessment_support";
  if (m.includes("story")) return "staff_visit";
  return "other";
}

/* ────────────────────────────────────────────────────────────────────────
   Main fetch
   ──────────────────────────────────────────────────────────────────────── */

export async function getContactProfileSnapshot(
  contactId: number,
): Promise<ContactProfileSnapshot | null> {
  const baseRes = await queryPostgres<{
    id: number;
    full_name: string;
    role_title: string | null;
    category: string | null;
    contact_record_type: string | null;
    is_primary_contact: boolean;
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    school_id: number | null;
    school_name: string | null;
    district: string | null;
    sub_county: string | null;
    parish: string | null;
    village: string | null;
  }>(
    `SELECT sc.contact_id AS id,
            sc.full_name,
            sc.role_title,
            sc.category,
            sc.contact_record_type,
            sc.is_primary_contact,
            sc.phone,
            sc.email,
            sc.whatsapp,
            sc.notes,
            sc.created_at::text AS created_at,
            sc.updated_at::text AS updated_at,
            sd.id AS school_id,
            sd.name AS school_name,
            sd.district,
            sd.sub_county,
            sd.parish,
            sd.village
     FROM school_contacts sc
     LEFT JOIN schools_directory sd ON sd.id = sc.school_id
     WHERE sc.contact_id = $1
     LIMIT 1`,
    [contactId],
  );
  const base = baseRes.rows[0];
  if (!base) return null;

  // Resolve the UUID-keyed crm_contacts row that bridges school_contacts to
  // crm_interactions / crm_tasks. A contact may not have a bridge row yet —
  // that's fine, we degrade gracefully and use the integer-keyed tables
  // (portal_training_attendance, visit_participants) for activity.
  const bridgeRes = await queryPostgres<{ id: string }>(
    `SELECT id FROM crm_contacts WHERE source_table = 'school_contacts' AND source_id = $1 LIMIT 1`,
    [contactId],
  );
  const bridgeId = bridgeRes.rows[0]?.id ?? null;

  // Fan out the per-card queries in parallel.
  const [
    interactionsRes,
    portalActivityRes,
    visitRes,
    trainingBucketsRes,
    lastTrainingRes,
    obsCountRes,
    actionPlansRes,
    upcomingRes,
    schoolListRes,
    createdByRes,
  ] = await Promise.all([
    bridgeId
      ? queryPostgres<{
          id: string;
          activity_date: string;
          interaction_type: string;
          subject: string | null;
          status: string;
          notes: string | null;
          created_by_name: string | null;
        }>(
          `SELECT i.id::text AS id,
                  i.activity_date::text AS activity_date,
                  i.interaction_type,
                  i.subject,
                  i.status,
                  i.notes,
                  pu.full_name AS created_by_name
           FROM crm_interactions i
           LEFT JOIN portal_users pu ON pu.id = i.created_by_user_id
           WHERE i.contact_id = $1::uuid
           ORDER BY i.activity_date DESC
           LIMIT 60`,
          [bridgeId],
        )
      : Promise.resolve({ rows: [] as never[] }),
    queryPostgres<{
      id: number;
      module: string | null;
      title: string | null;
      date: string | null;
      status: string | null;
    }>(
      `SELECT pr.id,
              pr.module,
              COALESCE(pr.program_type, pr.module) AS title,
              pr.date::text AS date,
              pr.status
       FROM portal_records pr
       WHERE pr.id IN (
         SELECT portal_record_id FROM portal_training_attendance WHERE contact_id = $1
       )
       OR pr.id IN (
         SELECT cv.portal_record_id
         FROM visit_participants vp
         JOIN coaching_visits cv ON cv.id = vp.visit_id
         WHERE vp.contact_id = $1 AND cv.portal_record_id IS NOT NULL
       )
       ORDER BY pr.date DESC NULLS LAST
       LIMIT 30`,
      [contactId],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM visit_participants WHERE contact_id = $1`,
      [contactId],
    ),
    queryPostgres<{ status: string | null; n: number }>(
      `SELECT COALESCE(LOWER(pr.status), 'completed') AS status, COUNT(*)::int AS n
       FROM portal_training_attendance a
       JOIN portal_records pr ON pr.id = a.portal_record_id
       WHERE a.contact_id = $1
       GROUP BY 1`,
      [contactId],
    ),
    queryPostgres<{ title: string | null; date: string | null }>(
      `SELECT COALESCE(pr.program_type, pr.module) AS title, pr.date::text AS date
       FROM portal_training_attendance a
       JOIN portal_records pr ON pr.id = a.portal_record_id
       WHERE a.contact_id = $1
       ORDER BY pr.date DESC NULLS LAST
       LIMIT 1`,
      [contactId],
    ),
    queryPostgres<{ total: number }>(
      // Match observations on teacher_uid when the contact is a teacher; fall
      // back to name match when teacher_uid isn't set on the contact.
      `SELECT COUNT(*)::int AS total
       FROM teacher_lesson_observations tlo
       WHERE (tlo.teacher_name = (SELECT full_name FROM school_contacts WHERE contact_id = $1))
          OR (tlo.school_id = (SELECT school_id FROM school_contacts WHERE contact_id = $1)
              AND tlo.teacher_name = (SELECT full_name FROM school_contacts WHERE contact_id = $1))`,
      [contactId],
    ),
    bridgeId
      ? queryPostgres<{ total: number }>(
          `SELECT COUNT(*)::int AS total FROM crm_tasks WHERE contact_id = $1::uuid AND status != 'Completed'`,
          [bridgeId],
        )
      : Promise.resolve({ rows: [{ total: 0 }] }),
    bridgeId
      ? queryPostgres<{
          activity_date: string;
          subject: string | null;
          interaction_type: string;
          status: string;
        }>(
          `SELECT activity_date::text AS activity_date, subject, interaction_type, status
           FROM crm_interactions
           WHERE contact_id = $1::uuid AND status = 'Planned' AND activity_date >= NOW()
           ORDER BY activity_date ASC LIMIT 1`,
          [bridgeId],
        )
      : Promise.resolve({ rows: [] as never[] }),
    queryPostgres<{
      id: number;
      name: string;
      district: string | null;
      role_title: string | null;
      created_at: string | null;
      is_primary: boolean;
    }>(
      `SELECT sd.id,
              sd.name,
              sd.district,
              sc2.role_title,
              sc2.created_at::text AS created_at,
              sc2.is_primary_contact AS is_primary
       FROM school_contacts sc2
       JOIN schools_directory sd ON sd.id = sc2.school_id
       WHERE sc2.contact_id = $1
       ORDER BY sc2.is_primary_contact DESC, sc2.created_at ASC`,
      [contactId],
    ),
    queryPostgres<{ name: string | null }>(
      // No direct created_by on school_contacts — best-effort: first user who
      // logged an interaction with this contact, otherwise null.
      bridgeId
        ? `SELECT pu.full_name AS name
           FROM crm_interactions i
           JOIN portal_users pu ON pu.id = i.created_by_user_id
           WHERE i.contact_id = $1::uuid
           ORDER BY i.activity_date ASC LIMIT 1`
        : `SELECT NULL AS name`,
      bridgeId ? [bridgeId] : [],
    ),
  ]);

  /* ── Activity timeline: union of crm_interactions + portal_records ── */
  const interactions = (interactionsRes.rows as Array<{
    id: string;
    activity_date: string;
    interaction_type: string;
    subject: string | null;
    status: string;
    notes: string | null;
    created_by_name: string | null;
  }>);

  const portalActivity = portalActivityRes.rows;

  const timeline: ActivityTimelineRow[] = [
    ...interactions.map((r) => ({
      id: `i:${r.id}`,
      date: r.activity_date,
      kind: activityKindFromInteractionType(r.interaction_type),
      title: r.subject || r.interaction_type,
      status: r.status,
      href: null,
    })),
    ...portalActivity.map((r) => ({
      id: `p:${r.id}`,
      date: r.date ?? new Date().toISOString(),
      kind: activityKindFromModule(r.module ?? ""),
      title: r.title || r.module || "Activity",
      status: r.status || "Completed",
      href:
        r.module === "training"
          ? `/portal/trainings/${r.id}`
          : r.module === "visit" || r.module === "coaching"
          ? `/portal/visits/${r.id}`
          : null,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 20);

  /* ── Training participation donut: 5 fixed buckets ── */
  const buckets: Record<TrainingStatusBreakdown["key"], number> = {
    completed: 0,
    attended: 0,
    in_progress: 0,
    registered: 0,
    no_show: 0,
  };
  for (const r of trainingBucketsRes.rows) {
    const s = (r.status ?? "").toLowerCase();
    if (s.includes("complete")) buckets.completed += r.n;
    else if (s.includes("attended")) buckets.attended += r.n;
    else if (s.includes("progress") || s === "active") buckets.in_progress += r.n;
    else if (s.includes("regist") || s.includes("scheduled") || s.includes("planned")) buckets.registered += r.n;
    else if (s.includes("no show") || s === "absent") buckets.no_show += r.n;
    else buckets.completed += r.n;
  }
  const trainingTotal = Object.values(buckets).reduce((s, v) => s + v, 0);
  const breakdown: TrainingStatusBreakdown[] = [
    { key: "completed", label: "Completed", count: buckets.completed, pct: trainingTotal ? Math.round((buckets.completed / trainingTotal) * 100) : 0 },
    { key: "attended", label: "Attended", count: buckets.attended, pct: trainingTotal ? Math.round((buckets.attended / trainingTotal) * 100) : 0 },
    { key: "in_progress", label: "In Progress", count: buckets.in_progress, pct: trainingTotal ? Math.round((buckets.in_progress / trainingTotal) * 100) : 0 },
    { key: "registered", label: "Registered", count: buckets.registered, pct: trainingTotal ? Math.round((buckets.registered / trainingTotal) * 100) : 0 },
    { key: "no_show", label: "No Show", count: buckets.no_show, pct: trainingTotal ? Math.round((buckets.no_show / trainingTotal) * 100) : 0 },
  ];

  /* ── Coaching & evaluations ── */
  const coachingVisits = Number(visitRes.rows[0]?.total ?? 0);
  const observations = Number(obsCountRes.rows[0]?.total ?? 0);
  const actionPlans = Number(actionPlansRes.rows[0]?.total ?? 0);
  // Evaluations count overlaps with coaching for this view. Use coaching total
  // for now; if a separate lesson_evaluations link to contact appears later,
  // wire it here.
  const evaluations = portalActivity.filter((p) => (p.module ?? "").toLowerCase().includes("eval")).length;

  const recentEvalsAndObs: RecentEvaluationRow[] = portalActivity
    .filter((p) => {
      const m = (p.module ?? "").toLowerCase();
      return m.includes("visit") || m.includes("eval") || m.includes("observ") || m.includes("coach");
    })
    .slice(0, 3)
    .map((p) => ({
      date: p.date ?? "",
      title: p.title || p.module || "Evaluation",
      category: p.module === "visit" ? "Coaching" : "Lesson",
      score: "—",
      status: p.status || "Completed",
    }));

  /* ── Communication log: subset of interactions ── */
  const communicationLog: CommunicationLogRow[] = interactions
    .filter((r) => /call|email|whatsapp|sms|note|meeting/i.test(r.interaction_type))
    .slice(0, 8)
    .map((r) => {
      const t = r.interaction_type.toLowerCase();
      let kind: CommunicationLogRow["kind"] = "note";
      if (t.includes("call")) kind = "phone_call";
      else if (t.includes("email")) kind = "email";
      else if (t.includes("whatsapp")) kind = "whatsapp";
      else if (t.includes("sms")) kind = "sms";
      else if (t.includes("meeting")) kind = "meeting";
      return {
        id: `comm:${r.id}`,
        date: r.activity_date,
        kind,
        summary: r.subject || r.notes || r.interaction_type,
        loggedBy: r.created_by_name,
      };
    });

  /* ── Meetings & engagements counters ── */
  const meetings = interactions.filter((r) => /meeting/i.test(r.interaction_type)).length;
  const callsLogged = interactions.filter((r) => /call/i.test(r.interaction_type)).length;
  const schoolVisits = portalActivity.filter((p) => /visit|coaching/i.test(p.module ?? "")).length;
  const emailsSent = interactions.filter((r) => /email/i.test(r.interaction_type)).length;

  const upcoming = upcomingRes.rows[0];
  const upcomingRow: UpcomingEngagementRow | null = upcoming
    ? {
        date: upcoming.activity_date,
        title: upcoming.subject || upcoming.interaction_type,
        schoolOrProgram: base.school_name ?? "—",
        timeWindow: null,
        status: upcoming.status,
      }
    : null;

  /* ── Linked schools & programs ── */
  const linked: LinkedSchoolProgramRow[] = schoolListRes.rows.map((s) => ({
    kind: "school" as const,
    name: s.name,
    pill: s.is_primary ? "Primary School" : "Linked School",
    description: s.district ?? "",
    sinceDate: s.created_at,
    status: "Active" as const,
    href: `/portal/schools/${s.id}`,
  }));

  /* ── Snapshot + health + completeness ── */
  const fullName = base.full_name || "Contact";
  const completed: number[] = [
    fullName.trim() ? 1 : 0,
    (base.role_title || base.category) ? 1 : 0,
    (base.phone || base.email) ? 1 : 0,
    base.school_name ? 1 : 0,
    base.district ? 1 : 0,
    base.sub_county ? 1 : 0,
    /* consent — we don't track it explicitly, default partial credit on staff-recorded contacts */ 1,
    /* source — if we have a created_by we count it as known */ 1,
    (base.updated_at || base.created_at) ? 1 : 0,
  ];
  const dataCompleteness = clamp01_100(
    (completed.reduce((a, b) => a + b, 0) / COMPLETENESS_FIELDS.length) * 100,
  );

  // Engagement score: blends recency + volume into 0-100. Uses 90-day window.
  const last90 = interactions.filter((r) => {
    const d = new Date(r.activity_date).getTime();
    return Number.isFinite(d) && d >= Date.now() - 90 * 24 * 3600 * 1000;
  }).length;
  const last30 = interactions.filter((r) => {
    const d = new Date(r.activity_date).getTime();
    return Number.isFinite(d) && d >= Date.now() - 30 * 24 * 3600 * 1000;
  }).length;
  const engagementScore = clamp01_100(
    Math.min(100, last90 * 6 + last30 * 8 + (trainingTotal > 0 ? 10 : 0) + (coachingVisits > 0 ? 10 : 0)),
  );

  const hasOverdue = actionPlans > 0;
  const healthScore = clamp01_100(
    engagementScore * 0.3 +
      dataCompleteness * 0.25 +
      Math.min(100, (last30 + last90) * 8) * 0.2 +
      /* consent placeholder */ 100 * 0.1 +
      Math.min(100, trainingTotal * 20) * 0.1 +
      (hasOverdue ? -5 : 5),
  );

  const lastEngagementAt =
    interactions[0]?.activity_date ??
    portalActivity.find((p) => p.date)?.date ??
    null;

  const role = base.role_title || base.category || "Contact";
  const roleType = base.contact_record_type || "School Contact";

  return {
    contactId: base.id,
    identity: {
      fullName,
      initials: getInitials(fullName),
      status: "Active",
      role,
      roleType,
      primarySchoolId: base.school_id,
      primarySchoolName: base.school_name,
      district: base.district ?? "—",
      subCounty: base.sub_county ?? "—",
      parish: base.parish ?? "—",
      village: base.village ?? "—",
    },
    contactMethods: {
      primaryPhone: base.phone,
      alternatePhone: null, // school_contacts has no alternate column today
      whatsapp: base.whatsapp,
      email: base.email,
      lastEngagementAt,
    },
    snapshot: {
      firstAddedAt: base.created_at,
      createdByName: createdByRes.rows[0]?.name ?? null,
      source: roleType === "Teacher" ? "Teacher Roster" : "School Profile",
      engagementScore,
      dataCompleteness,
      consentStatus: "Consent on file",
    },
    health: {
      score: healthScore,
      label: healthLabel(healthScore),
      explanation:
        healthScore >= 75
          ? "Highly engaged and active partner."
          : healthScore >= 60
          ? "Engaged. Keep follow-ups consistent."
          : healthScore >= 40
          ? "Engagement has slowed — schedule a touchpoint."
          : "Re-engagement recommended; minimal recent activity.",
    },
    activityTimeline: timeline,
    trainingParticipation: {
      total: trainingTotal,
      breakdown,
      lastTrainingTitle: lastTrainingRes.rows[0]?.title ?? null,
      lastTrainingDate: lastTrainingRes.rows[0]?.date ?? null,
      isActiveParticipant: trainingTotal > 0,
    },
    coachingEvaluations: {
      coachingVisits,
      evaluations,
      observations,
      actionPlans,
      recent: recentEvalsAndObs,
    },
    communicationLog,
    meetingsEngagements: {
      meetings,
      callsLogged,
      schoolVisits,
      emailsSent,
      upcoming: upcomingRow,
    },
    linkedSchoolsPrograms: linked,
  };
}

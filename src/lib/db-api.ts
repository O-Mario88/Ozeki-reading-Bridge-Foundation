/**
 * db-api.ts — Barrel re-export layer
 *
 * This file re-exports database functions from the PostgreSQL-based service
 * and repository layers. It exists to satisfy legacy imports across the
 * codebase (services, tests, openai.ts) that reference "@/lib/db-api".
 *
 * All actual implementations live in src/services/* and
 * src/lib/server/postgres/repositories/*.
 */

import type {
  PortalUser,
  ImpactReportFactPack,
  ImpactReportNarrative,
} from "@/lib/types";
import { queryPostgres } from "@/lib/server/postgres/client";
import { hashPassword } from "@/lib/server/postgres/repositories/auth";

// ── dataService re-exports (already PostgreSQL-backed) ───────────────
export {
  createPortalRecord,
  listPortalRecords,
  getPortalRecordById,
  updatePortalRecord,
  softDeletePortalRecord,
  saveObservationRubric,
  saveInterventionGroup,
  saveConsentRecord,
  createSupportRequest,
  listSupportRequests,
  createConceptNoteRequest,
  getImpactSummary,
  getPublicImpactAggregate,
  getCostEffectivenessData,
  getPortalDashboardData,
  getTableRowCounts,
  purgeAllData,
  purgeSelectedDataTables,
  saveCostEntry,
  saveMaterialDistribution,
  createImpactReport,
  listPortalImpactReportsAsync,
  getPublishedPortalTestimonialById,
  listPublishedPortalTestimonials,
  logAuditEvent,
  listAuditLogs,
} from "@/services/dataService";

// ── auth re-exports (direct from postgres repo) ─────────────────────
export {
  authenticatePortalUserPostgres as authenticatePortalUser,
  createPortalSessionPostgres as createPortalSession,
  deletePortalSessionPostgres as deletePortalSession,
  findPortalUserByEmailPostgres as getPortalUserByEmail,
  findPortalUserBySessionTokenPostgres as getPortalUserFromSession,
} from "@/lib/server/postgres/repositories/auth";

// ── Graduation re-exports ────────────────────────────────────────────
export {
  getGraduationSettingsPostgres as getGraduationSettingsAsync,
} from "@/lib/server/postgres/repositories/graduation";

export {
  getTeachingImprovementSettingsPostgres as getTeachingImprovementSettingsAsync,
} from "@/lib/server/postgres/repositories/public-impact";

// ── canManagePortalUsers (business logic) ────────────────────────────
// Tightened 2026-05-06 to Super Admin only — see src/lib/permissions.ts
// for the full role spec. Admins lost user-management as part of the
// Reading Intelligence onboarding-tier cleanup; the Admin tier still has
// access to everything *except* Finance and user creation.
export function canManagePortalUsers(user: PortalUser): boolean {
  return Boolean(user.isSuperAdmin);
}

// ── Async portal record helpers ──────────────────────────────────────
import {
  createPortalRecord as _createPortalRecord,
  updatePortalRecord as _updatePortalRecord,
} from "@/services/dataService";

export async function createPortalRecordAsync(
  ...args: Parameters<typeof _createPortalRecord>
) {
  return _createPortalRecord(...args);
}

export async function updatePortalRecordAsync(
  ...args: [...Parameters<typeof _updatePortalRecord>, ...unknown[]]
) {
  return _updatePortalRecord(args[0], args[1]);
}

export async function setPortalRecordStatusAsync(
  recordId: number,
  status: string,
  _actor?: unknown,
  _reviewNote?: string,
) {
  return _updatePortalRecord(recordId, { status, reviewNote: _reviewNote } as never);
}

// ── School / teacher stubs ───────────────────────────────────────────
export async function listTeachersBySchool(schoolId: number) {
  const result = await queryPostgres(
    `SELECT uid, full_name AS "fullName", school_id AS "schoolId"
     FROM school_contacts WHERE school_id = $1 ORDER BY full_name`,
    [schoolId],
  );
  return result.rows;
}

export async function addTeacherToSchool(schoolIdOrInput: number | Record<string, unknown>, teacher?: { fullName: string; uid?: string }) {
  let schoolId: number;
  let teacherData: { fullName: string; uid?: string };
  if (typeof schoolIdOrInput === 'number') {
    schoolId = schoolIdOrInput;
    teacherData = teacher ?? { fullName: 'Unknown' };
  } else {
    schoolId = Number(schoolIdOrInput.schoolId);
    teacherData = { fullName: String(schoolIdOrInput.fullName ?? 'Unknown'), uid: schoolIdOrInput.uid as string | undefined };
  }
  const uid = teacherData.uid || `T-${Date.now()}`;
  await queryPostgres(
    `INSERT INTO school_contacts (school_id, full_name, uid) VALUES ($1, $2, $3)`,
    [schoolId, teacherData.fullName, uid],
  );
  return { uid, teacherUid: uid, schoolId, fullName: teacherData.fullName };
}

export async function createSchoolDirectoryRecord(input: Record<string, unknown>) {
  const result = await queryPostgres(
    `INSERT INTO school_directory (name, district, sub_county, parish, created_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
    [input.name ?? "", input.district ?? "", input.subCounty ?? "", input.parish ?? ""],
  );
  const id = Number(result.rows[0]?.id ?? 0);
  return { id, ...input } as Record<string, unknown> & { id: number };
}

export async function getSchoolGraduationEligibilityAsync(_schoolId: number, _options?: unknown) {
  return null as unknown as { isEligible: boolean; [key: string]: unknown } | null;
}

export async function refreshSchoolGraduationEligibilityCacheAsync(_schoolId?: number) {
  // no-op
}

// ── Lesson evaluation stubs ──────────────────────────────────────────
export {
  createLessonEvaluationAsync,
  updateLessonEvaluationAsync,
  voidLessonEvaluationAsync,
  getLessonEvaluationByIdAsync,
  listLessonEvaluationsAsync,
} from "@/services/dataService";

export type TeacherImprovementProfileResult = {
  teacherUid: string;
  teacherSupportStatus?: string;
  teacherSupportAction?: string;
  alignment: {
    summary: {
      teachingDelta?: number;
      nonReaderReductionPp?: number;
      cwpm20PlusDeltaPp?: number;
      storySessionsLatest?: number;
    };
    caveat: string;
  };
  teacherComparison?: {
    teacherName: string;
    firstEvaluationDate: string;
    comparisonEvaluationDate: string;
    latestEvaluationDate: string;
    overallScoreBaseline: number;
    overallScoreComparison: number;
    deltaOverall: number;
    improvementStatus: string;
    domainDeltas: Record<string, number | null>;
  };
};

export async function getTeacherImprovementProfileAsync(_input: { schoolId: number; teacherUid: string }): Promise<TeacherImprovementProfileResult | null> {
  return null;
}

export async function listTeacherImprovementComparisonsAsync(_filters?: unknown) {
  return [];
}

export async function recomputeLearningAutomationSnapshots() {
  // no-op
}

// ── Assessment delegations ────────────────────────────────────────────
//
// Both functions delegate to the proper typed repo at
// src/lib/server/postgres/repositories/assessments.ts. The previous
// stub implementations targeted a non-existent `assessments` table
// and returned an unprocessed input echo — they would fail at
// runtime against the real schema (assessment_records) and broke the
// learnerUid + mastery-status guarantees that the rest of the system
// depends on. Production callers (the /api/portal/assessments POST
// route) already use the dataService re-export of the proper repo
// function; these forwarders make the legacy import path safe too.

export async function saveAssessmentRecordAsync(input: unknown, actor: PortalUser | number) {
  const userId = typeof actor === "number" ? actor : actor.id;
  const { saveAssessmentRecordPostgres } = await import(
    "@/lib/server/postgres/repositories/assessments"
  );
  // Caller is responsible for passing a shape compatible with
  // AssessmentRecordInput; the proper repo function does its own
  // domain-aware computation + INSERT INTO assessment_records.
  return saveAssessmentRecordPostgres(
    input as Parameters<typeof saveAssessmentRecordPostgres>[0],
    userId,
  );
}

export async function listAssessmentRecordsAsync(filters?: { userId?: number; limit?: number }) {
  // The proper repo function does not yet support per-user filtering;
  // it returns the most-recent N records regardless of creator. Until
  // a userId filter is added, the userId arg is dropped silently — the
  // legacy contract returns a row collection in either case. Matches
  // existing behavior in the dashboard and admin views.
  const { listAssessmentRecordsPostgres } = await import(
    "@/lib/server/postgres/repositories/assessments"
  );
  const limit = Math.min(filters?.limit ?? 200, 2000);
  return listAssessmentRecordsPostgres(limit);
}

// ── Consent / cost / material distribution async wrappers ────────────
export async function saveConsentRecordAsync(input: unknown, userId: number) {
  const { saveConsentRecord: fn } = await import("@/services/dataService");
  return fn(input, userId);
}

export async function saveCostEntryAsync(input: unknown, userId: number) {
  const { saveCostEntry: fn } = await import("@/services/dataService");
  return fn(input, userId);
}

export async function saveInterventionGroupAsync(input: unknown, userId: number) {
  const { saveInterventionGroup: fn } = await import("@/services/dataService");
  return fn(input, userId);
}

export async function saveMaterialDistributionAsync(input: unknown, userId: number) {
  const { saveMaterialDistribution: fn } = await import("@/services/dataService");
  return fn(input, userId);
}

export async function saveObservationRubricAsync(input: unknown, userId: number) {
  const { saveObservationRubric: fn } = await import("@/services/dataService");
  return fn(input, userId);
}

// ── Graduation stubs ─────────────────────────────────────────────────
export async function updateGraduationSettingsAsync(settings: unknown, _actor?: unknown) {
  await queryPostgres(
    `UPDATE graduation_settings SET data = $1::jsonb, updated_at = NOW() WHERE id = 1`,
    [JSON.stringify(settings)],
  );
}

export async function listGraduationQueueAsync(_filters?: unknown) {
  return { eligibleCount: 0, updatedAt: new Date().toISOString(), items: [] as Array<{ schoolId: number; schoolName: string; district: string; [key: string]: unknown }> };
}

export async function listGraduationReviewSupervisorsAsync() {
  return [];
}

export async function reviewSchoolGraduationAsync(..._args: unknown[]) {
  return { programStatus: 'monitoring', workflowState: 'monitoring' } as Record<string, unknown>;
}

// ── Support request stubs ────────────────────────────────────────────
export async function updateSupportRequest(id: number, updates: Record<string, unknown>, _actorOrExtra?: unknown) {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(updates)) {
    params.push(value);
    setClauses.push(`"${key}" = $${params.length}`);
  }
  params.push(id);
  await queryPostgres(
    `UPDATE support_requests SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
  return { id, ...updates } as Record<string, unknown> & { id: number };
}

// ── Impact narrative builder ─────────────────────────────────────────
export function buildImpactNarrative(
  _factPack: ImpactReportFactPack,
  options?: { partnerName?: string | null },
): ImpactReportNarrative {
  const partnerLabel = options?.partnerName || "Ozeki Reading Bridge Foundation";

  return {
    variant: "Public Impact Report" as const,
    factsLockInstruction:
      "Use only numbers in this Fact Pack. If a metric is missing, return: Data not available for this period.",
    executiveSummary: `Impact report for ${partnerLabel}.`,
    biggestImprovements: [],
    keyChallenges: [],
    nextPriorities: [],
    methodsNote:
      "Narrative was generated from the Report Fact Pack only. All figures are drawn from the monitoring database.",
    limitations:
      "Where baseline/endline pairs are missing, trend interpretation is limited.",
    sectionNarratives: [],
    template: {
      variant: "Public Impact Report" as const,
      sections: [],
      masterTemplateId: "default",
      masterTemplateName: "Public Impact Report",
      aiWritingRules: [] as string[],
      tableOfContents: [],
      generatedDate: new Date().toISOString(),
    },
  };
}

// ── Portal users admin stubs ─────────────────────────────────────────
export async function listPortalUsersForAdmin(_actor: PortalUser) {
  const result = await queryPostgres(
    `SELECT id, full_name AS "fullName", email, phone, role,
            geography_scope AS "geographyScope",
            department,
            status,
            must_change_password AS "mustChangePassword",
            is_supervisor AS "isSupervisor", is_me AS "isME",
            is_admin AS "isAdmin", is_superadmin AS "isSuperAdmin",
            created_at AS "createdAt",
            invited_at AS "invitedAt",
            last_login_at AS "lastLoginAt"
     FROM portal_users ORDER BY full_name`,
  );
  return result.rows as Array<{ id: number; fullName: string; email: string; phone: string; role: string; geographyScope: string | null; department: string | null; status: string; mustChangePassword: boolean; isSupervisor: boolean; isME: boolean; isAdmin: boolean; isSuperAdmin: boolean; createdAt: string; invitedAt: string | null; lastLoginAt: string | null }>;
}

export async function listPortalUsersForFilters(_actor: PortalUser) {
  const result = await queryPostgres(
    `SELECT id, full_name AS "fullName", email, role
     FROM portal_users ORDER BY full_name`,
  );
  return result.rows as Array<{ id: number; fullName: string; email: string; role: string }>;
}

export async function createPortalUserAccount(payload: {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  password: string;
  department?: string;
  geographyScope?: string;
  status?: string;
  mustChangePassword?: boolean;
  isSupervisor?: boolean;
  isME?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}, _actor: PortalUser) {
  const passwordHash = await hashPassword(payload.password);
  const status = payload.status ?? "active";
  const mustChangePassword = payload.mustChangePassword ?? false;
  const invitedAt = status === "invited" ? new Date().toISOString() : null;
  await queryPostgres(
    `INSERT INTO portal_users (full_name, email, phone, role, password_hash, department, geography_scope, status, must_change_password, invited_at, is_supervisor, is_me, is_admin, is_superadmin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11, $12, $13, $14)`,
    [
      payload.fullName,
      payload.email.toLowerCase(),
      payload.phone ?? null,
      payload.role,
      passwordHash,
      payload.department ?? null,
      payload.geographyScope ?? null,
      status,
      mustChangePassword,
      invitedAt,
      payload.isSupervisor ?? false,
      payload.isME ?? false,
      payload.isAdmin ?? false,
      payload.isSuperAdmin ?? false,
    ],
  );
}

export async function updatePortalUserPermissions(
  userId: number,
  updates: Record<string, unknown>,
  _actor: PortalUser,
) {
  const allowedFields = ["fullName", "phone", "role", "department", "geographyScope", "status", "mustChangePassword", "isSupervisor", "isME", "isAdmin", "isSuperAdmin", "password"];
  const fieldMap: Record<string, string> = {
    fullName: "full_name",
    phone: "phone",
    role: "role",
    department: "department",
    geographyScope: "geography_scope",
    status: "status",
    mustChangePassword: "must_change_password",
    isSupervisor: "is_supervisor",
    isME: "is_me",
    isAdmin: "is_admin",
    isSuperAdmin: "is_superadmin",
  };

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedFields.includes(key) || key === "userId") continue;
    if (key === "password" && typeof value === "string") {
      params.push(await hashPassword(value));
      setClauses.push(`password_hash = $${params.length}`);
    } else if (fieldMap[key]) {
      params.push(value);
      setClauses.push(`${fieldMap[key]} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) return;
  params.push(userId);
  await queryPostgres(
    `UPDATE portal_users SET ${setClauses.join(", ")} WHERE id = $${params.length}`,
    params,
  );
}

export async function deletePortalUserAccount(userId: number, _actor: PortalUser) {
  await queryPostgres(`DELETE FROM portal_sessions WHERE user_id = $1`, [userId]);
  await queryPostgres(`DELETE FROM portal_users WHERE id = $1`, [userId]);
}

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

// ── authService re-exports ───────────────────────────────────────────
export {
  authenticatePortalUser,
  createPortalSession,
  deletePortalSession,
  getPortalUserByEmail,
  getPortalUserFromSession,
} from "@/services/authService";

// ── Graduation re-exports ────────────────────────────────────────────
export {
  getGraduationSettingsPostgres as getGraduationSettingsAsync,
} from "@/lib/server/postgres/repositories/graduation";

export {
  getTeachingImprovementSettingsPostgres as getTeachingImprovementSettingsAsync,
} from "@/lib/server/postgres/repositories/public-impact";

// ── canManagePortalUsers (business logic) ────────────────────────────
export function canManagePortalUsers(user: PortalUser): boolean {
  return Boolean(user.isAdmin || user.isSuperAdmin);
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
  ...args: Parameters<typeof _updatePortalRecord>
) {
  return _updatePortalRecord(...args);
}

export async function setPortalRecordStatusAsync(
  recordId: number,
  status: string,
  actor: PortalUser,
) {
  return _updatePortalRecord(recordId, { status } as never, actor);
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

export async function addTeacherToSchool(schoolId: number, teacher: { fullName: string; uid?: string }) {
  const uid = teacher.uid || `T-${Date.now()}`;
  await queryPostgres(
    `INSERT INTO school_contacts (school_id, full_name, uid) VALUES ($1, $2, $3)`,
    [schoolId, teacher.fullName, uid],
  );
  return { uid };
}

export async function createSchoolDirectoryRecord(input: Record<string, unknown>) {
  const result = await queryPostgres(
    `INSERT INTO school_directory (name, district, sub_county, parish, created_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
    [input.name ?? "", input.district ?? "", input.subCounty ?? "", input.parish ?? ""],
  );
  return { id: Number(result.rows[0]?.id ?? 0) };
}

export async function getSchoolGraduationEligibilityAsync(_schoolId: number) {
  return null;
}

export async function refreshSchoolGraduationEligibilityCacheAsync() {
  // no-op
}

// ── Lesson evaluation stubs ──────────────────────────────────────────
export async function createLessonEvaluationAsync(input: unknown, actor: PortalUser) {
  const result = await queryPostgres(
    `INSERT INTO lesson_evaluations (data, created_by_user_id, created_at)
     VALUES ($1::jsonb, $2, NOW()) RETURNING id`,
    [JSON.stringify(input), actor.id],
  );
  return { id: Number(result.rows[0]?.id ?? 0) };
}

export async function updateLessonEvaluationAsync(id: number, input: unknown, actor: PortalUser) {
  await queryPostgres(
    `UPDATE lesson_evaluations SET data = $1::jsonb, updated_by_user_id = $2, updated_at = NOW() WHERE id = $3`,
    [JSON.stringify(input), actor.id, id],
  );
  return { id };
}

export async function voidLessonEvaluationAsync(id: number, actor: PortalUser) {
  await queryPostgres(
    `UPDATE lesson_evaluations SET voided = TRUE, voided_by_user_id = $1, voided_at = NOW() WHERE id = $2`,
    [actor.id, id],
  );
  return { id };
}

export async function getLessonEvaluationByIdAsync(id: number) {
  const result = await queryPostgres(
    `SELECT id, data, created_by_user_id AS "createdByUserId", created_at AS "createdAt"
     FROM lesson_evaluations WHERE id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listLessonEvaluationsAsync(filters?: { userId?: number; limit?: number }) {
  const limit = Math.min(filters?.limit ?? 200, 2000);
  const params: unknown[] = [limit];
  const clauses: string[] = [];
  if (filters?.userId) {
    params.push(filters.userId);
    clauses.push(`created_by_user_id = $${params.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `SELECT id, data, created_by_user_id AS "createdByUserId", created_at AS "createdAt"
     FROM lesson_evaluations ${where} ORDER BY created_at DESC LIMIT $1`,
    params,
  );
  return result.rows;
}

export async function getTeacherImprovementProfileAsync(_teacherUid: string) {
  return null;
}

export async function listTeacherImprovementComparisonsAsync(_filters?: unknown) {
  return [];
}

export async function recomputeLearningAutomationSnapshots() {
  // no-op
}

// ── Assessment stubs ─────────────────────────────────────────────────
export async function saveAssessmentRecordAsync(input: unknown, actor: PortalUser) {
  const result = await queryPostgres(
    `INSERT INTO assessment_records (data, created_by_user_id, created_at)
     VALUES ($1::jsonb, $2, NOW()) RETURNING id`,
    [JSON.stringify(input), actor.id],
  );
  return { id: Number(result.rows[0]?.id ?? 0) };
}

export async function listAssessmentRecordsAsync(filters?: { userId?: number; limit?: number }) {
  const limit = Math.min(filters?.limit ?? 200, 2000);
  const params: unknown[] = [limit];
  const clauses: string[] = [];
  if (filters?.userId) {
    params.push(filters.userId);
    clauses.push(`created_by_user_id = $${params.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `SELECT id, data, created_by_user_id AS "createdByUserId", created_at AS "createdAt"
     FROM assessment_records ${where} ORDER BY created_at DESC LIMIT $1`,
    params,
  );
  return result.rows;
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
export async function updateGraduationSettingsAsync(settings: unknown) {
  await queryPostgres(
    `UPDATE graduation_settings SET data = $1::jsonb, updated_at = NOW() WHERE id = 1`,
    [JSON.stringify(settings)],
  );
}

export async function listGraduationQueueAsync(_filters?: unknown) {
  return [];
}

export async function listGraduationReviewSupervisorsAsync() {
  return [];
}

export async function reviewSchoolGraduationAsync(_schoolId: number, _decision: unknown, _actor: PortalUser) {
  // no-op
}

// ── Support request stubs ────────────────────────────────────────────
export async function updateSupportRequest(id: number, updates: Record<string, unknown>) {
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
    },
  };
}

// ── Portal users admin stubs ─────────────────────────────────────────
export async function listPortalUsersForAdmin(_actor: PortalUser) {
  const result = await queryPostgres(
    `SELECT id, full_name AS "fullName", email, phone, role,
            is_supervisor AS "isSupervisor", is_me AS "isME",
            is_admin AS "isAdmin", is_superadmin AS "isSuperAdmin",
            created_at AS "createdAt"
     FROM portal_users ORDER BY full_name`,
  );
  return result.rows;
}

export async function listPortalUsersForFilters(_actor: PortalUser) {
  const result = await queryPostgres(
    `SELECT id, full_name AS "fullName", email, role
     FROM portal_users ORDER BY full_name`,
  );
  return result.rows;
}

export async function createPortalUserAccount(payload: {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  password: string;
  isSupervisor?: boolean;
  isME?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}, _actor: PortalUser) {
  const crypto = await import("node:crypto");
  const passwordHash = crypto.createHash("sha256").update(payload.password).digest("hex");
  await queryPostgres(
    `INSERT INTO portal_users (full_name, email, phone, role, password_hash, is_supervisor, is_me, is_admin, is_superadmin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      payload.fullName,
      payload.email.toLowerCase(),
      payload.phone ?? null,
      payload.role,
      passwordHash,
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
  const allowedFields = ["fullName", "phone", "role", "isSupervisor", "isME", "isAdmin", "isSuperAdmin", "password"];
  const fieldMap: Record<string, string> = {
    fullName: "full_name",
    phone: "phone",
    role: "role",
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
      const crypto = await import("node:crypto");
      params.push(crypto.createHash("sha256").update(value).digest("hex"));
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

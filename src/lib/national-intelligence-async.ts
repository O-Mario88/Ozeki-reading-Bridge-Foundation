import type { PortalUser } from "@/lib/types";
import { getDb, replaceSqliteRowsInPostgres, upsertSqliteRowToPostgres } from "@/lib/db";
import {
  type BenchmarkProfileRecord,
  type BenchmarkRuleInput,
  type BenchmarkRuleRecord,
  type DataQualityCenterSummaryRecord,
  type EducationAuditExceptionRecord,
  type InterventionActionRecord,
  type InterventionPlanRecord,
  type NationalInsightWidgetData,
  type NationalPriorityQueueItem,
  type NationalReportPreset,
  type NlisGeoScopeType,
  assignPriorityQueueItem,
  createBenchmarkProfile,
  createInterventionPlan,
  createInterventionPlanFromPriority,
  getNationalInsights,
  listBenchmarkProfiles,
  listBenchmarkRules,
  listDataQualitySummaries,
  listEducationAuditExceptions,
  listInterventionActions,
  listInterventionPlans,
  listPortalUsersForAssignments,
  resolveEducationAuditException,
  runEducationDataQualitySweep,
  updateBenchmarkProfile,
  updateInterventionAction,
  upsertBenchmarkRule,
  addInterventionAction,
} from "@/lib/national-intelligence";
import { isPostgresConfigured, queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import {
  listAssessmentRowsForPublicImpactPostgres,
  listLessonEvaluationRowsForPublicImpactPostgres,
} from "@/lib/server/postgres/repositories/public-impact";

function normalizeDate(value: string | undefined | null, fallback: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return fallback;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function currentPeriodKey() {
  return new Date().toISOString().slice(0, 7);
}

function toPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Number(((part / total) * 100).toFixed(1));
}

function stripText(value: unknown) {
  return String(value ?? "").trim();
}

function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value || !value.trim()) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function computeDistribution(rows: Array<{ band: number; comprehensionScore: number | null }>) {
  const n = rows.length;
  let level0 = 0;
  let level01 = 0;
  let at20 = 0;
  let at40 = 0;
  let at60 = 0;
  let comprehensionProficient = 0;

  rows.forEach((row) => {
    if (row.band <= 0) level0 += 1;
    if (row.band <= 1) level01 += 1;
    if (row.band >= 2) at20 += 1;
    if (row.band >= 3) at40 += 1;
    if (row.band >= 4) at60 += 1;

    const comp = Number(row.comprehensionScore ?? 0);
    if (comp >= 70 || comp >= 4) {
      comprehensionProficient += 1;
    }
  });

  return {
    n,
    nonReadersPct: toPercent(level0, n),
    belowMinimumPct: toPercent(level01, n),
    at20PlusPct: toPercent(at20, n),
    at40PlusPct: toPercent(at40, n),
    at60PlusPct: toPercent(at60, n),
    comprehensionProficientPct: toPercent(comprehensionProficient, n),
  };
}

function formatEvidenceSummary(args: {
  nonReadersPct: number;
  at20PlusDeltaPct: number;
  teachingQualityPct: number;
  coachingCoveragePct: number;
  completenessPct: number;
}) {
  const parts = [
    `non-readers ${args.nonReadersPct}%`,
    `20+ delta ${args.at20PlusDeltaPct >= 0 ? "+" : ""}${args.at20PlusDeltaPct}%`,
    `teaching quality ${args.teachingQualityPct}%`,
    `coaching coverage ${args.coachingCoveragePct}%`,
    `completeness ${args.completenessPct}%`,
  ];
  return parts.join(", ");
}

function coercePriorityLevel(riskScore: number): NationalPriorityQueueItem["priorityLevel"] {
  if (riskScore >= 60) {
    return "high";
  }
  if (riskScore >= 30) {
    return "medium";
  }
  return "low";
}

function generatePriorityIntervention(args: {
  nonReadersPct: number;
  at20PlusDeltaPct: number;
  teachingQualityPct: number;
  coachingCoveragePct: number;
}): NationalPriorityQueueItem["recommendedIntervention"] {
  if (args.nonReadersPct >= 35 || args.at20PlusDeltaPct <= 0) {
    return "Remedial & Catch-up";
  }
  if (args.teachingQualityPct < 60) {
    return "Coaching";
  }
  if (args.coachingCoveragePct < 40) {
    return "Training";
  }
  return "Leadership support";
}

function buildScopeWhereClause(
  params: unknown[],
  scopeType: NlisGeoScopeType,
  scopeId: string,
  alias = "sd",
) {
  const normalizedScopeId = stripText(scopeId);
  if (scopeType === "country") {
    return "1=1";
  }
  if (scopeType === "region") {
    params.push(normalizedScopeId);
    return `lower(trim(COALESCE(${alias}.region, ''))) = lower(trim($${params.length}))`;
  }
  if (scopeType === "sub_region") {
    params.push(normalizedScopeId);
    return `lower(trim(COALESCE(${alias}.sub_region, ''))) = lower(trim($${params.length}))`;
  }
  if (scopeType === "district") {
    params.push(normalizedScopeId);
    return `lower(trim(COALESCE(${alias}.district, ''))) = lower(trim($${params.length}))`;
  }
  if (scopeType === "sub_county") {
    params.push(normalizedScopeId);
    return `lower(trim(COALESCE(${alias}.sub_county, ''))) = lower(trim($${params.length}))`;
  }
  if (scopeType === "parish") {
    params.push(normalizedScopeId);
    return `lower(trim(COALESCE(${alias}.parish, ''))) = lower(trim($${params.length}))`;
  }

  const schoolId = Number(normalizedScopeId);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new Error("School scope requires numeric scopeId.");
  }
  params.push(schoolId);
  return `${alias}.id = $${params.length}`;
}

async function logAuditEventAsync(args: {
  userId: number;
  userName: string;
  action: string;
  targetTable: string | null;
  targetId: string | number | null;
  detail: string;
}) {
  await queryPostgres(
    `
      INSERT INTO audit_logs (
        user_id, user_name, action, target_table, target_id, detail, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [
      args.userId,
      args.userName,
      args.action,
      args.targetTable,
      args.targetId === null ? null : String(args.targetId),
      args.detail,
    ],
  );
}

async function listSchoolsForScopeAsync(scopeType: NlisGeoScopeType, scopeId: string) {
  if (!isPostgresConfigured()) {
    const db = getDb();
    const normalizedScopeId = stripText(scopeId);
    const scopeParams: Record<string, string | number> = {};
    let where = "1=1";
    if (scopeType !== "country") {
      if (scopeType === "region") {
        where = "lower(trim(COALESCE(sd.region, ''))) = lower(trim(@scopeId))";
        scopeParams.scopeId = normalizedScopeId;
      } else if (scopeType === "sub_region") {
        where = "lower(trim(COALESCE(sd.sub_region, ''))) = lower(trim(@scopeId))";
        scopeParams.scopeId = normalizedScopeId;
      } else if (scopeType === "district") {
        where = "lower(trim(COALESCE(sd.district, ''))) = lower(trim(@scopeId))";
        scopeParams.scopeId = normalizedScopeId;
      } else if (scopeType === "sub_county") {
        where = "lower(trim(COALESCE(sd.sub_county, ''))) = lower(trim(@scopeId))";
        scopeParams.scopeId = normalizedScopeId;
      } else if (scopeType === "parish") {
        where = "lower(trim(COALESCE(sd.parish, ''))) = lower(trim(@scopeId))";
        scopeParams.scopeId = normalizedScopeId;
      } else {
        const schoolId = Number(normalizedScopeId);
        if (!Number.isInteger(schoolId) || schoolId <= 0) {
          throw new Error("School scope requires numeric scopeId.");
        }
        where = "sd.id = @schoolId";
        scopeParams.schoolId = schoolId;
      }
    }

    return db
      .prepare(
        `
        SELECT
          sd.id AS schoolId,
          sd.name AS schoolName,
          COALESCE(sd.district, '') AS district,
          COALESCE(sd.sub_region, '') AS subRegion,
          COALESCE(sd.region, '') AS region,
          COALESCE(sd.sub_county, '') AS subCounty,
          COALESCE(sd.parish, '') AS parish
        FROM schools_directory sd
        WHERE ${where}
        ORDER BY sd.name ASC
        `,
      )
      .all(scopeParams) as Array<{
      schoolId: number;
      schoolName: string;
      district: string;
      subRegion: string;
      region: string;
      subCounty: string;
      parish: string;
    }>;
  }

  const params: unknown[] = [];
  const where = buildScopeWhereClause(params, scopeType, scopeId, "sd");
  const result = await queryPostgres<{
    schoolId: number;
    schoolName: string;
    district: string;
    subRegion: string;
    region: string;
    subCounty: string;
    parish: string;
  }>(
    `
      SELECT
        sd.id AS "schoolId",
        sd.name AS "schoolName",
        COALESCE(sd.district, '') AS district,
        COALESCE(sd.sub_region, '') AS "subRegion",
        COALESCE(sd.region, '') AS region,
        COALESCE(sd.sub_county, '') AS "subCounty",
        COALESCE(sd.parish, '') AS parish
      FROM schools_directory sd
      WHERE ${where}
      ORDER BY sd.name ASC
    `,
    params,
  );
  return result.rows.map((row) => ({
    schoolId: Number(row.schoolId),
    schoolName: String(row.schoolName ?? ""),
    district: String(row.district ?? ""),
    subRegion: String(row.subRegion ?? ""),
    region: String(row.region ?? ""),
    subCounty: String(row.subCounty ?? ""),
    parish: String(row.parish ?? ""),
  }));
}

async function syncBenchmarkProfileToPostgres(benchmarkId: number) {
  if (!isPostgresConfigured()) {
    return;
  }
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM benchmark_profiles WHERE benchmark_id = @benchmarkId LIMIT 1")
    .get({ benchmarkId }) as Record<string, unknown> | undefined;
  if (!row) {
    await queryPostgres(`DELETE FROM benchmark_profiles WHERE benchmark_id = $1`, [benchmarkId]);
    return;
  }
  await upsertSqliteRowToPostgres("benchmark_profiles", "benchmark_id", row);
}

async function syncBenchmarkRulesToPostgres(benchmarkId: number) {
  if (!isPostgresConfigured()) {
    return;
  }
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM benchmark_rules WHERE benchmark_id = @benchmarkId")
    .all({ benchmarkId }) as Array<Record<string, unknown>>;
  await replaceSqliteRowsInPostgres("benchmark_rules", "rule_id", "benchmark_id", benchmarkId, rows);
}

async function syncEducationAuditExceptionToPostgres(exceptionId: number) {
  if (!isPostgresConfigured()) {
    return;
  }
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM edu_audit_exceptions WHERE exception_id = @exceptionId LIMIT 1")
    .get({ exceptionId }) as Record<string, unknown> | undefined;
  if (!row) {
    await queryPostgres(`DELETE FROM edu_audit_exceptions WHERE exception_id = $1`, [exceptionId]);
    return;
  }
  await upsertSqliteRowToPostgres("edu_audit_exceptions", "exception_id", row);
}

async function syncDataQualityScopeToPostgres(scopeType: NlisGeoScopeType, scopeId: string) {
  if (!isPostgresConfigured()) {
    return;
  }
  const db = getDb();
  const exceptions = db
    .prepare(
      `
        SELECT *
        FROM edu_audit_exceptions
        WHERE scope_type = @scopeType
          AND scope_id = @scopeId
      `,
    )
    .all({ scopeType, scopeId }) as Array<Record<string, unknown>>;
  const summaries = db
    .prepare(
      `
        SELECT *
        FROM edu_data_quality_summary
        WHERE scope_type = @scopeType
          AND scope_id = @scopeId
      `,
    )
    .all({ scopeType, scopeId }) as Array<Record<string, unknown>>;

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `DELETE FROM edu_audit_exceptions WHERE scope_type = $1 AND scope_id = $2`,
        [scopeType, scopeId],
      );
      for (const row of exceptions) {
        await upsertSqliteRowToPostgres("edu_audit_exceptions", "exception_id", row, client);
      }

      await client.query(
        `DELETE FROM edu_data_quality_summary WHERE scope_type = $1 AND scope_id = $2`,
        [scopeType, scopeId],
      );
      for (const row of summaries) {
        const columns = Object.keys(row);
        if (columns.length === 0) {
          continue;
        }
        const values = columns.map((column) => row[column]);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        const updates = columns
          .filter((column) => !["scope_type", "scope_id", "period_key"].includes(column))
          .map((column) => `${column} = EXCLUDED.${column}`)
          .join(", ");
        await client.query(
          `
            INSERT INTO edu_data_quality_summary (${columns.join(", ")})
            VALUES (${placeholders})
            ON CONFLICT (scope_type, scope_id, period_key)
            DO UPDATE SET ${updates}
          `,
          values,
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

async function syncPriorityAssignmentToPostgres(schoolId: number, periodKey: string) {
  if (!isPostgresConfigured()) {
    return;
  }
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT *
        FROM edu_priority_queue_assignments
        WHERE school_id = @schoolId AND period_key = @periodKey
        LIMIT 1
      `,
    )
    .get({ schoolId, periodKey }) as Record<string, unknown> | undefined;
  if (!row) {
    await queryPostgres(
      `DELETE FROM edu_priority_queue_assignments WHERE school_id = $1 AND period_key = $2`,
      [schoolId, periodKey],
    );
    return;
  }
  await upsertSqliteRowToPostgres("edu_priority_queue_assignments", "id", row);
}

async function syncInterventionPlanBundleToPostgres(planId: number) {
  if (!isPostgresConfigured()) {
    return;
  }
  const db = getDb();
  const plan = db
    .prepare("SELECT * FROM intervention_plan WHERE plan_id = @planId LIMIT 1")
    .get({ planId }) as Record<string, unknown> | undefined;
  if (!plan) {
    await queryPostgres(`DELETE FROM intervention_plan WHERE plan_id = $1`, [planId]);
    await queryPostgres(`DELETE FROM intervention_actions WHERE plan_id = $1`, [planId]);
    return;
  }

  const actions = db
    .prepare("SELECT * FROM intervention_actions WHERE plan_id = @planId")
    .all({ planId }) as Array<Record<string, unknown>>;

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      await upsertSqliteRowToPostgres("intervention_plan", "plan_id", plan, client);
      await replaceSqliteRowsInPostgres("intervention_actions", "action_id", "plan_id", planId, actions, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

function mapBenchmarkProfileRow(row: {
  benchmarkId: number;
  name: string;
  effectiveFromDate: string;
  effectiveToDate: string | null;
  notes: string | null;
  isActive: boolean | number;
  createdBy: number;
  createdAt: string;
  rulesCount: number;
}): BenchmarkProfileRecord {
  return {
    benchmarkId: Number(row.benchmarkId),
    name: row.name,
    effectiveFromDate: row.effectiveFromDate,
    effectiveToDate: row.effectiveToDate,
    notes: row.notes,
    isActive: Boolean(row.isActive),
    createdBy: Number(row.createdBy),
    createdAt: row.createdAt,
    rulesCount: Number(row.rulesCount ?? 0),
  };
}

function mapInterventionActionRow(row: {
  actionId: number;
  planId: number;
  actionType: InterventionActionRecord["actionType"];
  ownerUserId: number;
  ownerUserName: string | null;
  dueDate: string | null;
  status: InterventionActionRecord["status"];
  visitId: number | null;
  trainingId: number | null;
  assessmentId: number | null;
  storyActivityId: number | null;
  outcomeNotes: string | null;
  createdAt: string;
  updatedAt: string;
}): InterventionActionRecord {
  return {
    actionId: Number(row.actionId),
    planId: Number(row.planId),
    actionType: row.actionType,
    ownerUserId: Number(row.ownerUserId),
    ownerUserName: row.ownerUserName ?? "Unknown",
    dueDate: row.dueDate,
    status: row.status,
    visitId: row.visitId === null ? null : Number(row.visitId),
    trainingId: row.trainingId === null ? null : Number(row.trainingId),
    assessmentId: row.assessmentId === null ? null : Number(row.assessmentId),
    storyActivityId: row.storyActivityId === null ? null : Number(row.storyActivityId),
    outcomeNotes: row.outcomeNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listBenchmarkProfilesAsync() {
  if (!isPostgresConfigured()) {
    return listBenchmarkProfiles();
  }
  const result = await queryPostgres<{
    benchmarkId: number;
    name: string;
    effectiveFromDate: string;
    effectiveToDate: string | null;
    notes: string | null;
    isActive: boolean;
    createdBy: number;
    createdAt: string;
    rulesCount: number;
  }>(
    `
      SELECT
        bp.benchmark_id AS "benchmarkId",
        bp.name,
        bp.effective_from_date AS "effectiveFromDate",
        bp.effective_to_date AS "effectiveToDate",
        bp.notes,
        bp.is_active AS "isActive",
        bp.created_by AS "createdBy",
        bp.created_at::text AS "createdAt",
        COUNT(br.rule_id)::int AS "rulesCount"
      FROM benchmark_profiles bp
      LEFT JOIN benchmark_rules br ON br.benchmark_id = bp.benchmark_id
      GROUP BY bp.benchmark_id
      ORDER BY bp.is_active DESC, bp.effective_from_date DESC, bp.benchmark_id DESC
    `,
  );
  return result.rows.map((row) => mapBenchmarkProfileRow(row));
}

export async function listBenchmarkRulesAsync(benchmarkId: number) {
  if (!isPostgresConfigured()) {
    return listBenchmarkRules(benchmarkId);
  }
  const result = await queryPostgres<{
    ruleId: number;
    benchmarkId: number;
    grade: string;
    language: string;
    cwpmBandsJson: string;
    comprehensionRuleJson: string;
    optionalAccuracyFloor: number | null;
    domainThresholdsJson: string;
    createdAt: string;
  }>(
    `
      SELECT
        rule_id AS "ruleId",
        benchmark_id AS "benchmarkId",
        grade,
        language,
        cwpm_bands_json AS "cwpmBandsJson",
        comprehension_proficient_rule_json AS "comprehensionRuleJson",
        optional_accuracy_floor AS "optionalAccuracyFloor",
        domain_proficiency_thresholds_json AS "domainThresholdsJson",
        created_at::text AS "createdAt"
      FROM benchmark_rules
      WHERE benchmark_id = $1
      ORDER BY CASE grade
        WHEN 'ALL' THEN 0
        WHEN 'P1' THEN 1
        WHEN 'P2' THEN 2
        WHEN 'P3' THEN 3
        WHEN 'P4' THEN 4
        WHEN 'P5' THEN 5
        WHEN 'P6' THEN 6
        WHEN 'P7' THEN 7
        ELSE 99
      END ASC,
      language ASC
    `,
    [benchmarkId],
  );
  return result.rows.map((row) => ({
    ruleId: Number(row.ruleId),
    benchmarkId: Number(row.benchmarkId),
    grade: row.grade as BenchmarkRuleRecord["grade"],
    language: row.language,
    cwpmBands: parseJsonObject<BenchmarkRuleRecord["cwpmBands"]>(row.cwpmBandsJson, {
      non_reader: 0,
      emergent: [1, 19],
      minimum: [20, 39],
      competent: [40, 59],
      strong: [60, 300],
    }),
    comprehensionProficientRule: parseJsonObject<BenchmarkRuleRecord["comprehensionProficientRule"]>(
      row.comprehensionRuleJson,
      { type: "percent", threshold: 70 },
    ),
    optionalAccuracyFloor:
      row.optionalAccuracyFloor === null || row.optionalAccuracyFloor === undefined
        ? null
        : Number(row.optionalAccuracyFloor),
    domainProficiencyThresholds: parseJsonObject<Record<string, number>>(row.domainThresholdsJson, {}),
    createdAt: row.createdAt,
  })) as BenchmarkRuleRecord[];
}

export async function createBenchmarkProfileAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    name: string;
    effectiveFromDate: string;
    effectiveToDate?: string | null;
    notes?: string;
    isActive?: boolean;
  };
}) {
  const profile = createBenchmarkProfile(args);
  if (!profile) {
    return null;
  }
  await syncBenchmarkProfileToPostgres(profile.benchmarkId);
  return (await listBenchmarkProfilesAsync()).find((item) => item.benchmarkId === profile.benchmarkId) ?? profile;
}

export async function updateBenchmarkProfileAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  benchmarkId: number;
  input: {
    name?: string;
    effectiveFromDate?: string;
    effectiveToDate?: string | null;
    notes?: string | null;
    isActive?: boolean;
  };
}) {
  const profile = updateBenchmarkProfile(args);
  if (!profile) {
    return null;
  }
  await syncBenchmarkProfileToPostgres(args.benchmarkId);
  return (await listBenchmarkProfilesAsync()).find((item) => item.benchmarkId === args.benchmarkId) ?? profile;
}

export async function upsertBenchmarkRuleAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: BenchmarkRuleInput;
}) {
  const rules = upsertBenchmarkRule(args);
  await syncBenchmarkRulesToPostgres(args.input.benchmarkId);
  return isPostgresConfigured() ? listBenchmarkRulesAsync(args.input.benchmarkId) : rules;
}

export async function listEducationAuditExceptionsAsync(filters?: {
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
  status?: "open" | "resolved" | "overridden";
  severity?: "low" | "medium" | "high";
  ruleCode?: string;
  limit?: number;
}) {
  if (!isPostgresConfigured()) {
    return listEducationAuditExceptions(filters);
  }
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters?.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`scope_type = $${params.length}`);
  }
  if (filters?.scopeId?.trim()) {
    params.push(filters.scopeId.trim());
    clauses.push(`scope_id = $${params.length}`);
  }
  if (filters?.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters?.severity) {
    params.push(filters.severity);
    clauses.push(`severity = $${params.length}`);
  }
  if (filters?.ruleCode?.trim()) {
    params.push(filters.ruleCode.trim());
    clauses.push(`rule_code = $${params.length}`);
  }
  const limit = Math.max(1, Math.min(filters?.limit ?? 400, 2000));
  const result = await queryPostgres<{
    exceptionId: number;
    entityType: string;
    entityId: string;
    ruleCode: string;
    severity: "low" | "medium" | "high";
    message: string;
    status: "open" | "resolved" | "overridden";
    scopeType: NlisGeoScopeType;
    scopeId: string;
    periodKey: string;
    createdAt: string;
    resolvedAt: string | null;
    resolvedBy: number | null;
    resolutionNotes: string | null;
  }>(
    `
      SELECT
        exception_id AS "exceptionId",
        entity_type AS "entityType",
        entity_id AS "entityId",
        rule_code AS "ruleCode",
        severity,
        message,
        status,
        scope_type AS "scopeType",
        scope_id AS "scopeId",
        period_key AS "periodKey",
        created_at::text AS "createdAt",
        resolved_at::text AS "resolvedAt",
        resolved_by AS "resolvedBy",
        resolution_notes AS "resolutionNotes"
      FROM edu_audit_exceptions
      WHERE ${clauses.join(" AND ")}
      ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
               CASE status WHEN 'open' THEN 0 WHEN 'overridden' THEN 1 ELSE 2 END,
               created_at DESC,
               exception_id DESC
      LIMIT ${limit}
    `,
    params,
  );
  return result.rows.map((row) => ({
    exceptionId: Number(row.exceptionId),
    entityType: row.entityType as EducationAuditExceptionRecord["entityType"],
    entityId: row.entityId,
    ruleCode: row.ruleCode,
    severity: row.severity,
    message: row.message,
    status: row.status,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    periodKey: row.periodKey,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy === null || row.resolvedBy === undefined ? null : Number(row.resolvedBy),
    resolutionNotes: row.resolutionNotes,
  })) as EducationAuditExceptionRecord[];
}

export async function resolveEducationAuditExceptionAsync(args: {
  user: Pick<PortalUser, "id" | "fullName" | "isSuperAdmin">;
  exceptionId: number;
  status: "resolved" | "overridden";
  notes: string;
}) {
  resolveEducationAuditException(args);
  await syncEducationAuditExceptionToPostgres(args.exceptionId);
}

export async function listDataQualitySummariesAsync(filters?: {
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
  periodKey?: string;
  limit?: number;
}) {
  if (!isPostgresConfigured()) {
    return listDataQualitySummaries(filters);
  }
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters?.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`scope_type = $${params.length}`);
  }
  if (filters?.scopeId?.trim()) {
    params.push(filters.scopeId.trim());
    clauses.push(`scope_id = $${params.length}`);
  }
  if (filters?.periodKey?.trim()) {
    params.push(filters.periodKey.trim());
    clauses.push(`period_key = $${params.length}`);
  }
  const limit = Math.max(1, Math.min(filters?.limit ?? 200, 1000));
  const result = await queryPostgres<{
    scopeType: NlisGeoScopeType;
    scopeId: string;
    periodKey: string;
    completenessPct: number;
    coverageJson: string;
    exceptionCountsJson: string;
    lastUpdated: string;
  }>(
    `
      SELECT
        scope_type AS "scopeType",
        scope_id AS "scopeId",
        period_key AS "periodKey",
        completeness_pct AS "completenessPct",
        coverage_json AS "coverageJson",
        exception_counts_json AS "exceptionCountsJson",
        last_updated::text AS "lastUpdated"
      FROM edu_data_quality_summary
      WHERE ${clauses.join(" AND ")}
      ORDER BY last_updated DESC
      LIMIT ${limit}
    `,
    params,
  );
  return result.rows.map((row) => ({
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    periodKey: row.periodKey,
    completenessPct: Number(row.completenessPct ?? 0),
    coverageIndicators: parseJsonObject<DataQualityCenterSummaryRecord["coverageIndicators"]>(row.coverageJson, {
      schoolsTotal: 0,
      schoolsWithBaseline: 0,
      schoolsWithEndline: 0,
      schoolsMissingEndline: 0,
      districtsLowCoverage: 0,
    }),
    exceptionCounts: parseJsonObject<DataQualityCenterSummaryRecord["exceptionCounts"]>(row.exceptionCountsJson, {
      open: 0,
      high: 0,
      medium: 0,
      low: 0,
    }),
    lastUpdated: row.lastUpdated,
  })) as DataQualityCenterSummaryRecord[];
}

export async function runEducationDataQualitySweepAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
}) {
  const result = runEducationDataQualitySweep(args);
  if (isPostgresConfigured()) {
    await syncDataQualityScopeToPostgres(result.scopeType, result.scopeId);
  }
  return result;
}

export async function listPortalUsersForAssignmentsAsync() {
  if (!isPostgresConfigured()) {
    return listPortalUsersForAssignments();
  }
  const result = await queryPostgres<{
    id: number;
    fullName: string;
    role: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }>(
    `
      SELECT
        id,
        full_name AS "fullName",
        role,
        is_admin AS "isAdmin",
        is_superadmin AS "isSuperAdmin"
      FROM portal_users
      WHERE role IN ('Staff', 'Admin') OR is_admin = TRUE OR is_superadmin = TRUE
      ORDER BY is_superadmin DESC, is_admin DESC, full_name ASC
    `,
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    fullName: row.fullName,
    role: row.role,
    isAdmin: Boolean(row.isAdmin),
    isSuperAdmin: Boolean(row.isSuperAdmin),
  }));
}

export async function assignPriorityQueueItemAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  schoolId: number;
  periodKey?: string;
  ownerUserId: number;
  notes?: string;
}) {
  assignPriorityQueueItem(args);
  await syncPriorityAssignmentToPostgres(args.schoolId, stripText(args.periodKey ?? "") || currentPeriodKey());
}

export async function getNationalInsightsAsync(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}): Promise<NationalInsightWidgetData> {
  if (!isPostgresConfigured()) {
    return getNationalInsights(args);
  }

  const periodStart = normalizeDate(args.periodStart ?? "", `${new Date().getUTCFullYear()}-01-01`);
  const periodEnd = normalizeDate(args.periodEnd ?? "", new Date().toISOString().slice(0, 10));
  const schools = await listSchoolsForScopeAsync(args.scopeType, args.scopeId);
  const schoolIds = schools.map((school) => Number(school.schoolId)).filter((id) => id > 0);

  if (schoolIds.length === 0) {
    return {
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodStart,
      periodEnd,
      movement: {
        nonReaderReductionPct: 0,
        movedTo20PlusPct: 0,
        movedTo40PlusPct: 0,
        movedTo60PlusPct: 0,
        comprehensionProficientDeltaPct: 0,
        sampleSize: 0,
      },
      cohortTracking: [],
      alignedDrivers: {
        coachingFrequencyPerSchool: 0,
        teachingQualityLatestPct: 0,
        teachingQualityDeltaPct: 0,
        materialsCoveragePct: 0,
        storyParticipationPct: 0,
        disclaimer: "Aligned trends; association not causation.",
      },
      priorityQueue: [],
    };
  }

  const assessmentRows = (await listAssessmentRowsForPublicImpactPostgres(schoolIds)).filter(
    (row) => row.assessmentDate >= periodStart && row.assessmentDate <= periodEnd,
  );

  const resultRows = assessmentRows.map((row) => ({
    schoolId: Number(row.schoolId),
    assessmentType: row.assessmentType,
    assessmentDate: row.assessmentDate,
    comprehensionScore: row.readingComprehensionScore,
    band:
      row.readingStageOrder === null || row.readingStageOrder === undefined
        ? row.storyReadingScore === null || row.storyReadingScore === undefined
          ? 0
          : row.storyReadingScore <= 0
            ? 0
            : row.storyReadingScore <= 19
              ? 1
              : row.storyReadingScore <= 39
                ? 2
                : row.storyReadingScore <= 59
                  ? 3
                  : 4
        : Number(row.readingStageOrder),
  }));

  const baselineRows = resultRows.filter((row) => row.assessmentType === "baseline");
  const endlineRows = resultRows.filter((row) => row.assessmentType === "endline");
  const latestRows = endlineRows.length > 0 ? endlineRows : resultRows;
  const baselineDist = computeDistribution(
    baselineRows.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore })),
  );
  const latestDist = computeDistribution(
    latestRows.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore })),
  );

  const movement = {
    nonReaderReductionPct: Number((baselineDist.nonReadersPct - latestDist.nonReadersPct).toFixed(1)),
    movedTo20PlusPct: Number((latestDist.at20PlusPct - baselineDist.at20PlusPct).toFixed(1)),
    movedTo40PlusPct: Number((latestDist.at40PlusPct - baselineDist.at40PlusPct).toFixed(1)),
    movedTo60PlusPct: Number((latestDist.at60PlusPct - baselineDist.at60PlusPct).toFixed(1)),
    comprehensionProficientDeltaPct: Number(
      (latestDist.comprehensionProficientPct - baselineDist.comprehensionProficientPct).toFixed(1),
    ),
    sampleSize: Number(latestDist.n ?? 0),
  };

  const schoolBaseline = new Map<number, ReturnType<typeof computeDistribution>>();
  const schoolLatest = new Map<number, ReturnType<typeof computeDistribution>>();
  schools.forEach((school) => {
    const schoolId = Number(school.schoolId);
    const baseline = baselineRows.filter((row) => Number(row.schoolId) === schoolId);
    const latest = latestRows.filter((row) => Number(row.schoolId) === schoolId);
    if (baseline.length > 0) {
      schoolBaseline.set(
        schoolId,
        computeDistribution(baseline.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore }))),
      );
    }
    if (latest.length > 0) {
      schoolLatest.set(
        schoolId,
        computeDistribution(latest.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore }))),
      );
    }
  });

  const cohortTracking = schools
    .map((school) => {
      const schoolId = Number(school.schoolId);
      const baseline = schoolBaseline.get(schoolId);
      const latest = schoolLatest.get(schoolId);
      if (!baseline || !latest) {
        return null;
      }
      return {
        schoolId,
        schoolName: school.schoolName,
        baselineAt20PlusPct: baseline.at20PlusPct,
        latestAt20PlusPct: latest.at20PlusPct,
        deltaPct: Number((latest.at20PlusPct - baseline.at20PlusPct).toFixed(1)),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number((right?.deltaPct ?? 0) - (left?.deltaPct ?? 0)))
    .slice(0, 60) as NationalInsightWidgetData["cohortTracking"];

  const lessonEvaluations = (await listLessonEvaluationRowsForPublicImpactPostgres(schoolIds)).filter(
    (row) => row.lessonDate >= periodStart && row.lessonDate <= periodEnd,
  );
  const teachingAvgLatestPct =
    lessonEvaluations.length > 0
      ? Number(
          (
            lessonEvaluations.reduce((sum, row) => sum + (Number(row.overallScore ?? 0) / 4) * 100, 0) /
            lessonEvaluations.length
          ).toFixed(1),
        )
      : 0;

  const teachingBySchool = new Map<number, number[]>();
  lessonEvaluations.forEach((row) => {
    const schoolId = Number(row.schoolId);
    if (!teachingBySchool.has(schoolId)) {
      teachingBySchool.set(schoolId, []);
    }
    teachingBySchool.get(schoolId)?.push(Number(row.overallScore ?? 0));
  });

  let teachingDeltaAccum = 0;
  let teachingDeltaN = 0;
  teachingBySchool.forEach((values) => {
    if (values.length < 2) {
      return;
    }
    const baselinePct = (Number(values[0] ?? 0) / 4) * 100;
    const latestPct = (Number(values[values.length - 1] ?? 0) / 4) * 100;
    teachingDeltaAccum += latestPct - baselinePct;
    teachingDeltaN += 1;
  });

  const coachingVisitsResult = await queryPostgres<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM coaching_visits
      WHERE school_id = ANY($1::int[])
        AND visit_date >= $2::date
        AND visit_date <= $3::date
    `,
    [schoolIds, periodStart, periodEnd],
  );
  const coachingVisitsTotal = Number(coachingVisitsResult.rows[0]?.total ?? 0);

  const materialsCoverageResult = await queryPostgres<{ coveredSchools: string }>(
    `
      SELECT COUNT(DISTINCT school_id)::text AS "coveredSchools"
      FROM material_distributions
      WHERE school_id = ANY($1::int[])
        AND date >= $2::date
        AND date <= $3::date
    `,
    [schoolIds, periodStart, periodEnd],
  );
  const coveredSchools = Number(materialsCoverageResult.rows[0]?.coveredSchools ?? 0);

  const storyParticipationResult = await queryPostgres<{ schools: string }>(
    `
      SELECT COUNT(DISTINCT school_id)::text AS schools
      FROM story_activities
      WHERE school_id = ANY($1::int[])
        AND date >= $2::date
        AND date <= $3::date
    `,
    [schoolIds, periodStart, periodEnd],
  );
  const storySchools = Number(storyParticipationResult.rows[0]?.schools ?? 0);

  const qualitySummary =
    (await listDataQualitySummariesAsync({
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodKey: currentPeriodKey(),
      limit: 1,
    }))[0] ?? {
      completenessPct: 100,
      coverageIndicators: {
        schoolsTotal: schools.length,
        schoolsWithBaseline: 0,
        schoolsWithEndline: 0,
        schoolsMissingEndline: 0,
        districtsLowCoverage: 0,
      },
      exceptionCounts: {
        open: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };

  const assignmentRowsResult = await queryPostgres<{
    schoolId: number;
    periodKey: string;
    ownerUserId: number;
    ownerName: string | null;
    assignedAt: string;
    notes: string | null;
  }>(
    `
      SELECT
        a.school_id AS "schoolId",
        a.period_key AS "periodKey",
        a.owner_user_id AS "ownerUserId",
        pu.full_name AS "ownerName",
        a.assigned_at::text AS "assignedAt",
        a.notes
      FROM edu_priority_queue_assignments a
      LEFT JOIN portal_users pu ON pu.id = a.owner_user_id
      WHERE a.period_key = $1
    `,
    [currentPeriodKey()],
  );

  const assignmentBySchool = new Map<number, (typeof assignmentRowsResult.rows)[number]>();
  assignmentRowsResult.rows.forEach((row) => {
    assignmentBySchool.set(Number(row.schoolId), row);
  });

  const coachingFrequencyPerSchool = Number((coachingVisitsTotal / Math.max(1, schools.length)).toFixed(2));
  const alignedDrivers = {
    coachingFrequencyPerSchool,
    teachingQualityLatestPct: teachingAvgLatestPct,
    teachingQualityDeltaPct: teachingDeltaN > 0 ? Number((teachingDeltaAccum / teachingDeltaN).toFixed(1)) : 0,
    materialsCoveragePct: toPercent(coveredSchools, schools.length),
    storyParticipationPct: toPercent(storySchools, schools.length),
    disclaimer: "Aligned trends; association not causation.",
  };

  const schoolVisitCountsResult = await queryPostgres<{ schoolId: number; total: string }>(
    `
      SELECT school_id AS "schoolId", COUNT(*)::text AS total
      FROM coaching_visits
      WHERE school_id = ANY($1::int[])
        AND visit_date >= $2::date
        AND visit_date <= $3::date
      GROUP BY school_id
    `,
    [schoolIds, periodStart, periodEnd],
  );
  const schoolVisitsById = new Map<number, number>();
  schoolVisitCountsResult.rows.forEach((row) => {
    schoolVisitsById.set(Number(row.schoolId), Number(row.total ?? 0));
  });

  const priorityQueue = schools
    .map((school) => {
      const schoolId = Number(school.schoolId);
      const baseline = schoolBaseline.get(schoolId);
      const latest = schoolLatest.get(schoolId);
      if (!latest) {
        return null;
      }

      const nonReadersPct = latest.nonReadersPct;
      const at20PlusDeltaPct = baseline ? Number((latest.at20PlusPct - baseline.at20PlusPct).toFixed(1)) : 0;
      const schoolTeachingScores = teachingBySchool.get(schoolId) ?? [];
      const schoolTeachingLatestPct =
        schoolTeachingScores.length > 0
          ? Number(((Number(schoolTeachingScores[schoolTeachingScores.length - 1]) / 4) * 100).toFixed(1))
          : teachingAvgLatestPct;
      const coachingCoveragePct = Number((Math.min(1, schoolVisitsById.get(schoolId) ?? 0) * 100).toFixed(1));
      const completenessPenalty = qualitySummary.completenessPct < 70 ? 10 : 0;
      const riskScore =
        (nonReadersPct >= 35 ? 30 : 0) +
        (at20PlusDeltaPct <= 0 ? 25 : 0) +
        (schoolTeachingLatestPct < 60 ? 20 : 0) +
        (coachingCoveragePct < 40 ? 15 : 0) +
        completenessPenalty;
      const priorityLevel = coercePriorityLevel(riskScore);
      const recommendedIntervention = generatePriorityIntervention({
        nonReadersPct,
        at20PlusDeltaPct,
        teachingQualityPct: schoolTeachingLatestPct,
        coachingCoveragePct,
      });
      const assignment = assignmentBySchool.get(schoolId);
      return {
        schoolId,
        schoolName: school.schoolName,
        district: school.district,
        subRegion: school.subRegion,
        region: school.region,
        periodKey: currentPeriodKey(),
        riskScore,
        priorityLevel,
        recommendedIntervention,
        evidenceSummary: formatEvidenceSummary({
          nonReadersPct,
          at20PlusDeltaPct,
          teachingQualityPct: schoolTeachingLatestPct,
          coachingCoveragePct,
          completenessPct: qualitySummary.completenessPct,
        }),
        metrics: {
          nonReadersPct,
          at20PlusDeltaPct,
          teachingQualityPct: schoolTeachingLatestPct,
          coachingCoveragePct,
          completenessPct: qualitySummary.completenessPct,
        },
        assignedOwnerUserId: assignment ? Number(assignment.ownerUserId) : null,
        assignedOwnerName: assignment?.ownerName ?? null,
        assignedAt: assignment?.assignedAt ?? null,
        assignmentNotes: assignment?.notes ?? null,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number((right?.riskScore ?? 0) - (left?.riskScore ?? 0))) as NationalPriorityQueueItem[];

  return {
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart,
    periodEnd,
    movement,
    cohortTracking,
    alignedDrivers,
    priorityQueue,
  };
}

export async function listInterventionPlansAsync(filters?: {
  scopeType?: "school" | "district";
  scopeId?: string;
  status?: InterventionPlanRecord["status"];
  limit?: number;
}) {
  if (!isPostgresConfigured()) {
    return listInterventionPlans(filters);
  }
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters?.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`p.scope_type = $${params.length}`);
  }
  if (filters?.scopeId?.trim()) {
    params.push(filters.scopeId.trim());
    clauses.push(`p.scope_id = $${params.length}`);
  }
  if (filters?.status) {
    params.push(filters.status);
    clauses.push(`p.status = $${params.length}`);
  }
  const limit = Math.max(1, Math.min(filters?.limit ?? 300, 1000));
  const result = await queryPostgres<{
    planId: number;
    scopeType: "school" | "district";
    scopeId: string;
    schoolId: number | null;
    district: string | null;
    title: string;
    status: InterventionPlanRecord["status"];
    targetMetricsJson: string;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: string;
    completedActions: number;
    totalActions: number;
  }>(
    `
      SELECT
        p.plan_id AS "planId",
        p.scope_type AS "scopeType",
        p.scope_id AS "scopeId",
        p.school_id AS "schoolId",
        p.district,
        p.title,
        p.status,
        p.target_metrics_json AS "targetMetricsJson",
        p.start_date AS "startDate",
        p.end_date AS "endDate",
        p.notes,
        p.created_by AS "createdBy",
        pu.full_name AS "createdByName",
        p.created_at::text AS "createdAt",
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0)::int AS "completedActions",
        COUNT(a.action_id)::int AS "totalActions"
      FROM intervention_plan p
      LEFT JOIN intervention_actions a ON a.plan_id = p.plan_id
      LEFT JOIN portal_users pu ON pu.id = p.created_by
      WHERE ${clauses.join(" AND ")}
      GROUP BY p.plan_id, pu.full_name
      ORDER BY p.created_at DESC, p.plan_id DESC
      LIMIT ${limit}
    `,
    params,
  );
  return result.rows.map((row) => ({
    planId: Number(row.planId),
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    schoolId: row.schoolId === null || row.schoolId === undefined ? null : Number(row.schoolId),
    district: row.district,
    title: row.title,
    status: row.status,
    targetMetrics: parseJsonObject<Record<string, number | string>>(row.targetMetricsJson, {}),
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
    createdBy: Number(row.createdBy),
    createdByName: row.createdByName ?? "Unknown",
    createdAt: row.createdAt,
    completedActions: Number(row.completedActions ?? 0),
    totalActions: Number(row.totalActions ?? 0),
  })) as InterventionPlanRecord[];
}

export async function createInterventionPlanAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    scopeType: "school" | "district";
    scopeId: string;
    schoolId?: number | null;
    district?: string | null;
    title: string;
    status?: InterventionPlanRecord["status"];
    targetMetrics?: Record<string, number | string>;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string;
  };
}) {
  const plan = createInterventionPlan(args);
  if (!plan) {
    return null;
  }
  await syncInterventionPlanBundleToPostgres(plan.planId);
  return (await listInterventionPlansAsync({ limit: 1 })).find((item) => item.planId === plan.planId) ?? plan;
}

export async function createInterventionPlanFromPriorityAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  item: {
    schoolId: number;
    schoolName: string;
    district: string;
    metrics: NationalPriorityQueueItem["metrics"];
    recommendedIntervention: NationalPriorityQueueItem["recommendedIntervention"];
  };
}) {
  const plan = createInterventionPlanFromPriority(args);
  if (!plan) {
    return null;
  }
  await syncInterventionPlanBundleToPostgres(plan.planId);
  return (await listInterventionPlansAsync({ limit: 1 })).find((item) => item.planId === plan.planId) ?? plan;
}

export async function listInterventionActionsAsync(planId: number) {
  if (!isPostgresConfigured()) {
    return listInterventionActions(planId);
  }
  const result = await queryPostgres<{
    actionId: number;
    planId: number;
    actionType: InterventionActionRecord["actionType"];
    ownerUserId: number;
    ownerUserName: string | null;
    dueDate: string | null;
    status: InterventionActionRecord["status"];
    visitId: number | null;
    trainingId: number | null;
    assessmentId: number | null;
    storyActivityId: number | null;
    outcomeNotes: string | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `
      SELECT
        a.action_id AS "actionId",
        a.plan_id AS "planId",
        a.action_type AS "actionType",
        a.owner_user_id AS "ownerUserId",
        pu.full_name AS "ownerUserName",
        a.due_date AS "dueDate",
        a.status,
        a.visit_id AS "visitId",
        a.training_id AS "trainingId",
        a.assessment_id AS "assessmentId",
        a.story_activity_id AS "storyActivityId",
        a.outcome_notes AS "outcomeNotes",
        a.created_at::text AS "createdAt",
        a.updated_at::text AS "updatedAt"
      FROM intervention_actions a
      LEFT JOIN portal_users pu ON pu.id = a.owner_user_id
      WHERE a.plan_id = $1
      ORDER BY CASE a.status
        WHEN 'in_progress' THEN 0
        WHEN 'planned' THEN 1
        WHEN 'paused' THEN 2
        ELSE 3
      END,
      a.due_date ASC,
      a.action_id DESC
    `,
    [planId],
  );
  return result.rows.map((row) => mapInterventionActionRow(row));
}

export async function addInterventionActionAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    planId: number;
    actionType: InterventionActionRecord["actionType"];
    ownerUserId: number;
    dueDate?: string | null;
    status?: InterventionActionRecord["status"];
    visitId?: number | null;
    trainingId?: number | null;
    assessmentId?: number | null;
    storyActivityId?: number | null;
    outcomeNotes?: string;
  };
}) {
  const actionId = addInterventionAction(args);
  await syncInterventionPlanBundleToPostgres(args.input.planId);
  return actionId;
}

export async function updateInterventionActionAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  actionId: number;
  input: {
    ownerUserId?: number;
    dueDate?: string | null;
    status?: InterventionActionRecord["status"];
    visitId?: number | null;
    trainingId?: number | null;
    assessmentId?: number | null;
    storyActivityId?: number | null;
    outcomeNotes?: string | null;
  };
}) {
  updateInterventionAction(args);
  if (!isPostgresConfigured()) {
    return;
  }
  const row = getDb()
    .prepare("SELECT plan_id AS planId FROM intervention_actions WHERE action_id = @actionId LIMIT 1")
    .get({ actionId: args.actionId }) as { planId: number } | undefined;
  if (row?.planId) {
    await syncInterventionPlanBundleToPostgres(Number(row.planId));
  }
}

export async function computeInterventionCoverageAsync(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  if (!isPostgresConfigured()) {
    const schools = await listSchoolsForScopeAsync(args.scopeType, args.scopeId);
    const plans = listInterventionPlans({
      scopeType: args.scopeType === "country" ? undefined : (args.scopeType as "school" | "district"),
      scopeId: args.scopeType === "country" ? undefined : args.scopeId,
      limit: 1000,
    });
    const actions = plans.flatMap((plan) => listInterventionActions(plan.planId));
    return {
      schoolsTotal: schools.length,
      plansTotal: plans.length,
      actionsTotal: actions.length,
      actionsCompleted: actions.filter((action) => action.status === "completed").length,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
    };
  }

  const schools = await listSchoolsForScopeAsync(args.scopeType, args.scopeId);
  const params: unknown[] = [];
  let plansWhere = "1=1";
  if (args.scopeType !== "country") {
    params.push(args.scopeType);
    const scopeTypeIndex = params.length;
    params.push(args.scopeId);
    const scopeIdIndex = params.length;
    plansWhere = `(p.scope_type = $${scopeTypeIndex} AND p.scope_id = $${scopeIdIndex})`;
  }
  const plansCountResult = await queryPostgres<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM intervention_plan p WHERE ${plansWhere}`,
    params,
  );
  const actionsCountResult = await queryPostgres<{ total: string; completed: string }>(
    `
      SELECT
        COUNT(*)::text AS total,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)::text AS completed
      FROM intervention_actions
    `,
  );
  return {
    schoolsTotal: schools.length,
    plansTotal: Number(plansCountResult.rows[0]?.total ?? 0),
    actionsTotal: Number(actionsCountResult.rows[0]?.total ?? 0),
    actionsCompleted: Number(actionsCountResult.rows[0]?.completed ?? 0),
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  };
}

export async function buildNationalReportFactsAsync(args: {
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const insights = await getNationalInsightsAsync({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  });
  const qualitySummary =
    (await listDataQualitySummariesAsync({
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodKey: currentPeriodKey(),
      limit: 1,
    }))[0] ?? null;
  const interventions = await computeInterventionCoverageAsync({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  });
  const topPriorities = insights.priorityQueue.slice(0, 20).map((item) => ({
    schoolId: item.schoolId,
    schoolName: item.schoolName,
    district: item.district,
    riskScore: item.riskScore,
    priorityLevel: item.priorityLevel,
    recommendedIntervention: item.recommendedIntervention,
    evidenceSummary: item.evidenceSummary,
  }));
  const schools = await listSchoolsForScopeAsync(args.scopeType, args.scopeId);
  return {
    factsVersion: "NLIS-REPORT-FACTS-v1",
    preset: args.preset,
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    n: {
      schoolsInScope: schools.length,
      movementSampleSize: insights.movement.sampleSize,
    },
    movement: insights.movement,
    alignedDrivers: insights.alignedDrivers,
    priorityQueue: topPriorities,
    quality: qualitySummary,
    interventions,
    methodology: {
      benchmarkPolicy:
        "Reading levels are benchmarked using active benchmark_profiles/benchmark_rules version in force for period date.",
      dataSourcePolicy:
        "All indicators are derived from staff-entered assessments, evaluations, training/coaching logs, and published story artifacts.",
      privacyPolicy:
        "Public-safe output excludes learner identifiers and sensitive personal data.",
      disclaimer: "Aligned trends; association not causation.",
    },
  };
}

export async function getPartnerImpactDatasetAsync(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  if (!isPostgresConfigured()) {
    return import("@/lib/national-intelligence").then((mod) => mod.getPartnerImpactDataset(args));
  }
  const insights = await getNationalInsightsAsync(args);
  return {
    scopeType: insights.scopeType,
    scopeId: insights.scopeId,
    periodStart: insights.periodStart,
    periodEnd: insights.periodEnd,
    movement: insights.movement,
    alignedDrivers: insights.alignedDrivers,
    priorityQueue: insights.priorityQueue.map((item) => ({
      schoolId: item.schoolId,
      schoolName: item.schoolName,
      district: item.district,
      subRegion: item.subRegion,
      region: item.region,
      periodKey: item.periodKey,
      riskScore: item.riskScore,
      priorityLevel: item.priorityLevel,
      recommendedIntervention: item.recommendedIntervention,
      evidenceSummary: item.evidenceSummary,
    })),
    privacy: {
      publicSafe: true,
      learnerIdentifiersIncluded: false,
    },
  };
}

export async function runNationalNightlyJobsAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
}) {
  if (!isPostgresConfigured()) {
    return import("@/lib/national-intelligence").then((mod) => mod.runNationalNightlyJobs(args));
  }
  const sweep = await runEducationDataQualitySweepAsync({
    user: args.user,
    scopeType: "country",
    scopeId: "Uganda",
  });
  const insights = await getNationalInsightsAsync({
    scopeType: "country",
    scopeId: "Uganda",
    periodStart: `${new Date().getUTCFullYear()}-01-01`,
    periodEnd: new Date().toISOString().slice(0, 10),
  });
  await logAuditEventAsync({
    userId: args.user.id,
    userName: args.user.fullName,
    action: "run_nlis_nightly_jobs",
    targetTable: "edu_data_quality_summary",
    targetId: null,
    detail: `Nightly NLIS jobs executed for Uganda. Open exceptions: ${sweep.exceptionCounts.open}. Priority queue size: ${insights.priorityQueue.length}.`,
  });
  return {
    sweep,
    priorityQueueCount: insights.priorityQueue.length,
    generatedAt: new Date().toISOString(),
  };
}

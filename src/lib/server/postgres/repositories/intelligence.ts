import { queryPostgres } from "@/lib/server/postgres/client";
import {
  type BenchmarkGrade,
  type BenchmarkProfileRecord,
  type BenchmarkRuleRecord,
  type EducationAuditExceptionRecord,
  type InterventionActionRecord,
  type InterventionPlanRecord,
  type NationalReportPackRecord,
  type NationalReportPreset,
  type NlisGeoScopeType,
  type PartnerApiClientRecord,
} from "@/lib/types";

function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Repositories

export async function listBenchmarkProfilesPostgres(): Promise<BenchmarkProfileRecord[]> {
  const result = await queryPostgres(
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
      ORDER BY bp.is_active DESC, bp.effective_from_date DESC
    `
  );
  return result.rows.map((row) => ({
    benchmarkId: Number(row.benchmarkId),
    name: String(row.name),
    effectiveFromDate: String(row.effectiveFromDate),
    effectiveToDate: row.effectiveToDate ? String(row.effectiveToDate) : null,
    notes: row.notes ? String(row.notes) : null,
    isActive: Boolean(row.isActive),
    createdBy: Number(row.createdBy),
    createdAt: String(row.createdAt),
    rulesCount: Number(row.rulesCount),
  }));
}

export async function authenticatePartnerApiKeyPostgres(apiKeyHash: string): Promise<PartnerApiClientRecord | null> {
  const result = await queryPostgres(
    `
      SELECT
        client_id AS "clientId",
        partner_name AS "partnerName",
        allowed_scope_type AS "allowedScopeType",
        allowed_scope_ids_json AS "allowedScopeIdsJson",
        active,
        created_by AS "createdBy",
        created_at::text AS "createdAt",
        last_used_at::text AS "lastUsedAt"
      FROM partner_api_clients
      WHERE api_key_hash = $1 AND active = TRUE
      LIMIT 1
    `,
    [apiKeyHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    clientId: Number(row.clientId),
    partnerName: String(row.partnerName),
    allowedScopeType: row.allowedScopeType as NlisGeoScopeType,
    allowedScopeIds: parseJsonObject<string[]>(row.allowedScopeIdsJson, []),
    active: Boolean(row.active),
    createdBy: Number(row.createdBy),
    createdAt: String(row.createdAt),
    lastUsedAt: row.lastUsedAt ? String(row.lastUsedAt) : null,
  };
}

export async function logPartnerExportPostgres(args: {
  clientId: number;
  partnerName: string;
  endpoint: string;
  scopeType: string;
  scopeId: string;
  format: string;
}): Promise<void> {
  await queryPostgres(
    `
      INSERT INTO partner_export_audit_logs (
        client_id, partner_name, endpoint, scope_type, scope_id, format, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [args.clientId, args.partnerName, args.endpoint, args.scopeType, args.scopeId, args.format]
  );
}

export async function listInterventionPlansPostgres(filters: {
  scopeType?: string;
  scopeId?: string;
  status?: string;
  limit?: number;
}): Promise<InterventionPlanRecord[]> {
  const clauses = ["1=1"];
  const params: unknown[] = [];
  if (filters.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`p.scope_type = $${params.length}`);
  }
  if (filters.scopeId) {
    params.push(filters.scopeId);
    clauses.push(`p.scope_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`p.status = $${params.length}`);
  }

  const limit = Math.min(filters.limit ?? 100, 1000);
  const result = await queryPostgres(
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
        COUNT(a.action_id)::int AS "totalActions",
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END)::int AS "completedActions"
      FROM intervention_plan p
      LEFT JOIN portal_users pu ON pu.id = p.created_by
      LEFT JOIN intervention_actions a ON a.plan_id = p.plan_id
      WHERE ${clauses.join(" AND ")}
      GROUP BY p.plan_id, pu.full_name
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `,
    params
  );

  return result.rows.map((row) => ({
    planId: Number(row.planId),
    scopeType: row.scopeType as "school" | "district",
    scopeId: String(row.scopeId),
    schoolId: row.schoolId ? Number(row.schoolId) : null,
    district: row.district ? String(row.district) : null,
    title: String(row.title),
    status: row.status as InterventionPlanRecord["status"],
    targetMetrics: parseJsonObject<Record<string, number | string>>(row.targetMetricsJson, {}),
    startDate: row.startDate ? String(row.startDate) : null,
    endDate: row.endDate ? String(row.endDate) : null,
    notes: row.notes ? String(row.notes) : null,
    createdBy: Number(row.createdBy),
    createdByName: String(row.createdByName ?? "Unknown"),
    createdAt: String(row.createdAt),
    totalActions: Number(row.totalActions),
    completedActions: Number(row.completedActions),
  }));
}

export async function addInterventionActionPostgres(input: {
  planId: number;
  actionType: string;
  ownerUserId: number;
  dueDate: string | null;
  status: string;
  visitId?: number | null;
  trainingId?: number | null;
  assessmentId?: number | null;
  storyActivityId?: number | null;
  outcomeNotes?: string | null;
}): Promise<number> {
  const result = await queryPostgres<{ actionId: number }>(
    `
      INSERT INTO intervention_actions (
        plan_id, action_type, owner_user_id, due_date, status,
        visit_id, training_id, assessment_id, story_activity_id, outcome_notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING action_id AS "actionId"
    `,
    [
      input.planId, input.actionType, input.ownerUserId, input.dueDate, input.status,
      input.visitId ?? null, input.trainingId ?? null, input.assessmentId ?? null,
      input.storyActivityId ?? null, input.outcomeNotes ?? null
    ]
  );
  return Number(result.rows[0].actionId);
}

export async function updateInterventionActionPostgres(actionId: number, patch: Record<string, unknown>): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  Object.keys(patch).forEach((key) => {
    const dbKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    params.push(patch[key]);
    fields.push(`${dbKey} = $${params.length}`);
  });
  if (fields.length === 0) return;
  params.push(actionId);
  await queryPostgres(
    `UPDATE intervention_actions SET ${fields.join(", ")}, updated_at = NOW() WHERE action_id = $${params.length}`,
    params
  );
}

export async function listInterventionActionsPostgres(plan_id: number): Promise<InterventionActionRecord[]> {
  const result = await queryPostgres(
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
      ORDER BY a.due_date ASC, a.action_id DESC
    `,
    [plan_id]
  );
  return result.rows.map((row) => ({
    actionId: Number(row.actionId),
    planId: Number(row.planId),
    actionType: row.actionType as InterventionActionRecord["actionType"],
    ownerUserId: Number(row.ownerUserId),
    ownerUserName: String(row.ownerUserName ?? "Unknown"),
    dueDate: row.dueDate ? String(row.dueDate) : null,
    status: row.status as InterventionActionRecord["status"],
    visitId: row.visitId ? Number(row.visitId) : null,
    trainingId: row.trainingId ? Number(row.trainingId) : null,
    assessmentId: row.assessmentId ? Number(row.assessmentId) : null,
    storyActivityId: row.storyActivityId ? Number(row.storyActivityId) : null,
    outcomeNotes: row.outcomeNotes ? String(row.outcomeNotes) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }));
}

export async function listBenchmarkRulesPostgres(benchmarkId: number): Promise<BenchmarkRuleRecord[]> {
  const result = await queryPostgres(
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
      ORDER BY grade ASC, language ASC
    `,
    [benchmarkId]
  );
  return result.rows.map((row) => ({
    ruleId: Number(row.ruleId),
    benchmarkId: Number(row.benchmarkId),
    grade: row.grade as BenchmarkGrade,
    language: String(row.language),
    cwpmBands: parseJsonObject<BenchmarkRuleRecord["cwpmBands"]>(row.cwpmBandsJson, {
      non_reader: 0,
      emergent: [1, 19],
      minimum: [20, 39],
      competent: [40, 59],
      strong: [60, 999],
    }),
    comprehensionProficientRule: parseJsonObject<BenchmarkRuleRecord["comprehensionProficientRule"]>(
      row.comprehensionRuleJson,
      { type: "percent", threshold: 70 }
    ),
    optionalAccuracyFloor: row.optionalAccuracyFloor ? Number(row.optionalAccuracyFloor) : null,
    domainProficiencyThresholds: parseJsonObject<Record<string, number>>(row.domainThresholdsJson, {}),
    createdAt: String(row.createdAt),
  }));
}

export async function listEducationAuditExceptionsPostgres(filters: {
  scopeType?: string;
  scopeId?: string;
  status?: string;
  limit?: number;
}): Promise<EducationAuditExceptionRecord[]> {
  const clauses = ["1=1"];
  const params: unknown[] = [];
  if (filters.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`scope_type = $${params.length}`);
  }
  if (filters.scopeId) {
    params.push(filters.scopeId);
    clauses.push(`scope_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  const limit = Math.min(filters.limit ?? 100, 1000);
  const result = await queryPostgres(
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
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    params
  );

  return result.rows.map((row) => ({
    exceptionId: Number(row.exceptionId),
    entityType: row.entityType as EducationAuditExceptionRecord["entityType"],
    entityId: String(row.entityId),
    ruleCode: String(row.ruleCode),
    severity: row.severity as EducationAuditExceptionRecord["severity"],
    message: String(row.message),
    status: row.status as EducationAuditExceptionRecord["status"],
    scopeType: row.scopeType as NlisGeoScopeType,
    scopeId: String(row.scopeId),
    periodKey: String(row.periodKey),
    createdAt: String(row.createdAt),
    resolvedAt: row.resolvedAt ? String(row.resolvedAt) : null,
    resolvedBy: row.resolvedBy ? Number(row.resolvedBy) : null,
    resolutionNotes: row.resolutionNotes ? String(row.resolutionNotes) : null,
  }));
}

export async function listNationalReportPacksPostgres(filters: {
  scopeType?: string;
  scopeId?: string;
  limit?: number;
}): Promise<NationalReportPackRecord[]> {
  const clauses = ["1=1"];
  const params: unknown[] = [];
  if (filters.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`scope_type = $${params.length}`);
  }
  if (filters.scopeId) {
    params.push(filters.scopeId);
    clauses.push(`scope_id = $${params.length}`);
  }

  const limit = Math.min(filters.limit ?? 100, 1000);
  const result = await queryPostgres(
    `
      SELECT
        r.report_id AS "reportId",
        r.report_code AS "reportCode",
        r.preset,
        r.scope_type AS "scopeType",
        r.scope_id AS "scopeId",
        r.period_start AS "periodStart",
        r.period_end AS "periodEnd",
        r.facts_json AS "factsJson",
        r.narrative_json AS "narrativeJson",
        r.html_report AS "htmlReport",
        r.pdf_stored_path AS "pdfPath",
        r.generated_by_user_id AS "generatedByUserId",
        pu.full_name AS "generatedByName",
        r.generated_at::text AS "generatedAt",
        r.updated_at::text AS "updatedAt"
      FROM national_report_packs r
      LEFT JOIN portal_users pu ON pu.id = r.generated_by_user_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY r.generated_at DESC
      LIMIT ${limit}
    `,
    params
  );

  return result.rows.map((row) => ({
    reportId: Number(row.reportId),
    reportCode: String(row.reportCode),
    preset: row.preset as NationalReportPreset,
    scopeType: row.scopeType as NlisGeoScopeType,
    scopeId: String(row.scopeId),
    periodStart: String(row.periodStart),
    periodEnd: String(row.periodEnd),
    facts: parseJsonObject<Record<string, unknown>>(row.factsJson, {}),
    narrative: parseJsonObject<NationalReportPackRecord["narrative"]>(row.narrativeJson, {
      summary: "",
      movement: "",
      priorityActions: "",
      interventions: "",
      methodology: "",
      references: [],
      generatedWithAi: false,
    }),
    htmlReport: String(row.htmlReport),
    pdfPath: row.pdfPath ? String(row.pdfPath) : null,
    generatedByUserId: Number(row.generatedByUserId),
    generatedByName: String(row.generatedByName ?? "Unknown"),
    generatedAt: String(row.generatedAt),
    updatedAt: String(row.updatedAt),
  }));
}

export async function listSchoolsForScope(scopeType: NlisGeoScopeType, scopeId: string) {
  const params: unknown[] = [];
  const normalizedScopeId = String(scopeId ?? "").trim();
  let where = "1=1";
  
  if (scopeType !== "country") {
    if (scopeType === "region") {
      params.push(normalizedScopeId);
      where = `lower(trim(COALESCE(sd.region, ''))) = lower(trim($${params.length}))`;
    } else if (scopeType === "sub_region") {
      params.push(normalizedScopeId);
      where = `lower(trim(COALESCE(sd.sub_region, ''))) = lower(trim($${params.length}))`;
    } else if (scopeType === "district") {
      params.push(normalizedScopeId);
      where = `lower(trim(COALESCE(sd.district, ''))) = lower(trim($${params.length}))`;
    } else if (scopeType === "sub_county") {
      params.push(normalizedScopeId);
      where = `lower(trim(COALESCE(sd.sub_county, ''))) = lower(trim($${params.length}))`;
    } else if (scopeType === "parish") {
      params.push(normalizedScopeId);
      where = `lower(trim(COALESCE(sd.parish, ''))) = lower(trim($${params.length}))`;
    } else {
      const schoolId = Number(normalizedScopeId);
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        throw new Error("School scope requires numeric scopeId.");
      }
      params.push(schoolId);
      where = `sd.id = $${params.length}`;
    }
  }

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
    params
  );
  return result.rows.map((row) => ({
    ...row,
    schoolId: Number(row.schoolId),
  }));
}

export async function getInterventionPlanByIdPostgres(planId: number): Promise<InterventionPlanRecord | null> {
  const result = await queryPostgres(
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
        p.created_at::text AS "createdAt"
      FROM intervention_plan p
      LEFT JOIN portal_users pu ON pu.id = p.created_by
      WHERE p.plan_id = $1
    `,
    [planId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    planId: Number(row.planId),
    scopeType: row.scopeType as "school" | "district",
    scopeId: String(row.scopeId),
    schoolId: row.schoolId ? Number(row.schoolId) : null,
    district: row.district ? String(row.district) : null,
    title: String(row.title),
    status: row.status as InterventionPlanRecord["status"],
    targetMetrics: parseJsonObject<Record<string, number | string>>(row.targetMetricsJson, {}),
    startDate: row.startDate ? String(row.startDate) : null,
    endDate: row.endDate ? String(row.endDate) : null,
    notes: row.notes ? String(row.notes) : null,
    createdBy: Number(row.createdBy),
    createdByName: String(row.createdByName ?? "Unknown"),
    createdAt: String(row.createdAt),
    totalActions: 0, 
    completedActions: 0,
  };
}

export async function createNationalReportPackPostgres(input: {
  reportCode: string;
  preset: string;
  scopeType: string;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  facts: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  narrative: any;
  htmlReport: string;
  generatedByUserId: number;
}): Promise<number> {
  const result = await queryPostgres<{ reportId: number }>(
    `
      INSERT INTO national_report_packs (
        report_code, preset, scope_type, scope_id, period_start, period_end,
        facts_json, narrative_json, html_report, generated_by_user_id, generated_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING report_id AS "reportId"
    `,
    [
      input.reportCode, input.preset, input.scopeType, input.scopeId, input.periodStart, input.periodEnd,
      JSON.stringify(input.facts), JSON.stringify(input.narrative), input.htmlReport, input.generatedByUserId
    ]
  );
  return Number(result.rows[0].reportId);
}

export async function listPartnerApiClientsPostgres(): Promise<PartnerApiClientRecord[]> {
  const result = await queryPostgres(
    `
      SELECT
        client_id AS "clientId",
        partner_name AS "partnerName",
        allowed_scope_type AS "allowedScopeType",
        allowed_scope_ids_json AS "allowedScopeIdsJson",
        active,
        created_by AS "createdBy",
        created_at::text AS "createdAt",
        last_used_at::text AS "lastUsedAt"
      FROM partner_api_clients
      ORDER BY partner_name ASC
    `
  );
  return result.rows.map((row) => ({
    clientId: Number(row.clientId),
    partnerName: String(row.partnerName),
    allowedScopeType: row.allowedScopeType as NlisGeoScopeType,
    allowedScopeIds: parseJsonObject<string[]>(row.allowedScopeIdsJson, []),
    active: Boolean(row.active),
    createdBy: Number(row.createdBy),
    createdAt: String(row.createdAt),
    lastUsedAt: row.lastUsedAt ? String(row.lastUsedAt) : null,
  }));
}

export async function createPartnerApiClientPostgres(input: {
  partnerName: string;
  apiKeyHash: string;
  allowedScopeType: string;
  allowedScopeIds: string[];
  createdBy: number;
}): Promise<number> {
  const result = await queryPostgres<{ clientId: number }>(
    `
      INSERT INTO partner_api_clients (
        partner_name, api_key_hash, allowed_scope_type, allowed_scope_ids_json, active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, TRUE, $5, NOW())
      RETURNING client_id AS "clientId"
    `,
    [
      input.partnerName, input.apiKeyHash, input.allowedScopeType, JSON.stringify(input.allowedScopeIds), input.createdBy
    ]
  );
  return Number(result.rows[0].clientId);
}

export async function setPartnerApiClientActivePostgres(clientId: number, active: boolean): Promise<void> {
  await queryPostgres(
    `UPDATE partner_api_clients SET active = $1 WHERE client_id = $2`,
    [active, clientId]
  );
}

export async function createInterventionPlanPostgres(input: {
  scopeType: string;
  scopeId: string;
  schoolId: number | null;
  district: string | null;
  title: string;
  createdBy: number;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targetMetrics: any;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}): Promise<number> {
  const result = await queryPostgres<{ planId: number }>(
    `
      INSERT INTO intervention_plan (
        scope_type, scope_id, school_id, district, title, created_by,
        status, target_metrics_json, start_date, end_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING plan_id AS "planId"
    `,
    [
      input.scopeType, input.scopeId, input.schoolId, input.district, input.title, input.createdBy,
      input.status, JSON.stringify(input.targetMetrics), input.startDate, input.endDate, input.notes
    ]
  );
  return Number(result.rows[0].planId);
}

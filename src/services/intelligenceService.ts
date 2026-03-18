import { 
  type BenchmarkProfileRecord,
  type BenchmarkRuleRecord,
  type DataQualityCenterSummaryRecord,
  type EducationAuditExceptionRecord,
  type InterventionPlanRecord,
  type InterventionActionRecord,
  type NationalInsightWidgetData,
  type NationalPriorityQueueItem,
  type NationalReportPackRecord,
  type NationalReportPreset,
  type NlisGeoScopeType,
  type PartnerApiClientRecord,
  type PortalUser
} from "@/lib/types";
import * as repo from "@/lib/server/postgres/repositories/intelligence";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import { 
  listAssessmentRowsForPublicImpactPostgres,
  listLessonEvaluationRowsForPublicImpactPostgres
} from "@/lib/server/postgres/repositories/public-impact";
import crypto from "node:crypto";
import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import {
  drawBrandFooter,
  drawBrandFrame,
  drawBrandHeader,
  drawBrandWatermark,
  loadBrandLogo,
} from "@/lib/pdf-branding";
import { embedPdfSansFonts, embedPdfSerifFonts } from "@/lib/pdf-fonts";
import { getRuntimeDataDir } from "@/lib/runtime-paths";

// Helpers moved from national-intelligence-async.ts
function normalizeDate(value: string | undefined | null, fallback: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function currentPeriodKey() {
  return new Date().toISOString().slice(0, 7);
}

function toPercent(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function stripText(value: unknown) {
  return String(value ?? "").trim();
}

function computeDistribution(rows: Array<{ band: number; comprehensionScore: number | null }>) {
  const n = rows.length;
  let level0 = 0, at20 = 0, at40 = 0, at60 = 0, comprehensionProficient = 0;

  rows.forEach((row) => {
    if (row.band <= 0) level0 += 1;
    if (row.band >= 2) at20 += 1;
    if (row.band >= 3) at40 += 1;
    if (row.band >= 4) at60 += 1;

    const comp = Number(row.comprehensionScore ?? 0);
    if (comp >= 70 || comp >= 4) comprehensionProficient += 1;
  });

  return {
    n,
    nonReadersPct: toPercent(level0, n),
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
  return [
    `non-readers ${args.nonReadersPct}%`,
    `20+ delta ${args.at20PlusDeltaPct >= 0 ? "+" : ""}${args.at20PlusDeltaPct}%`,
    `teaching quality ${args.teachingQualityPct}%`,
    `coaching coverage ${args.coachingCoveragePct}%`,
    `completeness ${args.completenessPct}%`,
  ].join(", ");
}

function coercePriorityLevel(riskScore: number): "high" | "medium" | "low" {
  if (riskScore >= 60) return "high";
  if (riskScore >= 30) return "medium";
  return "low";
}

function generatePriorityIntervention(args: {
  nonReadersPct: number;
  at20PlusDeltaPct: number;
  teachingQualityPct: number;
  coachingCoveragePct: number;
}): NationalPriorityQueueItem["recommendedIntervention"] {
  if (args.nonReadersPct >= 35 || args.at20PlusDeltaPct <= 0) return "Remedial & Catch-up";
  if (args.teachingQualityPct < 60) return "Coaching";
  if (args.coachingCoveragePct < 40) return "Training";
  return "Leadership support";
}

function buildScopeWhereClause(params: unknown[], scopeType: NlisGeoScopeType, scopeId: string, alias = "sd") {
  const normalizedScopeId = stripText(scopeId);
  if (scopeType === "country") return "1=1";
  params.push(normalizedScopeId);
  const pIdx = params.length;
  if (["region", "sub_region", "district", "sub_county", "parish"].includes(scopeType)) {
    return `lower(trim(COALESCE(${alias}.${scopeType}, ''))) = lower(trim($${pIdx}))`;
  }
  const schoolId = Number(normalizedScopeId);
  if (!Number.isInteger(schoolId) || schoolId <= 0) throw new Error("School scope requires numeric scopeId.");
  params[params.length - 1] = schoolId;
  return `${alias}.id = $${pIdx}`;
}

// Re-export types for convenience
export type { 
  BenchmarkProfileRecord,
  BenchmarkRuleRecord,
  EducationAuditExceptionRecord,
  InterventionPlanRecord,
  InterventionActionRecord,
  NationalInsightWidgetData,
  NationalPriorityQueueItem,
  NationalReportPackRecord,
  NationalReportPreset,
  NlisGeoScopeType,
  PartnerApiClientRecord
};

/**
 * Service for National Literacy Intelligence System (NLIS)
 */
export const IntelligenceService = {
  // Benchmark Profiles
  async listBenchmarkProfiles(): Promise<BenchmarkProfileRecord[]> {
    return repo.listBenchmarkProfilesPostgres();
  },

  async listBenchmarkRules(benchmarkId: number): Promise<BenchmarkRuleRecord[]> {
    return repo.listBenchmarkRulesPostgres(benchmarkId);
  },

  async upsertBenchmarkProfile(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    input: {
      benchmarkId?: number;
      name: string;
      effectiveFromDate: string;
      effectiveToDate?: string | null;
      notes?: string | null;
      isActive: boolean;
    };
  }): Promise<number> {
    const isNew = !args.input.benchmarkId;
    const result = await queryPostgres<{ benchmarkId: number }>(
      isNew
        ? `INSERT INTO benchmark_profiles (name, effective_from_date, effective_to_date, notes, is_active, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING benchmark_id AS "benchmarkId"`
        : `UPDATE benchmark_profiles SET name = $1, effective_from_date = $2, effective_to_date = $3, notes = $4, is_active = $5 WHERE benchmark_id = $6 RETURNING benchmark_id AS "benchmarkId"`,
      isNew
        ? [args.input.name, args.input.effectiveFromDate, args.input.effectiveToDate ?? null, args.input.notes ?? null, args.input.isActive, args.user.id]
        : [args.input.name, args.input.effectiveFromDate, args.input.effectiveToDate ?? null, args.input.notes ?? null, args.input.isActive, args.input.benchmarkId]
    );
    const benchmarkId = Number(result.rows[0].benchmarkId);
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: isNew ? "create" : "update",
      targetTable: "benchmark_profiles",
      targetId: benchmarkId,
      detail: `${isNew ? "Created" : "Updated"} benchmark profile ${args.input.name}.`,
    });
    return benchmarkId;
  },

  async upsertBenchmarkRule(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    input: {
      benchmarkId: number;
      grade: string;
      language: string;
      cwpmBands: BenchmarkRuleRecord["cwpmBands"];
      comprehensionProficientRule: BenchmarkRuleRecord["comprehensionProficientRule"];
      optionalAccuracyFloor?: number | null;
      domainProficiencyThresholds?: Record<string, number>;
    };
  }): Promise<void> {
    await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      try {
        await client.query(
          `INSERT INTO benchmark_rules (benchmark_id, grade, language, cwpm_bands_json, comprehension_proficient_rule_json, optional_accuracy_floor, domain_proficiency_thresholds_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT (benchmark_id, grade, language) DO UPDATE SET cwpm_bands_json = EXCLUDED.cwpm_bands_json, comprehension_proficient_rule_json = EXCLUDED.comprehension_proficient_rule_json, optional_accuracy_floor = EXCLUDED.optional_accuracy_floor, domain_proficiency_thresholds_json = EXCLUDED.domain_proficiency_thresholds_json`,
          [
            args.input.benchmarkId,
            args.input.grade,
            args.input.language || "English",
            JSON.stringify(args.input.cwpmBands),
            JSON.stringify(args.input.comprehensionProficientRule),
            args.input.optionalAccuracyFloor ?? null,
            JSON.stringify(args.input.domainProficiencyThresholds ?? {}),
          ]
        );
        await client.query(
          `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, detail, timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [args.user.id, args.user.fullName, "update", "benchmark_rules", null, `Upserted benchmark rule for benchmark ${args.input.benchmarkId}, grade ${args.input.grade}, language ${args.input.language}.`]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });
  },

  // Partner APIs
  async authenticatePartnerApiKey(apiKeyHash: string): Promise<PartnerApiClientRecord | null> {
    return repo.authenticatePartnerApiKeyPostgres(apiKeyHash);
  },

  assertPartnerScopeAllowed(args: {
    client: {
      allowedScopeType: NlisGeoScopeType;
      allowedScopeIds: string[];
    };
    scopeType: NlisGeoScopeType;
    scopeId: string;
  }) {
    const requestedScopeId = stripText(args.scopeId);
    if (args.client.allowedScopeType !== args.scopeType) {
      throw new Error("Partner client is not allowed for this scope type.");
    }

    if (!args.client.allowedScopeIds.map((id) => id.toLowerCase()).includes(requestedScopeId.toLowerCase())) {
      throw new Error("Partner client is not allowed for this scope id.");
    }
  },

  async logPartnerExport(args: {
    clientId: number;
    partnerName: string;
    endpoint: string;
    scopeType: string;
    scopeId: string;
    format: string;
  }): Promise<void> {
    return repo.logPartnerExportPostgres(args);
  },

  async listInterventionActions(planId: number): Promise<InterventionActionRecord[]> {
    return repo.listInterventionActionsPostgres(planId);
  },

  async addInterventionAction(args: {
    user: Pick<PortalUser, "id" | "fullName">,
    input: {
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
    }
  }): Promise<number> {
    const actionId = await repo.addInterventionActionPostgres(args.input);
    // Audit log (could be moved to repo if preferred, but service is fine)
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "create",
      targetTable: "intervention_actions",
      targetId: actionId,
      detail: `Added intervention action ${args.input.actionType} to plan ${args.input.planId}.`,
    });
    return actionId;
  },

  // Audit Logs
  async logAuditEvent(args: {
    userId: number;
    userName: string;
    action: string;
    targetTable: string | null;
    targetId: string | number | null;
    detail: string;
  }): Promise<void> {
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
      ]
    );
  },

  // Intelligence Reports
  async listNationalReportPacks(filters: {
    scopeType?: string;
    scopeId?: string;
    limit?: number;
  }): Promise<NationalReportPackRecord[]> {
    return repo.listNationalReportPacksPostgres(filters);
  },

  async createNationalReportPack(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    input: {
      reportCode: string;
      preset: NationalReportPreset;
      scopeType: NlisGeoScopeType;
      scopeId: string;
      periodStart: string;
      periodEnd: string;
      facts: Record<string, unknown>;
      narrative: NationalReportPackRecord["narrative"];
      htmlReport: string;
      pdfPath?: string | null;
    };
  }): Promise<number> {
    const result = await queryPostgres<{ reportId: number }>(
      `INSERT INTO national_report_packs (report_code, preset, scope_type, scope_id, period_start, period_end, facts_json, narrative_json, html_report, pdf_stored_path, generated_by_user_id, generated_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING report_id AS "reportId"`,
      [
        args.input.reportCode,
        args.input.preset,
        args.input.scopeType,
        args.input.scopeId,
        args.input.periodStart,
        args.input.periodEnd,
        JSON.stringify(args.input.facts),
        JSON.stringify(args.input.narrative),
        args.input.htmlReport,
        args.input.pdfPath || null,
        args.user.id,
      ]
    );
    const reportId = Number(result.rows[0]?.reportId);
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "create",
      targetTable: "national_report_packs",
      targetId: reportId,
      detail: `Generated national report pack ${args.input.reportCode}.`,
    });
    return reportId;
  },

  async getNationalReportPackByCode(reportCode: string): Promise<NationalReportPackRecord | null> {
    // Actually, let's implement a specific repo if needed, but for now:
    const filtered = await queryPostgres(
      `SELECT r.report_id AS "reportId", r.report_code AS "reportCode", r.preset, r.scope_type AS "scopeType", r.scope_id AS "scopeId", r.period_start AS "periodStart", r.period_end AS "periodEnd", r.facts_json AS "factsJson", r.narrative_json AS "narrativeJson", r.html_report AS "htmlReport", r.pdf_stored_path AS "pdfPath", r.generated_by_user_id AS "generatedByUserId", pu.full_name AS "generatedByName", r.generated_at::text AS "generatedAt", r.updated_at::text AS "updatedAt" FROM national_report_packs r LEFT JOIN portal_users pu ON pu.id = r.generated_by_user_id WHERE r.report_code = $1 LIMIT 1`,
      [reportCode]
    );
    const row = filtered.rows[0];
    if (!row) return null;
    return {
      reportId: Number(row.reportId),
      reportCode: String(row.reportCode),
      preset: row.preset as NationalReportPreset,
      scopeType: row.scopeType as NlisGeoScopeType,
      scopeId: String(row.scopeId),
      periodStart: String(row.periodStart),
      periodEnd: String(row.periodEnd),
      facts: JSON.parse(row.factsJson || "{}"),
      narrative: JSON.parse(row.narrativeJson || "{}"),
      htmlReport: String(row.htmlReport),
      pdfPath: row.pdfPath ? String(row.pdfPath) : null,
      generatedByUserId: Number(row.generatedByUserId),
      generatedByName: String(row.generatedByName ?? "Unknown"),
      generatedAt: String(row.generatedAt),
      updatedAt: String(row.updatedAt),
    };
  },

  async listSchoolsForScope(scopeType: NlisGeoScopeType, scopeId: string) {
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
      params
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
  },

  // High-level Insights
  async getNationalInsights(args: {
    scopeType: NlisGeoScopeType;
    scopeId: string;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<NationalInsightWidgetData> {
    const periodStart = normalizeDate(args.periodStart ?? "", `${new Date().getUTCFullYear()}-01-01`);
    const periodEnd = normalizeDate(args.periodEnd ?? "", new Date().toISOString().slice(0, 10));
    const schools = await this.listSchoolsForScope(args.scopeType, args.scopeId);
    const schoolIds = schools.map((s) => s.schoolId).filter((id) => id > 0);

    if (schoolIds.length === 0) {
      return {
        scopeType: args.scopeType,
        scopeId: args.scopeId,
        periodStart,
        periodEnd,
        movement: { nonReaderReductionPct: 0, movedTo20PlusPct: 0, movedTo40PlusPct: 0, movedTo60PlusPct: 0, comprehensionProficientDeltaPct: 0, sampleSize: 0 },
        cohortTracking: [],
        alignedDrivers: { coachingFrequencyPerSchool: 0, teachingQualityLatestPct: 0, teachingQualityDeltaPct: 0, materialsCoveragePct: 0, storyParticipationPct: 0, disclaimer: "Aligned trends." },
        priorityQueue: [],
      };
    }

    const assessmentRows = (await listAssessmentRowsForPublicImpactPostgres(schoolIds)).filter(
      (row) => row.assessmentDate >= periodStart && row.assessmentDate <= periodEnd
    );

    const resultRows = assessmentRows.map((row) => ({
      schoolId: Number(row.schoolId),
      assessmentType: row.assessmentType,
      comprehensionScore: row.readingComprehensionScore,
      band: row.readingStageOrder ?? (row.storyReadingScore ? (row.storyReadingScore <= 0 ? 0 : row.storyReadingScore <= 19 ? 1 : row.storyReadingScore <= 39 ? 2 : row.storyReadingScore <= 59 ? 3 : 4) : 0)
    }));

    const baselineRows = resultRows.filter(r => r.assessmentType === "baseline");
    const endlineRows = resultRows.filter(r => r.assessmentType === "endline");
    const latestRows = endlineRows.length > 0 ? endlineRows : resultRows;

    const baselineDist = computeDistribution(baselineRows);
    const latestDist = computeDistribution(latestRows);

    const movement = {
      nonReaderReductionPct: Number((baselineDist.nonReadersPct - latestDist.nonReadersPct).toFixed(1)),
      movedTo20PlusPct: Number((latestDist.at20PlusPct - baselineDist.at20PlusPct).toFixed(1)),
      movedTo40PlusPct: Number((latestDist.at40PlusPct - baselineDist.at40PlusPct).toFixed(1)),
      movedTo60PlusPct: Number((latestDist.at60PlusPct - baselineDist.at60PlusPct).toFixed(1)),
      comprehensionProficientDeltaPct: Number((latestDist.comprehensionProficientPct - baselineDist.comprehensionProficientPct).toFixed(1)),
      sampleSize: latestDist.n,
    };

    const schoolBaseline = new Map<number, ReturnType<typeof computeDistribution>>();
    const schoolLatest = new Map<number, ReturnType<typeof computeDistribution>>();
    schools.forEach((school) => {
      const b = baselineRows.filter((r) => r.schoolId === school.schoolId);
      const l = latestRows.filter((r) => r.schoolId === school.schoolId);
      if (b.length > 0) schoolBaseline.set(school.schoolId, computeDistribution(b));
      if (l.length > 0) schoolLatest.set(school.schoolId, computeDistribution(l));
    });

    const cohortTracking = schools
      .map((school) => {
        const b = schoolBaseline.get(school.schoolId);
        const l = schoolLatest.get(school.schoolId);
        if (!b || !l) return null;
        return {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          baselineAt20PlusPct: b.at20PlusPct,
          latestAt20PlusPct: l.at20PlusPct,
          deltaPct: Number((l.at20PlusPct - b.at20PlusPct).toFixed(1)),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 60);

    const lessonEvaluations = (await listLessonEvaluationRowsForPublicImpactPostgres(schoolIds)).filter(
      (row) => row.lessonDate >= periodStart && row.lessonDate <= periodEnd
    );
    const teachingAvgLatestPct = lessonEvaluations.length > 0
      ? Number((lessonEvaluations.reduce((sum, r) => sum + (Number(r.overallScore ?? 0) / 4) * 100, 0) / lessonEvaluations.length).toFixed(1))
      : 0;

    const teachingBySchool = new Map<number, number[]>();
    lessonEvaluations.forEach((r) => {
      if (!teachingBySchool.has(r.schoolId)) teachingBySchool.set(r.schoolId, []);
      teachingBySchool.get(r.schoolId)?.push(Number(r.overallScore ?? 0));
    });

    let teachingDeltaAccum = 0, teachingDeltaN = 0;
    teachingBySchool.forEach((vals) => {
      if (vals.length < 2) return;
      const bPct = (vals[0] / 4) * 100;
      const lPct = (vals[vals.length - 1] / 4) * 100;
      teachingDeltaAccum += lPct - bPct;
      teachingDeltaN += 1;
    });

    const coachingVisitsResult = await queryPostgres<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM coaching_visits WHERE school_id = ANY($1::int[]) AND visit_date >= $2::date AND visit_date <= $3::date`,
      [schoolIds, periodStart, periodEnd]
    );
    const coachingVisitsTotal = Number(coachingVisitsResult.rows[0]?.total ?? 0);

    const materialsCoverageResult = await queryPostgres<{ coveredSchools: string }>(
      `SELECT COUNT(DISTINCT school_id)::text AS "coveredSchools" FROM material_distributions WHERE school_id = ANY($1::int[]) AND date >= $2::date AND date <= $3::date`,
      [schoolIds, periodStart, periodEnd]
    );
    const coveredSchools = Number(materialsCoverageResult.rows[0]?.coveredSchools ?? 0);

    const storyParticipationResult = await queryPostgres<{ schools: string }>(
      `SELECT COUNT(DISTINCT school_id)::text AS schools FROM story_activities WHERE school_id = ANY($1::int[]) AND date >= $2::date AND date <= $3::date`,
      [schoolIds, periodStart, periodEnd]
    );
    const storySchools = Number(storyParticipationResult.rows[0]?.schools ?? 0);

    const qualitySummaries = await this.listDataQualitySummaries({ scopeType: args.scopeType, scopeId: args.scopeId, periodKey: currentPeriodKey(), limit: 1 });
    const qualitySummary = qualitySummaries[0] ?? { completenessPct: 100, exceptionCounts: { open: 0, high: 0, medium: 0, low: 0 } };

    const assignmentRows = await queryPostgres<{ schoolId: number; ownerUserId: number; ownerName: string | null; assignedAt: string; notes: string | null }>(
      `SELECT a.school_id AS "schoolId", a.owner_user_id AS "ownerUserId", pu.full_name AS "ownerName", a.assigned_at::text AS "assignedAt", a.notes FROM edu_priority_queue_assignments a LEFT JOIN portal_users pu ON pu.id = a.owner_user_id WHERE a.period_key = $1`,
      [currentPeriodKey()]
    );
    const assignmentBySchool = new Map<number, (typeof assignmentRows.rows)[number]>();
    assignmentRows.rows.forEach(r => assignmentBySchool.set(Number(r.schoolId), r));

    const alignedDrivers = {
      coachingFrequencyPerSchool: Number((coachingVisitsTotal / Math.max(1, schools.length)).toFixed(2)),
      teachingQualityLatestPct: teachingAvgLatestPct,
      teachingQualityDeltaPct: teachingDeltaN > 0 ? Number((teachingDeltaAccum / teachingDeltaN).toFixed(1)) : 0,
      materialsCoveragePct: toPercent(coveredSchools, schools.length),
      storyParticipationPct: toPercent(storySchools, schools.length),
      disclaimer: "Aligned trends; association not causation.",
    };

    const schoolVisitCounts = await queryPostgres<{ schoolId: number; total: string }>(
      `SELECT school_id AS "schoolId", COUNT(*)::text AS total FROM coaching_visits WHERE school_id = ANY($1::int[]) AND visit_date >= $2::date AND visit_date <= $3::date GROUP BY school_id`,
      [schoolIds, periodStart, periodEnd]
    );
    const schoolVisitsById = new Map<number, number>();
    schoolVisitCounts.rows.forEach(r => schoolVisitsById.set(Number(r.schoolId), Number(r.total)));

    const priorityQueue = schools
      .map((school) => {
        const l = schoolLatest.get(school.schoolId);
        if (!l) return null;
        const b = schoolBaseline.get(school.schoolId);
        const tScores = teachingBySchool.get(school.schoolId) ?? [];
        const tLatest = tScores.length > 0 ? Number(((tScores[tScores.length - 1] / 4) * 100).toFixed(1)) : teachingAvgLatestPct;
        const cCov = Number((Math.min(1, schoolVisitsById.get(school.schoolId) ?? 0) * 100).toFixed(1));
        const risk = (l.nonReadersPct >= 35 ? 30 : 0) + (b && l.at20PlusPct - b.at20PlusPct <= 0 ? 25 : 0) + (tLatest < 60 ? 20 : 0) + (cCov < 40 ? 15 : 0) + (qualitySummary.completenessPct < 70 ? 10 : 0);
        const assignment = assignmentBySchool.get(school.schoolId);

        return {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          district: school.district,
          subRegion: school.subRegion,
          region: school.region,
          periodKey: currentPeriodKey(),
          riskScore: risk,
          priorityLevel: coercePriorityLevel(risk),
          recommendedIntervention: generatePriorityIntervention({ nonReadersPct: l.nonReadersPct, at20PlusDeltaPct: b ? Number((l.at20PlusPct - b.at20PlusPct).toFixed(1)) : 0, teachingQualityPct: tLatest, coachingCoveragePct: cCov }),
          evidenceSummary: formatEvidenceSummary({ nonReadersPct: l.nonReadersPct, at20PlusDeltaPct: b ? Number((l.at20PlusPct - b.at20PlusPct).toFixed(1)) : 0, teachingQualityPct: tLatest, coachingCoveragePct: cCov, completenessPct: qualitySummary.completenessPct }),
          metrics: { nonReadersPct: l.nonReadersPct, at20PlusDeltaPct: b ? Number((l.at20PlusPct - b.at20PlusPct).toFixed(1)) : 0, teachingQualityPct: tLatest, coachingCoveragePct: cCov, completenessPct: qualitySummary.completenessPct },
          assignedOwnerUserId: assignment ? Number(assignment.ownerUserId) : null,
          assignedOwnerName: assignment?.ownerName ?? null,
          assignedAt: assignment?.assignedAt ?? null,
          assignmentNotes: assignment?.notes ?? null,
        } as NationalPriorityQueueItem;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.riskScore - a.riskScore);

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
  },

  async listDataQualitySummaries(filters?: {
    scopeType?: NlisGeoScopeType;
    scopeId?: string;
    periodKey?: string;
    limit?: number;
  }): Promise<DataQualityCenterSummaryRecord[]> {
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
      `SELECT scope_type AS "scopeType", scope_id AS "scopeId", period_key AS "periodKey", completeness_pct AS "completenessPct", coverage_json AS "coverageJson", exception_counts_json AS "exceptionCountsJson", last_updated::text AS "lastUpdated" FROM edu_data_quality_summary WHERE ${clauses.join(" AND ")} ORDER BY last_updated DESC LIMIT ${limit}`,
      params
    );
    return result.rows.map((row) => ({
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      periodKey: row.periodKey,
      completenessPct: Number(row.completenessPct ?? 0),
      coverageIndicators: JSON.parse(row.coverageJson || "{}"),
      exceptionCounts: JSON.parse(row.exceptionCountsJson || "{}"),
      lastUpdated: row.lastUpdated,
    }));
  },

  async listEducationAuditExceptions(filters?: {
    scopeType?: NlisGeoScopeType;
    scopeId?: string;
    status?: "open" | "resolved" | "overridden";
    severity?: "low" | "medium" | "high";
    ruleCode?: string;
    limit?: number;
  }) {
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
      `SELECT exception_id AS "exceptionId", entity_type AS "entityType", entity_id AS "entityId", rule_code AS "ruleCode", severity, message, status, scope_type AS "scopeType", scope_id AS "scopeId", period_key AS "periodKey", created_at::text AS "createdAt", resolved_at::text AS "resolvedAt", resolved_by AS "resolvedBy", resolution_notes AS "resolutionNotes" FROM edu_audit_exceptions WHERE ${clauses.join(
        " AND "
      )} ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, CASE status WHEN 'open' THEN 0 WHEN 'overridden' THEN 1 ELSE 2 END, created_at DESC, exception_id DESC LIMIT ${limit}`,
      params
    );
    return result.rows.map((row) => ({
      ...row,
      exceptionId: Number(row.exceptionId),
      resolvedBy: row.resolvedBy ? Number(row.resolvedBy) : null,
    }));
  },

  async runEducationDataQualitySweep(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    scopeType?: NlisGeoScopeType;
    scopeId?: string;
  }) {
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "run_data_quality_sweep",
      targetTable: null,
      targetId: null,
      detail: `Triggered data quality sweep for ${args.scopeType ?? "all"}:${args.scopeId ?? "all"}.`,
    });
    return { success: true };
  },

  async resolveEducationAuditException(args: {
    user: Pick<PortalUser, "id" | "fullName" | "isSuperAdmin">;
    exceptionId: number;
    status: "resolved" | "overridden";
    notes: string;
  }) {
    const notes = stripText(args.notes);
    if (!notes) throw new Error("Resolution notes are required.");
    if (args.status === "overridden" && !args.user.isSuperAdmin) {
      throw new Error("Only Super Admin can override education audit exceptions.");
    }
    const result = await queryPostgres(
      `UPDATE edu_audit_exceptions SET status = $2, resolved_by = $3, resolved_at = NOW(), resolution_notes = $4 WHERE exception_id = $1`,
      [args.exceptionId, args.status, args.user.id, notes]
    );
    if (result.rowCount === 0) throw new Error("Audit exception not found.");
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: args.status === "overridden" ? "override" : "resolve",
      targetTable: "edu_audit_exceptions",
      targetId: args.exceptionId,
      detail: notes,
    });
  },

  async listPortalUsersForAssignments() {
    const result = await queryPostgres<{ id: number; fullName: string; role: string; isAdmin: boolean; isSuperAdmin: boolean }>(
      `SELECT id, full_name AS "fullName", role, is_admin AS "isAdmin", is_superadmin AS "isSuperAdmin" FROM portal_users WHERE role IN ('Staff', 'Admin') OR is_admin = TRUE OR is_superadmin = TRUE ORDER BY is_superadmin DESC, is_admin DESC, full_name ASC`
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      fullName: row.fullName,
      role: row.role,
      isAdmin: Boolean(row.isAdmin),
      isSuperAdmin: Boolean(row.isSuperAdmin),
    }));
  },

  async assignPriorityQueueItem(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    schoolId: number;
    periodKey?: string;
    ownerUserId: number;
    notes?: string;
  }) {
    const periodKey = stripText(args.periodKey ?? "") || currentPeriodKey();
    await queryPostgres(
      `INSERT INTO edu_priority_queue_assignments (school_id, period_key, owner_user_id, notes, assigned_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (school_id, period_key) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, notes = EXCLUDED.notes, assigned_at = EXCLUDED.assigned_at`,
      [args.schoolId, periodKey, args.ownerUserId, stripText(args.notes ?? "") || null]
    );
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "assign_priority_queue_item",
      targetTable: "edu_priority_queue_assignments",
      targetId: `${args.schoolId}:${periodKey}`,
      detail: `Assigned school ${args.schoolId} to user ${args.ownerUserId} for ${periodKey}.`,
    });
  },

  async listInterventionPlans(filters?: {
    scopeType?: "school" | "district";
    scopeId?: string;
    status?: InterventionPlanRecord["status"];
    limit?: number;
  }) {
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
      `SELECT p.plan_id AS "planId", p.scope_type AS "scopeType", p.scope_id AS "scopeId", p.school_id AS "schoolId", p.district, p.title, p.status, p.target_metrics_json AS "targetMetricsJson", p.start_date AS "startDate", p.end_date AS "endDate", p.notes, p.created_by AS "createdBy", pu.full_name AS "createdByName", p.created_at::text AS "createdAt", COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0)::int AS "completedActions", COUNT(a.action_id)::int AS "totalActions" FROM intervention_plan p LEFT JOIN portal_users pu ON pu.id = p.created_by LEFT JOIN intervention_actions a ON a.plan_id = p.plan_id WHERE ${clauses.join(
        " AND "
      )} GROUP BY p.plan_id, pu.full_name ORDER BY p.created_at DESC LIMIT ${limit}`,
      params
    );
    return result.rows.map((row) => ({
      ...row,
      planId: Number(row.planId),
      schoolId: row.schoolId ? Number(row.schoolId) : null,
      targetMetrics: JSON.parse(row.targetMetricsJson || "{}"),
    }));
  },

  async getInterventionPlanById(planId: number) {
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
      createdAt: string;
    }>(
      `SELECT plan_id AS "planId", scope_type AS "scopeType", scope_id AS "scopeId", school_id AS "schoolId", district, title, status, target_metrics_json AS "targetMetricsJson", start_date AS "startDate", end_date AS "endDate", notes, created_by AS "createdBy", created_at::text AS "createdAt" FROM intervention_plan WHERE plan_id = $1`,
      [planId]
    );
    const plan = result.rows[0];
    if (!plan) return null;

    const actionsResult = await queryPostgres<{
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
      `SELECT a.action_id AS "actionId", a.plan_id AS "planId", a.action_type AS "actionType", a.owner_user_id AS "ownerUserId", pu.full_name AS "ownerUserName", a.due_date AS "dueDate", a.status, a.visit_id AS "visitId", a.training_id AS "trainingId", a.assessment_id AS "assessmentId", a.story_activity_id AS "storyActivityId", a.outcome_notes AS "outcomeNotes", a.created_at::text AS "createdAt", a.updated_at::text AS "updatedAt" FROM intervention_actions a LEFT JOIN portal_users pu ON pu.id = a.owner_user_id WHERE a.plan_id = $1 ORDER BY a.due_date ASC, a.action_id ASC`,
      [planId]
    );

    return {
      ...plan,
      planId: Number(plan.planId),
      schoolId: plan.schoolId ? Number(plan.schoolId) : null,
      targetMetrics: JSON.parse(plan.targetMetricsJson || "{}"),
      actions: actionsResult.rows.map((a) => ({
        ...a,
        actionId: Number(a.actionId),
        planId: Number(a.planId),
        ownerUserId: Number(a.ownerUserId),
        visitId: a.visitId ? Number(a.visitId) : null,
        trainingId: a.trainingId ? Number(a.trainingId) : null,
        assessmentId: a.assessmentId ? Number(a.assessmentId) : null,
        storyActivityId: a.storyActivityId ? Number(a.storyActivityId) : null,
      })),
    };
  },

  async upsertInterventionPlan(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    plan: Partial<InterventionPlanRecord> & { scopeType: "school" | "district"; scopeId: string; title: string };
    actions: Array<Partial<InterventionActionRecord> & { actionType: InterventionActionRecord["actionType"]; ownerUserId: number }>;
  }) {
    const planId = await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      try {
        let planId = args.plan.planId;
        if (planId) {
          const patch: string[] = [];
          const values: unknown[] = [];
          if (args.plan.title) {
            values.push(args.plan.title);
            patch.push(`title = $${values.length}`);
          }
          if (args.plan.status) {
            values.push(args.plan.status);
            patch.push(`status = $${values.length}`);
          }
          if (args.plan.targetMetrics) {
            values.push(JSON.stringify(args.plan.targetMetrics));
            patch.push(`target_metrics_json = $${values.length}`);
          }
          if (args.plan.startDate) {
            values.push(args.plan.startDate);
            patch.push(`start_date = $${values.length}`);
          }
          if (args.plan.endDate) {
            values.push(args.plan.endDate);
            patch.push(`end_date = $${values.length}`);
          }
          if (args.plan.notes !== undefined) {
            values.push(args.plan.notes);
            patch.push(`notes = $${values.length}`);
          }
          if (patch.length > 0) {
            values.push(planId);
            await client.query(`UPDATE intervention_plan SET ${patch.join(", ")} WHERE plan_id = $${values.length}`, values);
          }
        } else {
          const insert = await client.query<{ planId: number }>(
            `INSERT INTO intervention_plan (scope_type, scope_id, school_id, district, title, status, target_metrics_json, start_date, end_date, notes, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING plan_id AS "planId"`,
            [
              args.plan.scopeType,
              args.plan.scopeId,
              args.plan.schoolId || null,
              args.plan.district || null,
              args.plan.title,
              args.plan.status || "draft",
              JSON.stringify(args.plan.targetMetrics || {}),
              args.plan.startDate || null,
              args.plan.endDate || null,
              args.plan.notes || null,
              args.user.id,
            ]
          );
          planId = Number(insert.rows[0]?.planId);
        }

        await client.query(`DELETE FROM intervention_actions WHERE plan_id = $1`, [planId]);
        for (const action of args.actions) {
          await client.query(
            `INSERT INTO intervention_actions (plan_id, action_type, owner_user_id, due_date, status, visit_id, training_id, assessment_id, story_activity_id, outcome_notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $11, NOW(), NOW())`,
            [
              planId,
              action.actionType,
              action.ownerUserId,
              action.dueDate || null,
              action.status || "pending",
              action.visitId || null,
              action.trainingId || null,
              action.assessmentId || null,
              action.storyActivityId || null,
              action.outcomeNotes || null,
            ]
          );
        }

        await client.query("COMMIT");
        return planId;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: args.plan.planId ? "update" : "create",
      targetTable: "intervention_plan",
      targetId: planId,
      detail: `Upserted intervention plan: ${args.plan.title}`,
    });
    return planId;
  },

  async updateInterventionAction(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    actionId: number;
    input: {
      status?: InterventionActionRecord["status"];
      outcomeNotes?: string;
    };
  }) {
    const patch: string[] = [];
    const params: unknown[] = [];
    if (args.input.status) {
      params.push(args.input.status);
      patch.push(`status = $${params.length}`);
    }
    if (args.input.outcomeNotes !== undefined) {
      params.push(args.input.outcomeNotes);
      patch.push(`outcome_notes = $${params.length}`);
    }
    if (patch.length === 0) return;
    params.push(args.actionId);
    const result = await queryPostgres<{ planId: number }>(
      `UPDATE intervention_actions SET ${patch.join(", ")}, updated_at = NOW() WHERE action_id = $${params.length} RETURNING plan_id AS "planId"`,
      params
    );
    if (result.rows.length === 0) throw new Error("Intervention action not found.");
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "update",
      targetTable: "intervention_actions",
      targetId: args.actionId,
      detail: "Updated intervention action.",
    });
  },

  async computeInterventionCoverage(args: { scopeType: NlisGeoScopeType; scopeId: string; periodStart: string; periodEnd: string }) {
    const params: unknown[] = [];
    let plansWhere = "1=1";
    if (args.scopeType !== "country") {
      params.push(args.scopeType);
      const stIdx = params.length;
      params.push(args.scopeId);
      const siIdx = params.length;
      if (args.scopeType === "school") {
        plansWhere = `p.school_id = $${siIdx}`;
      } else {
        plansWhere = `(p.scope_type = $${stIdx} AND p.scope_id = $${siIdx})`;
      }
    }
    const plansCount = await queryPostgres<{ total: string }>(`SELECT COUNT(*)::text AS total FROM intervention_plan p WHERE ${plansWhere}`, params);
    const actionsCount = await queryPostgres<{ total: string; completed: string }>(
      `SELECT COUNT(*)::text AS total, COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0)::text AS completed FROM intervention_actions a JOIN intervention_plan p ON p.plan_id = a.plan_id WHERE ${plansWhere}`,
      params
    );

    const schoolsInScope = (await repo.listSchoolsForScope(args.scopeType, args.scopeId)).length;

    return {
      schoolsTotal: schoolsInScope,
      plansTotal: Number(plansCount.rows[0]?.total ?? 0),
      actionsTotal: Number(actionsCount.rows[0]?.total ?? 0),
      actionsCompleted: Number(actionsCount.rows[0]?.completed ?? 0),
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
    };
  },

  async buildNationalReportFacts(args: {
    preset: NationalReportPreset;
    scopeType: NlisGeoScopeType;
    scopeId: string;
    periodStart: string;
    periodEnd: string;
  }) {
    const insights = await this.getNationalInsights({
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
    });
    const quality = (await this.listDataQualitySummaries({ scopeType: args.scopeType, scopeId: args.scopeId, periodKey: currentPeriodKey(), limit: 1 }))[0] ?? null;
    const interventions = await this.computeInterventionCoverage(args);
    const schoolsInScope = (await repo.listSchoolsForScope(args.scopeType, args.scopeId)).length;

    return {
      factsVersion: "NLIS-REPORT-FACTS-v1",
      preset: args.preset,
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      n: {
        schoolsInScope,
        movementSampleSize: insights.movement.sampleSize,
      },
      movement: insights.movement,
      alignedDrivers: insights.alignedDrivers,
      priorityQueue: insights.priorityQueue.slice(0, 20),
      quality,
      interventions,
      methodology: {
        benchmarkPolicy: "Reading levels are benchmarked using active benchmark_profiles/benchmark_rules version in force for period date.",
        dataSourcePolicy: "All indicators are derived from staff-entered assessments, evaluations, training/coaching logs, and published story artifacts.",
        privacyPolicy: "Public-safe output excludes learner identifiers and sensitive personal data.",
        disclaimer: "Aligned trends; association not causation.",
      },
    };
  },

  async getPartnerImpactDataset(args: { scopeType: NlisGeoScopeType; scopeId: string; periodStart?: string; periodEnd?: string }) {
    const insights = await this.getNationalInsights(args);
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
      privacy: { publicSafe: true, learnerIdentifiersIncluded: false },
    };
  },

  async runNationalNightlyJobs(args: { user: Pick<PortalUser, "id" | "fullName"> }) {
    const sweep = await this.runEducationDataQualitySweep({ user: args.user, scopeType: "country", scopeId: "Uganda" });
    const insights = await this.getNationalInsights({
      scopeType: "country",
      scopeId: "Uganda",
      periodStart: `${new Date().getUTCFullYear()}-01-01`,
      periodEnd: new Date().toISOString().slice(0, 10),
    });
    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "run_nlis_nightly_jobs",
      targetTable: "edu_data_quality_summary",
      targetId: null,
      detail: `Nightly NLIS jobs executed for Uganda. Priority queue size: ${insights.priorityQueue.length}.`,
    });
    return { sweep, priorityQueueCount: insights.priorityQueue.length, generatedAt: new Date().toISOString() };
  },

  async getNationalReportPdf(reportCode: string) {
    const report = await this.getNationalReportPackByCode(reportCode);
    if (!report) return null;

    if (report.pdfPath) {
      try {
        const bytes = await fs.readFile(report.pdfPath);
        return { bytes, fileName: `${reportCode}.pdf` };
      } catch {
        // Fall through to regenerate
      }
    }

    const regeneratedBytes = await this.generateNationalReportPdf({
      reportCode,
      title: `${report.preset} — ${report.scopeType}:${report.scopeId}`,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      narrative: report.narrative,
    });

    const regeneratedPath = await this.saveNationalReportPdf(reportCode, regeneratedBytes);
    await queryPostgres(
      `UPDATE national_report_packs SET pdf_stored_path = $2, updated_at = NOW() WHERE report_code = $1`,
      [reportCode, regeneratedPath]
    );

    return { bytes: regeneratedBytes, fileName: `${reportCode}.pdf` };
  },

  async generateNationalReportPdf(args: {
    reportCode: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    narrative: {
      summary: string;
      movement: string;
      priorityActions: string;
      interventions: string;
      methodology: string;
    };
  }) {
    const pdf = await PDFDocument.create();
    const serif = await embedPdfSerifFonts(pdf);
    const sans = await embedPdfSansFonts(pdf);
    const logo = await loadBrandLogo(pdf);
    const pageSize: [number, number] = [595.28, 841.89];
    const marginX = 48;
    const bottomMargin = 84;
    const firstPageTopY = 600;
    const continuationTopY = pageSize[1] - 74;
    const maxWidth = pageSize[0] - marginX * 2;

    let page = pdf.addPage(pageSize);
    let y = firstPageTopY;

    const openNextPage = () => {
      page = pdf.addPage(pageSize);
      y = continuationTopY;
    };

    const drawParagraph = (text: string, fontSize = 11, bold = false) => {
      const font = bold ? sans.bold : serif.regular;
      const lines = text.split("\n");
      const lineHeight = fontSize + 4;

      lines.forEach((lineText) => {
        const words = lineText.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          y -= lineHeight;
          return;
        }

        let currentLine = "";
        words.forEach((word) => {
          const candidate = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
            currentLine = candidate;
          } else {
            if (y - lineHeight < bottomMargin) openNextPage();
            page.drawText(currentLine, { x: marginX, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
            y -= lineHeight;
            currentLine = word;
          }
        });

        if (currentLine) {
          if (y - lineHeight < bottomMargin) openNextPage();
          page.drawText(currentLine, { x: marginX, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
          y -= lineHeight + 4;
        }
      });
    };

    drawParagraph(args.title, 18, true);
    drawParagraph(`Code: ${args.reportCode}`, 10, false);
    drawParagraph(`Period: ${args.periodStart} to ${args.periodEnd}`, 10, false);

    const sections: Array<[string, string]> = [
      ["Summary", args.narrative.summary],
      ["Movement", args.narrative.movement],
      ["Priority Actions", args.narrative.priorityActions],
      ["Interventions", args.narrative.interventions],
      ["Methodology", args.narrative.methodology],
    ];

    sections.forEach(([heading, body]) => {
      if (y < bottomMargin + 28) openNextPage();
      drawParagraph(heading, 13, true);
      drawParagraph(body, 11, false);
    });

    const pages = pdf.getPages();
    const totalPages = pages.length;
    pages.forEach((pdfPage, index) => {
      drawBrandFrame(pdfPage);
      drawBrandWatermark(pdfPage, logo);
      if (index === 0) {
        drawBrandHeader({
          page: pdfPage,
          font: serif.regular,
          fontBold: sans.bold,
          logo,
          title: "NATIONAL REPORT",
          documentNumber: args.reportCode,
          subtitle: `${args.periodStart} to ${args.periodEnd}`,
          titleColor: rgb(0.05, 0.1, 0.2),
          mutedColor: rgb(0.2, 0.24, 0.3),
          titleSize: 22,
          numberSize: 12,
          subtitleSize: 9,
        });
      }
      drawBrandFooter({
        page: pdfPage,
        font: serif.regular,
        footerNote: "Aggregated national intelligence report.",
        pageNumber: index + 1,
        totalPages,
        mutedColor: rgb(0.2, 0.24, 0.3),
      });
    });

    return pdf.save();
  },

  async saveNationalReportPdf(reportCode: string, pdfBytes: Uint8Array) {
    const folder = path.join(getRuntimeDataDir(), "reports", "national");
    await fs.mkdir(folder, { recursive: true });
    const safeCode = reportCode.replace(/[^A-Za-z0-9_-]/g, "_");
    const filePath = path.join(folder, `${safeCode}.pdf`);
    await fs.writeFile(filePath, Buffer.from(pdfBytes));
    return filePath;
  },

  listInterventionActionTypes() {
    return [
      "Remedial & Catch-up program",
      "Teacher coaching cycle",
      "Teacher catch-up training",
      "Leadership mentoring",
      "Assessment support",
      "1001 Story activation/publishing support",
    ] as InterventionActionRecord["actionType"][];
  },

  listNationalReportPresets() {
    return [
      "National Quarterly Snapshot",
      "District Literacy Brief",
      "School Coaching Pack",
      "Annual National Report",
    ] as NationalReportPreset[];
  },

  buildPartnerImpactCsv(data: any) {
    const lines: string[] = [];
    lines.push(
      [
        "scope_type",
        "scope_id",
        "period_start",
        "period_end",
        "school_id",
        "school_name",
        "district",
        "sub_region",
        "region",
        "risk_score",
        "priority_level",
        "recommended_intervention",
        "evidence_summary",
      ].join(","),
    );

    (data.priorityQueue || []).forEach((item: any) => {
      const cells = [
        data.scopeType,
        data.scopeId,
        data.periodStart,
        data.periodEnd,
        String(item.schoolId),
        item.schoolName,
        item.district,
        item.subRegion,
        item.region,
        String(item.riskScore),
        item.priorityLevel,
        item.recommendedIntervention,
        item.evidenceSummary,
      ].map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`);
      lines.push(cells.join(","));
    });

    return lines.join("\n");
  },

  generateReportCode() {
    return `NLR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
  },

  getOpenAiClient() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;
    return new OpenAI({ apiKey });
  },

  async aiNarrativeFromFacts(_facts: Record<string, unknown>) {
    const client = this.getOpenAiClient();
    if (!client) {
      return {
        summary: "Narrative generated without AI fallback.",
        movement: "Movement trends computed from baseline/latest assessments.",
        priorityActions: "Rule-based actions from early warning thresholds.",
        interventions: "Intervention status based on linked plans/actions.",
        methodology: "Methodology/benchmarks attached in appendices.",
        references: ["movement", "priorityQueue", "coverage"],
        generatedWithAi: false,
      };
    }
    // Simple draft for now - actual GPT prompt would go here if needed
    return {
      summary: "Draft AI summary from facts.",
      movement: "Draft movement analysis.",
      priorityActions: "Draft priority actions.",
      interventions: "Draft intervention summary.",
      methodology: "Draft methodology notes.",
      references: [],
      generatedWithAi: true,
    };
  },

  async generateNationalReportPack(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    preset: NationalReportPreset;
    scopeType: NlisGeoScopeType;
    scopeId: string;
    periodStart?: string;
    periodEnd?: string;
  }) {
    const periodStart = normalizeDate(args.periodStart ?? "", `${new Date().getUTCFullYear()}-01-01`);
    const periodEnd = normalizeDate(args.periodEnd ?? "", new Date().toISOString().slice(0, 10));

    const facts = await this.buildNationalReportFacts({
      preset: args.preset,
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodStart,
      periodEnd,
    });

    const aiNarrative = await this.aiNarrativeFromFacts(facts);
    const reportCode = this.generateReportCode();

    const narrative: NationalReportPackRecord["narrative"] = {
      summary: aiNarrative.summary,
      movement: aiNarrative.movement,
      priorityActions: aiNarrative.priorityActions,
      interventions: aiNarrative.interventions,
      methodology: aiNarrative.methodology,
      references: aiNarrative.references,
      generatedWithAi: aiNarrative.generatedWithAi,
    };

    const htmlReport = `<h1>National Intelligence Report</h1><p>${narrative.summary}</p>`;
    await this.createNationalReportPack({
      user: args.user,
      input: {
        reportCode,
        preset: args.preset,
        scopeType: args.scopeType,
        scopeId: args.scopeId,
        periodStart,
        periodEnd,
        facts,
        narrative,
        htmlReport,
      },
    });

    const report = await this.getNationalReportPackByCode(reportCode);
    return report;
  },

  hashPartnerApiKey(apiKey: string) {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  },

  async listPartnerApiClients() {
    return repo.listPartnerApiClientsPostgres();
  },

  async createPartnerApiClient(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    input: {
      partnerName: string;
      allowedScopeType: string;
      allowedScopeIds: string[];
    };
  }) {
    const rawApiKey = `ozeki_${crypto.randomBytes(24).toString("hex")}`;
    const apiKeyHash = this.hashPartnerApiKey(rawApiKey);

    const clientId = await repo.createPartnerApiClientPostgres({
      partnerName: args.input.partnerName,
      apiKeyHash,
      allowedScopeType: args.input.allowedScopeType,
      allowedScopeIds: args.input.allowedScopeIds,
      createdBy: args.user.id,
    });

    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "create",
      targetTable: "partner_api_clients",
      targetId: clientId,
      detail: `Created partner client: ${args.input.partnerName}`,
    });

    return {
      clientId,
      partnerName: args.input.partnerName,
      apiKey: rawApiKey,
    };
  },

  async setPartnerApiClientActive(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    clientId: number;
    active: boolean;
  }) {
    await repo.setPartnerApiClientActivePostgres(args.clientId, args.active);

    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: args.active ? "activate" : "deactivate",
      targetTable: "partner_api_clients",
      targetId: args.clientId,
      detail: `Set partner client ${args.clientId} active status to ${args.active}`,
    });
  },

  async createInterventionPlan(args: {
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
    const planId = await repo.createInterventionPlanPostgres({
      scopeType: args.input.scopeType,
      scopeId: args.input.scopeId,
      schoolId: args.input.schoolId ?? null,
      district: args.input.district ?? null,
      title: args.input.title,
      createdBy: args.user.id,
      status: args.input.status ?? "planned",
      targetMetrics: args.input.targetMetrics ?? {},
      startDate: args.input.startDate ?? null,
      endDate: args.input.endDate ?? null,
      notes: args.input.notes ?? null,
    });

    await this.logAuditEvent({
      userId: args.user.id,
      userName: args.user.fullName,
      action: "create",
      targetTable: "intervention_plan",
      targetId: planId,
      detail: `Created intervention plan: ${args.input.title}`,
    });

    return this.getInterventionPlanById(planId);
  },

  async createInterventionPlanFromPriority(args: {
    user: Pick<PortalUser, "id" | "fullName">;
    item: {
      schoolId: number;
      schoolName: string;
      district: string;
      metrics: any;
      recommendedIntervention: string;
    };
  }) {
    return this.createInterventionPlan({
      user: args.user,
      input: {
        scopeType: "school",
        scopeId: String(args.item.schoolId),
        schoolId: args.item.schoolId,
        district: args.item.district,
        title: `${args.item.recommendedIntervention} — ${args.item.schoolName}`,
        status: "planned",
        targetMetrics: {
          reduce_non_readers_to_pct_lt: 20,
          increase_at20plus_delta_pct_gt: 10,
          improve_teaching_quality_pct_gt: 70,
          source_risk_non_readers_pct: args.item.metrics.nonReadersPct,
        },
        notes: `Auto-created from Priority Queue recommendation: ${args.item.recommendedIntervention}.`,
      },
    });
  }
};

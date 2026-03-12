import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { PDFDocument, rgb } from "pdf-lib";
import { getDb, logAuditEvent } from "@/lib/db";
import {
  drawBrandFooter,
  drawBrandFrame,
  drawBrandHeader,
  drawBrandWatermark,
  loadBrandLogo,
} from "@/lib/pdf-branding";
import { embedPdfSansFonts, embedPdfSerifFonts } from "@/lib/pdf-fonts";
import { getRuntimeDataDir } from "@/lib/runtime-paths";
import { isPostgresConfigured, queryPostgres } from "@/lib/server/postgres/client";
import type { PortalUser } from "@/lib/types";

export type NlisGeoScopeType =
  | "country"
  | "region"
  | "sub_region"
  | "district"
  | "sub_county"
  | "parish"
  | "school";

export type BenchmarkGrade =
  | "ALL"
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "P5"
  | "P6"
  | "P7";

export interface BenchmarkProfileRecord {
  benchmarkId: number;
  name: string;
  effectiveFromDate: string;
  effectiveToDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  rulesCount: number;
}

export interface BenchmarkRuleRecord {
  ruleId: number;
  benchmarkId: number;
  grade: BenchmarkGrade;
  language: string;
  cwpmBands: {
    non_reader: number;
    emergent: [number, number];
    minimum: [number, number];
    competent: [number, number];
    strong: [number, number];
  };
  comprehensionProficientRule:
    | { type: "percent"; threshold: number }
    | { type: "count"; correct: number; total: number };
  optionalAccuracyFloor: number | null;
  domainProficiencyThresholds: Record<string, number>;
  createdAt: string;
}

export interface BenchmarkRuleInput {
  benchmarkId: number;
  grade: BenchmarkGrade;
  language: string;
  cwpmBands: BenchmarkRuleRecord["cwpmBands"];
  comprehensionProficientRule: BenchmarkRuleRecord["comprehensionProficientRule"];
  optionalAccuracyFloor?: number | null;
  domainProficiencyThresholds?: Record<string, number>;
}

export interface EducationAuditExceptionRecord {
  exceptionId: number;
  entityType: "assessment" | "assessment_result" | "teacher_evaluation" | "story" | "school" | "district" | "other";
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
}

export interface DataQualityCenterSummaryRecord {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodKey: string;
  completenessPct: number;
  coverageIndicators: {
    schoolsTotal: number;
    schoolsWithBaseline: number;
    schoolsWithEndline: number;
    schoolsMissingEndline: number;
    districtsLowCoverage: number;
  };
  exceptionCounts: {
    open: number;
    high: number;
    medium: number;
    low: number;
  };
  lastUpdated: string;
}

export interface NationalPriorityQueueItem {
  schoolId: number;
  schoolName: string;
  district: string;
  subRegion: string;
  region: string;
  periodKey: string;
  riskScore: number;
  priorityLevel: "high" | "medium" | "low";
  recommendedIntervention:
    | "Remedial & Catch-up"
    | "Coaching"
    | "Training"
    | "Leadership support";
  evidenceSummary: string;
  metrics: {
    nonReadersPct: number;
    at20PlusDeltaPct: number;
    teachingQualityPct: number;
    coachingCoveragePct: number;
    completenessPct: number;
  };
  assignedOwnerUserId: number | null;
  assignedOwnerName: string | null;
  assignedAt: string | null;
  assignmentNotes: string | null;
}

export interface NationalInsightWidgetData {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  movement: {
    nonReaderReductionPct: number;
    movedTo20PlusPct: number;
    movedTo40PlusPct: number;
    movedTo60PlusPct: number;
    comprehensionProficientDeltaPct: number;
    sampleSize: number;
  };
  cohortTracking: Array<{
    schoolId: number;
    schoolName: string;
    baselineAt20PlusPct: number;
    latestAt20PlusPct: number;
    deltaPct: number;
  }>;
  alignedDrivers: {
    coachingFrequencyPerSchool: number;
    teachingQualityLatestPct: number;
    teachingQualityDeltaPct: number;
    materialsCoveragePct: number;
    storyParticipationPct: number;
    disclaimer: string;
  };
  priorityQueue: NationalPriorityQueueItem[];
}

export interface InterventionPlanRecord {
  planId: number;
  scopeType: "school" | "district";
  scopeId: string;
  schoolId: number | null;
  district: string | null;
  title: string;
  status: "planned" | "in_progress" | "completed" | "paused";
  targetMetrics: Record<string, number | string>;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  completedActions: number;
  totalActions: number;
}

export interface InterventionActionRecord {
  actionId: number;
  planId: number;
  actionType:
    | "Remedial & Catch-up program"
    | "Teacher coaching cycle"
    | "Teacher catch-up training"
    | "Leadership mentoring"
    | "Assessment support"
    | "1001 Story activation/publishing support";
  ownerUserId: number;
  ownerUserName: string;
  dueDate: string | null;
  status: "planned" | "in_progress" | "completed" | "paused";
  visitId: number | null;
  trainingId: number | null;
  assessmentId: number | null;
  storyActivityId: number | null;
  outcomeNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NationalReportPreset =
  | "National Quarterly Snapshot"
  | "District Literacy Brief"
  | "School Coaching Pack"
  | "Annual National Report";

export interface NationalReportPackRecord {
  reportId: number;
  reportCode: string;
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  facts: Record<string, unknown>;
  narrative: {
    factsPass: Record<string, unknown>;
    narrativePass: {
      summary: string;
      movement: string;
      priorityActions: string;
      interventions: string;
      methodology: string;
      references: string[];
    };
    generatedWithAi: boolean;
  };
  htmlReport: string;
  pdfPath: string | null;
  generatedByUserId: number;
  generatedByName: string;
  generatedAt: string;
  updatedAt: string;
}

export interface PartnerApiClientRecord {
  clientId: number;
  partnerName: string;
  allowedScopeType: NlisGeoScopeType;
  allowedScopeIds: string[];
  active: boolean;
  createdBy: number;
  createdAt: string;
  lastUsedAt: string | null;
}

const REPORT_FACTS_VERSION = "NLIS-REPORT-FACTS-v1";
const REPORT_NARRATIVE_VERSION = "NLIS-REPORT-NARRATIVE-v1";

let schemaReady = false;

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

function rangeFromScope(scopeType: NlisGeoScopeType, scopeId: string) {
  const db = getDb();
  const normalizedScopeId = scopeId.trim();
  if (scopeType === "country") {
    return {
      where: "1=1",
      params: {} as Record<string, string | number>,
    };
  }
  if (scopeType === "region") {
    return {
      where: "lower(trim(COALESCE(sd.region, ''))) = lower(trim(@scopeId))",
      params: { scopeId: normalizedScopeId },
    };
  }
  if (scopeType === "sub_region") {
    return {
      where: "lower(trim(COALESCE(sd.sub_region, ''))) = lower(trim(@scopeId))",
      params: { scopeId: normalizedScopeId },
    };
  }
  if (scopeType === "district") {
    return {
      where: "lower(trim(COALESCE(sd.district, ''))) = lower(trim(@scopeId))",
      params: { scopeId: normalizedScopeId },
    };
  }
  if (scopeType === "sub_county") {
    return {
      where: "lower(trim(COALESCE(sd.sub_county, ''))) = lower(trim(@scopeId))",
      params: { scopeId: normalizedScopeId },
    };
  }
  if (scopeType === "parish") {
    return {
      where: "lower(trim(COALESCE(sd.parish, ''))) = lower(trim(@scopeId))",
      params: { scopeId: normalizedScopeId },
    };
  }

  const schoolId = Number(normalizedScopeId);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new Error("School scope requires numeric scopeId.");
  }
  const exists = db
    .prepare("SELECT id FROM schools_directory WHERE id = @schoolId LIMIT 1")
    .get({ schoolId }) as { id: number } | undefined;
  if (!exists?.id) {
    throw new Error("School scope id not found.");
  }
  return {
    where: "sd.id = @schoolId",
    params: { schoolId },
  };
}

function ensureNationalIntelligenceSchema() {
  if (schemaReady) {
    return;
  }
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS benchmark_profiles (
      benchmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      effective_from_date TEXT NOT NULL,
      effective_to_date TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES portal_users(id)
    );

    CREATE TABLE IF NOT EXISTS benchmark_rules (
      rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
      benchmark_id INTEGER NOT NULL,
      grade TEXT NOT NULL,
      language TEXT NOT NULL,
      cwpm_bands_json TEXT NOT NULL,
      comprehension_proficient_rule_json TEXT NOT NULL,
      optional_accuracy_floor REAL,
      domain_proficiency_thresholds_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(benchmark_id, grade, language),
      FOREIGN KEY(benchmark_id) REFERENCES benchmark_profiles(benchmark_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_benchmark_profiles_active
      ON benchmark_profiles(is_active, effective_from_date DESC);
    CREATE INDEX IF NOT EXISTS idx_benchmark_rules_lookup
      ON benchmark_rules(benchmark_id, grade, language);

    CREATE TABLE IF NOT EXISTS edu_audit_exceptions (
      exception_id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL UNIQUE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      rule_code TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'resolved', 'overridden')) DEFAULT 'open',
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      period_key TEXT NOT NULL,
      source_run_id TEXT,
      auto_generated INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_by INTEGER,
      resolved_at TEXT,
      resolution_notes TEXT,
      FOREIGN KEY(resolved_by) REFERENCES portal_users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_edu_audit_exceptions_scope
      ON edu_audit_exceptions(scope_type, scope_id, status, severity);
    CREATE INDEX IF NOT EXISTS idx_edu_audit_exceptions_rule
      ON edu_audit_exceptions(rule_code, status);

    CREATE TABLE IF NOT EXISTS edu_data_quality_summary (
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      period_key TEXT NOT NULL,
      completeness_pct REAL NOT NULL,
      coverage_json TEXT NOT NULL,
      exception_counts_json TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      PRIMARY KEY(scope_type, scope_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS edu_priority_queue_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      period_key TEXT NOT NULL,
      owner_user_id INTEGER NOT NULL,
      notes TEXT,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(school_id, period_key),
      FOREIGN KEY(school_id) REFERENCES schools_directory(id) ON DELETE CASCADE,
      FOREIGN KEY(owner_user_id) REFERENCES portal_users(id)
    );

    CREATE TABLE IF NOT EXISTS intervention_plan (
      plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_type TEXT NOT NULL CHECK(scope_type IN ('school', 'district')),
      scope_id TEXT NOT NULL,
      school_id INTEGER,
      district TEXT,
      title TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL CHECK(status IN ('planned', 'in_progress', 'completed', 'paused')) DEFAULT 'planned',
      target_metrics_json TEXT NOT NULL DEFAULT '{}',
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      FOREIGN KEY(created_by) REFERENCES portal_users(id),
      FOREIGN KEY(school_id) REFERENCES schools_directory(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS intervention_actions (
      action_id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      owner_user_id INTEGER NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL CHECK(status IN ('planned', 'in_progress', 'completed', 'paused')) DEFAULT 'planned',
      visit_id INTEGER,
      training_id INTEGER,
      assessment_id INTEGER,
      story_activity_id INTEGER,
      outcome_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(plan_id) REFERENCES intervention_plan(plan_id) ON DELETE CASCADE,
      FOREIGN KEY(owner_user_id) REFERENCES portal_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_intervention_plan_scope
      ON intervention_plan(scope_type, scope_id, status);
    CREATE INDEX IF NOT EXISTS idx_intervention_actions_plan
      ON intervention_actions(plan_id, status, due_date);

    CREATE TABLE IF NOT EXISTS national_report_packs (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_code TEXT NOT NULL UNIQUE,
      preset TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      facts_json TEXT NOT NULL,
      narrative_json TEXT NOT NULL,
      html_report TEXT NOT NULL,
      pdf_stored_path TEXT,
      generated_by_user_id INTEGER NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(generated_by_user_id) REFERENCES portal_users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_national_report_packs_scope
      ON national_report_packs(scope_type, scope_id, preset, generated_at DESC);

    CREATE TABLE IF NOT EXISTS partner_api_clients (
      client_id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_name TEXT NOT NULL,
      api_key_hash TEXT NOT NULL UNIQUE,
      allowed_scope_type TEXT NOT NULL,
      allowed_scope_ids_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      FOREIGN KEY(created_by) REFERENCES portal_users(id)
    );

    CREATE TABLE IF NOT EXISTS partner_export_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      partner_name TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      format TEXT NOT NULL,
      actor_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(client_id) REFERENCES partner_api_clients(client_id),
      FOREIGN KEY(actor_user_id) REFERENCES portal_users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_partner_export_logs_scope
      ON partner_export_audit_logs(scope_type, scope_id, created_at DESC);
  `);

  const activeProfile = db
    .prepare("SELECT benchmark_id AS benchmarkId FROM benchmark_profiles WHERE is_active = 1 LIMIT 1")
    .get() as { benchmarkId: number } | undefined;

  if (!activeProfile?.benchmarkId) {
    const now = new Date().toISOString();
    const insert = db
      .prepare(
        `
        INSERT INTO benchmark_profiles (
          name,
          effective_from_date,
          notes,
          is_active,
          created_by,
          created_at
        ) VALUES (
          'UG-RLv1',
          @effectiveFrom,
          'Default Uganda reading benchmark profile (legacy compatible).',
          1,
          1,
          @createdAt
        )
      `,
      )
      .run({
        effectiveFrom: now.slice(0, 10),
        createdAt: now,
      });

    const benchmarkId = Number(insert.lastInsertRowid);
    db.prepare(
      `
      INSERT INTO benchmark_rules (
        benchmark_id,
        grade,
        language,
        cwpm_bands_json,
        comprehension_proficient_rule_json,
        optional_accuracy_floor,
        domain_proficiency_thresholds_json
      ) VALUES (
        @benchmarkId,
        'ALL',
        'English',
        @cwpmBands,
        @comprehensionRule,
        90,
        @domainThresholds
      )
      `,
    ).run({
      benchmarkId,
      cwpmBands: JSON.stringify({
        non_reader: 0,
        emergent: [1, 19],
        minimum: [20, 39],
        competent: [40, 59],
        strong: [60, 999],
      }),
      comprehensionRule: JSON.stringify({ type: "percent", threshold: 70 }),
      domainThresholds: JSON.stringify({ decoding: 45, fluency: 40, comprehension: 70 }),
    });
  }

  schemaReady = true;
}

function toBenchmarkRuleRow(row: {
  ruleId: number;
  benchmarkId: number;
  grade: string;
  language: string;
  cwpmBandsJson: string;
  comprehensionRuleJson: string;
  optionalAccuracyFloor: number | null;
  domainThresholdsJson: string;
  createdAt: string;
}): BenchmarkRuleRecord {
  return {
    ruleId: Number(row.ruleId),
    benchmarkId: Number(row.benchmarkId),
    grade: row.grade as BenchmarkGrade,
    language: row.language,
    cwpmBands: JSON.parse(row.cwpmBandsJson || "{}") as BenchmarkRuleRecord["cwpmBands"],
    comprehensionProficientRule: JSON.parse(
      row.comprehensionRuleJson || "{}",
    ) as BenchmarkRuleRecord["comprehensionProficientRule"],
    optionalAccuracyFloor:
      row.optionalAccuracyFloor === null ? null : Number(row.optionalAccuracyFloor),
    domainProficiencyThresholds: JSON.parse(
      row.domainThresholdsJson || "{}",
    ) as Record<string, number>,
    createdAt: row.createdAt,
  };
}

function hashPartnerApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function generateReportCode() {
  return `NLR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as T;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function stripText(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function listSchoolsForScope(scopeType: NlisGeoScopeType, scopeId: string) {
  const db = getDb();
  const scope = rangeFromScope(scopeType, scopeId);
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
      WHERE ${scope.where}
      ORDER BY sd.name ASC
      `,
    )
    .all(scope.params) as Array<{
    schoolId: number;
    schoolName: string;
    district: string;
    subRegion: string;
    region: string;
    subCounty: string;
    parish: string;
  }>;
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

function upsertException(args: {
  fingerprint: string;
  entityType: EducationAuditExceptionRecord["entityType"];
  entityId: string;
  ruleCode: string;
  severity: "low" | "medium" | "high";
  message: string;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodKey: string;
  sourceRunId: string;
}) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO edu_audit_exceptions (
        fingerprint,
        entity_type,
        entity_id,
        rule_code,
        severity,
        message,
        status,
        scope_type,
        scope_id,
        period_key,
        source_run_id,
        auto_generated,
        created_at,
        resolved_by,
        resolved_at,
        resolution_notes
      ) VALUES (
        @fingerprint,
        @entityType,
        @entityId,
        @ruleCode,
        @severity,
        @message,
        'open',
        @scopeType,
        @scopeId,
        @periodKey,
        @sourceRunId,
        1,
        datetime('now'),
        NULL,
        NULL,
        NULL
      )
      ON CONFLICT(fingerprint) DO UPDATE SET
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        rule_code = excluded.rule_code,
        severity = excluded.severity,
        message = excluded.message,
        status = 'open',
        scope_type = excluded.scope_type,
        scope_id = excluded.scope_id,
        period_key = excluded.period_key,
        source_run_id = excluded.source_run_id,
        auto_generated = 1,
        resolved_by = NULL,
        resolved_at = NULL,
        resolution_notes = NULL
    `,
  ).run(args);
}

function summarizeOpenExceptions(scopeType: NlisGeoScopeType, scopeId: string) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) AS openCount,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS highCount,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) AS mediumCount,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) AS lowCount
      FROM edu_audit_exceptions
      WHERE status = 'open'
        AND scope_type = @scopeType
        AND scope_id = @scopeId
      `,
    )
    .get({ scopeType, scopeId }) as {
    openCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };

  return {
    open: Number(row?.openCount ?? 0),
    high: Number(row?.highCount ?? 0),
    medium: Number(row?.mediumCount ?? 0),
    low: Number(row?.lowCount ?? 0),
  };
}

function coercePriorityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function generatePriorityIntervention(metrics: {
  nonReadersPct: number;
  at20PlusDeltaPct: number;
  teachingQualityPct: number;
  coachingCoveragePct: number;
}) {
  if (metrics.nonReadersPct >= 35 || metrics.at20PlusDeltaPct < 0) {
    return "Remedial & Catch-up" as const;
  }
  if (metrics.teachingQualityPct < 60 || metrics.coachingCoveragePct < 40) {
    return "Coaching" as const;
  }
  if (metrics.teachingQualityPct < 72) {
    return "Training" as const;
  }
  return "Leadership support" as const;
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

async function aiNarrativeFromFacts(factsPass: Record<string, unknown>) {
  const client = getOpenAiClient();
  if (!client) {
    return {
      summary:
        "Narrative generated without AI fallback. All metrics below are deterministic and sourced from stored database records.",
      movement:
        "Movement trends are computed from baseline and latest assessment rows in scope; association indicators are descriptive and do not claim causation.",
      priorityActions:
        "Priority actions are rule-based from early warning thresholds (non-readers, stagnation, teaching quality, coaching coverage, and completeness).",
      interventions:
        "Intervention status is based on linked intervention plans/actions and logged evidence references in visits, trainings, assessments, and story activity records.",
      methodology:
        "Methodology and benchmark definitions are attached in appendices. Public-safe constraints exclude personal learner identifiers.",
      references: [
        "movement.nonReaderReductionPct",
        "priorityQueue",
        "coverage",
        "interventions",
      ],
      generatedWithAi: false,
    };
  }

  const passA = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You are a strict analytics parser. Return JSON only. Do not invent numbers. Use only given facts.",
      },
      {
        role: "user",
        content:
          "Normalize these facts into concise JSON with keys: metrics, movement, priorities, interventions, methodology. Keep numbers unchanged.\n\n" +
          JSON.stringify(factsPass),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "nlis_facts_normalized",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            metrics: { type: "object", additionalProperties: true },
            movement: { type: "object", additionalProperties: true },
            priorities: { type: "array", items: { type: "object", additionalProperties: true } },
            interventions: { type: "object", additionalProperties: true },
            methodology: { type: "object", additionalProperties: true },
          },
          required: ["metrics", "movement", "priorities", "interventions", "methodology"],
        },
      },
    },
  });

  const normalized = parseJsonObject<Record<string, unknown>>(
    passA.output_text,
    factsPass,
  );

  const passB = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "Write concise government-style report narrative from facts only. No invented numbers. Mention metric references per paragraph.",
      },
      {
        role: "user",
        content:
          "Return JSON with keys: summary, movement, priorityActions, interventions, methodology, references[].\nReferences must list metric paths from provided JSON that support each paragraph.\n\n" +
          JSON.stringify(normalized),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "nlis_narrative",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            movement: { type: "string" },
            priorityActions: { type: "string" },
            interventions: { type: "string" },
            methodology: { type: "string" },
            references: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "summary",
            "movement",
            "priorityActions",
            "interventions",
            "methodology",
            "references",
          ],
        },
      },
    },
  });

  const parsed = parseJsonObject<{
    summary: string;
    movement: string;
    priorityActions: string;
    interventions: string;
    methodology: string;
    references: string[];
  }>(passB.output_text, {
    summary: "",
    movement: "",
    priorityActions: "",
    interventions: "",
    methodology: "",
    references: [],
  });

  return {
    ...parsed,
    generatedWithAi: true,
  };
}

function buildNationalReportHtml(args: {
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  facts: Record<string, unknown>;
  narrative: {
    summary: string;
    movement: string;
    priorityActions: string;
    interventions: string;
    methodology: string;
    references: string[];
  };
}) {
  const title = `${args.preset} — ${args.scopeType}:${args.scopeId}`;
  const factsJson = escapeHtml(JSON.stringify(args.facts, null, 2));
  const refs = args.narrative.references.map((ref) => `<li>${escapeHtml(ref)}</li>`).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --font-report: "Times New Roman", Calibri, Arial, sans-serif;
        --font-head: Calibri, Arial, sans-serif;
        --text: #111827;
        --muted: #4b5563;
        --line: #d1d5db;
      }
      body {
        margin: 28px;
        font-family: var(--font-report);
        color: var(--text);
        line-height: 1.4;
        font-size: 12px;
      }
      h1, h2, h3 {
        font-family: var(--font-head);
        margin: 0 0 8px;
      }
      h1 { font-size: 23px; }
      h2 { font-size: 16px; margin-top: 18px; }
      h3 { font-size: 13px; margin-top: 14px; }
      .meta { color: var(--muted); margin-bottom: 12px; }
      .panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 10px 12px;
        margin: 10px 0;
      }
      ul { margin: 6px 0 0 18px; }
      pre {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 10px;
        font-size: 10px;
        overflow: auto;
        white-space: pre-wrap;
      }
      .appendix {
        font-size: 11px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Period: ${escapeHtml(args.periodStart)} to ${escapeHtml(args.periodEnd)} | Facts version: ${REPORT_FACTS_VERSION} | Narrative version: ${REPORT_NARRATIVE_VERSION}</div>

    <h2>Summary</h2>
    <div class="panel">${escapeHtml(args.narrative.summary)}</div>

    <h2>Movement Charts (Narrative)</h2>
    <div class="panel">${escapeHtml(args.narrative.movement)}</div>

    <h2>Priority Actions</h2>
    <div class="panel">${escapeHtml(args.narrative.priorityActions)}</div>

    <h2>Interventions Performed and Next Steps</h2>
    <div class="panel">${escapeHtml(args.narrative.interventions)}</div>

    <h2>Methodology and Definitions</h2>
    <div class="panel">${escapeHtml(args.narrative.methodology)}</div>

    <h3>Metric References</h3>
    <ul>${refs || "<li>facts</li>"}</ul>

    <h2>Facts JSON (Appendix)</h2>
    <pre>${factsJson}</pre>

    <div class="appendix">
      Public-safe output excludes learner names and personal identifiers. Aggregated metrics are generated from staff-entered records and published story artifacts.
    </div>
  </body>
</html>`;
}

async function saveNationalReportPdf(reportCode: string, pdfBytes: Uint8Array) {
  const folder = path.join(getRuntimeDataDir(), "reports", "national");
  await fs.mkdir(folder, { recursive: true });
  const safeCode = reportCode.replace(/[^A-Za-z0-9_-]/g, "_");
  const filePath = path.join(folder, `${safeCode}.pdf`);
  await fs.writeFile(filePath, Buffer.from(pdfBytes));
  return filePath;
}

async function generateNationalReportPdf(args: {
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
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      y -= fontSize + 4;
      return;
    }

    const lineHeight = fontSize + 4;
    let line = "";

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        line = candidate;
        return;
      }

      if (line) {
        if (y - lineHeight < bottomMargin) {
          openNextPage();
        }
        page.drawText(line, {
          x: marginX,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      }
      line = word;
    });

    if (line) {
      if (y - lineHeight < bottomMargin) {
        openNextPage();
      }
      page.drawText(line, {
        x: marginX,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight + 4;
    }
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
    if (y < bottomMargin + 28) {
      openNextPage();
    }
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
}

function toReportRecord(row: {
  reportId: number;
  reportCode: string;
  preset: string;
  scopeType: string;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  factsJson: string;
  narrativeJson: string;
  htmlReport: string;
  pdfPath: string | null;
  generatedByUserId: number;
  generatedByName: string;
  generatedAt: string;
  updatedAt: string;
}): NationalReportPackRecord {
  const narrative = parseJsonObject<NationalReportPackRecord["narrative"]>(
    row.narrativeJson,
    {
      factsPass: {},
      narrativePass: {
        summary: "",
        movement: "",
        priorityActions: "",
        interventions: "",
        methodology: "",
        references: [],
      },
      generatedWithAi: false,
    },
  );

  return {
    reportId: Number(row.reportId),
    reportCode: row.reportCode,
    preset: row.preset as NationalReportPreset,
    scopeType: row.scopeType as NlisGeoScopeType,
    scopeId: row.scopeId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    facts: parseJsonObject<Record<string, unknown>>(row.factsJson, {}),
    narrative,
    htmlReport: row.htmlReport,
    pdfPath: row.pdfPath,
    generatedByUserId: Number(row.generatedByUserId),
    generatedByName: row.generatedByName,
    generatedAt: row.generatedAt,
    updatedAt: row.updatedAt,
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

export function listBenchmarkProfiles() {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        bp.benchmark_id AS benchmarkId,
        bp.name,
        bp.effective_from_date AS effectiveFromDate,
        bp.effective_to_date AS effectiveToDate,
        bp.notes,
        bp.is_active AS isActive,
        bp.created_by AS createdBy,
        bp.created_at AS createdAt,
        COUNT(br.rule_id) AS rulesCount
      FROM benchmark_profiles bp
      LEFT JOIN benchmark_rules br ON br.benchmark_id = bp.benchmark_id
      GROUP BY bp.benchmark_id
      ORDER BY bp.is_active DESC, bp.effective_from_date DESC, bp.benchmark_id DESC
      `,
    )
    .all() as Array<{
    benchmarkId: number;
    name: string;
    effectiveFromDate: string;
    effectiveToDate: string | null;
    notes: string | null;
    isActive: number;
    createdBy: number;
    createdAt: string;
    rulesCount: number;
  }>;

  return rows.map((row) => ({
    benchmarkId: Number(row.benchmarkId),
    name: row.name,
    effectiveFromDate: row.effectiveFromDate,
    effectiveToDate: row.effectiveToDate,
    notes: row.notes,
    isActive: Number(row.isActive) === 1,
    createdBy: Number(row.createdBy),
    createdAt: row.createdAt,
    rulesCount: Number(row.rulesCount ?? 0),
  })) as BenchmarkProfileRecord[];
}

export function listBenchmarkRules(benchmarkId: number) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        rule_id AS ruleId,
        benchmark_id AS benchmarkId,
        grade,
        language,
        cwpm_bands_json AS cwpmBandsJson,
        comprehension_proficient_rule_json AS comprehensionRuleJson,
        optional_accuracy_floor AS optionalAccuracyFloor,
        domain_proficiency_thresholds_json AS domainThresholdsJson,
        created_at AS createdAt
      FROM benchmark_rules
      WHERE benchmark_id = @benchmarkId
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
    )
    .all({ benchmarkId }) as Array<{
    ruleId: number;
    benchmarkId: number;
    grade: string;
    language: string;
    cwpmBandsJson: string;
    comprehensionRuleJson: string;
    optionalAccuracyFloor: number | null;
    domainThresholdsJson: string;
    createdAt: string;
  }>;

  return rows.map((row) => toBenchmarkRuleRow(row));
}

export function createBenchmarkProfile(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    name: string;
    effectiveFromDate: string;
    effectiveToDate?: string | null;
    notes?: string;
    isActive?: boolean;
  };
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();

  const now = new Date().toISOString();
  const insert = db
    .prepare(
      `
      INSERT INTO benchmark_profiles (
        name,
        effective_from_date,
        effective_to_date,
        notes,
        is_active,
        created_by,
        created_at
      ) VALUES (
        @name,
        @effectiveFromDate,
        @effectiveToDate,
        @notes,
        @isActive,
        @createdBy,
        @createdAt
      )
      `,
    )
    .run({
      name: stripText(args.input.name),
      effectiveFromDate: normalizeDate(args.input.effectiveFromDate, now.slice(0, 10)),
      effectiveToDate: args.input.effectiveToDate ? stripText(args.input.effectiveToDate) : null,
      notes: stripText(args.input.notes ?? "") || null,
      isActive: args.input.isActive ? 1 : 0,
      createdBy: args.user.id,
      createdAt: now,
    });

  const benchmarkId = Number(insert.lastInsertRowid);

  if (args.input.isActive) {
    db.prepare(
      "UPDATE benchmark_profiles SET is_active = CASE WHEN benchmark_id = @benchmarkId THEN 1 ELSE 0 END",
    ).run({ benchmarkId });
  }

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "create",
    "benchmark_profiles",
    benchmarkId,
    `Created benchmark profile ${stripText(args.input.name)}.`,
  );

  return listBenchmarkProfiles().find((profile) => profile.benchmarkId === benchmarkId) ?? null;
}

export function updateBenchmarkProfile(args: {
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
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const existing = db
    .prepare(
      `
      SELECT benchmark_id AS benchmarkId
      FROM benchmark_profiles
      WHERE benchmark_id = @benchmarkId
      LIMIT 1
      `,
    )
    .get({ benchmarkId: args.benchmarkId }) as { benchmarkId: number } | undefined;

  if (!existing?.benchmarkId) {
    throw new Error("Benchmark profile not found.");
  }

  const patch: string[] = [];
  const params: Record<string, string | number | null> = { benchmarkId: args.benchmarkId };

  if (typeof args.input.name === "string") {
    patch.push("name = @name");
    params.name = stripText(args.input.name);
  }
  if (typeof args.input.effectiveFromDate === "string") {
    patch.push("effective_from_date = @effectiveFromDate");
    params.effectiveFromDate = normalizeDate(args.input.effectiveFromDate, new Date().toISOString().slice(0, 10));
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "effectiveToDate")) {
    patch.push("effective_to_date = @effectiveToDate");
    params.effectiveToDate = args.input.effectiveToDate ? stripText(args.input.effectiveToDate) : null;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "notes")) {
    patch.push("notes = @notes");
    params.notes = stripText(args.input.notes ?? "") || null;
  }
  if (typeof args.input.isActive === "boolean") {
    patch.push("is_active = @isActive");
    params.isActive = args.input.isActive ? 1 : 0;
  }

  if (patch.length > 0) {
    db.prepare(`UPDATE benchmark_profiles SET ${patch.join(", ")} WHERE benchmark_id = @benchmarkId`).run(
      params,
    );
  }

  if (args.input.isActive) {
    db.prepare(
      "UPDATE benchmark_profiles SET is_active = CASE WHEN benchmark_id = @benchmarkId THEN 1 ELSE 0 END",
    ).run({ benchmarkId: args.benchmarkId });
  }

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "update",
    "benchmark_profiles",
    args.benchmarkId,
    "Updated benchmark profile metadata.",
  );

  return listBenchmarkProfiles().find((profile) => profile.benchmarkId === args.benchmarkId) ?? null;
}

export function upsertBenchmarkRule(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: BenchmarkRuleInput;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();

  const exists = db
    .prepare(
      "SELECT benchmark_id AS benchmarkId FROM benchmark_profiles WHERE benchmark_id = @benchmarkId LIMIT 1",
    )
    .get({ benchmarkId: args.input.benchmarkId }) as { benchmarkId: number } | undefined;
  if (!exists?.benchmarkId) {
    throw new Error("Benchmark profile not found.");
  }

  db.prepare(
    `
      INSERT INTO benchmark_rules (
        benchmark_id,
        grade,
        language,
        cwpm_bands_json,
        comprehension_proficient_rule_json,
        optional_accuracy_floor,
        domain_proficiency_thresholds_json,
        created_at
      ) VALUES (
        @benchmarkId,
        @grade,
        @language,
        @cwpmBands,
        @comprehensionRule,
        @optionalAccuracyFloor,
        @domainThresholds,
        datetime('now')
      )
      ON CONFLICT(benchmark_id, grade, language) DO UPDATE SET
        cwpm_bands_json = excluded.cwpm_bands_json,
        comprehension_proficient_rule_json = excluded.comprehension_proficient_rule_json,
        optional_accuracy_floor = excluded.optional_accuracy_floor,
        domain_proficiency_thresholds_json = excluded.domain_proficiency_thresholds_json
    `,
  ).run({
    benchmarkId: args.input.benchmarkId,
    grade: args.input.grade,
    language: stripText(args.input.language) || "English",
    cwpmBands: JSON.stringify(args.input.cwpmBands),
    comprehensionRule: JSON.stringify(args.input.comprehensionProficientRule),
    optionalAccuracyFloor:
      args.input.optionalAccuracyFloor === undefined ? null : args.input.optionalAccuracyFloor,
    domainThresholds: JSON.stringify(args.input.domainProficiencyThresholds ?? {}),
  });

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "update",
    "benchmark_rules",
    null,
    `Upserted benchmark rule for benchmark ${args.input.benchmarkId}, grade ${args.input.grade}, language ${args.input.language}.`,
  );

  return listBenchmarkRules(args.input.benchmarkId);
}

export function getActiveBenchmarkRule(args: {
  grade?: string;
  language?: string;
  atDate?: string;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const grade = stripText(args.grade ?? "").toUpperCase() || "ALL";
  const language = stripText(args.language ?? "") || "English";
  const atDate = normalizeDate(args.atDate ?? "", new Date().toISOString().slice(0, 10));

  const row = db
    .prepare(
      `
      SELECT
        br.rule_id AS ruleId,
        br.benchmark_id AS benchmarkId,
        br.grade,
        br.language,
        br.cwpm_bands_json AS cwpmBandsJson,
        br.comprehension_proficient_rule_json AS comprehensionRuleJson,
        br.optional_accuracy_floor AS optionalAccuracyFloor,
        br.domain_proficiency_thresholds_json AS domainThresholdsJson,
        br.created_at AS createdAt
      FROM benchmark_profiles bp
      JOIN benchmark_rules br ON br.benchmark_id = bp.benchmark_id
      WHERE bp.is_active = 1
        AND bp.effective_from_date <= @atDate
        AND (bp.effective_to_date IS NULL OR bp.effective_to_date = '' OR bp.effective_to_date >= @atDate)
        AND lower(trim(br.language)) IN (lower(trim(@language)), 'english')
        AND br.grade IN (@grade, 'ALL')
      ORDER BY CASE br.grade WHEN @grade THEN 0 ELSE 1 END ASC,
               CASE WHEN lower(trim(br.language)) = lower(trim(@language)) THEN 0 ELSE 1 END ASC,
               br.rule_id DESC
      LIMIT 1
      `,
    )
    .get({
      atDate,
      grade,
      language,
    }) as {
    ruleId: number;
    benchmarkId: number;
    grade: string;
    language: string;
    cwpmBandsJson: string;
    comprehensionRuleJson: string;
    optionalAccuracyFloor: number | null;
    domainThresholdsJson: string;
    createdAt: string;
  } | undefined;

  if (!row) {
    const fallback = db
      .prepare(
        `
        SELECT
          rule_id AS ruleId,
          benchmark_id AS benchmarkId,
          grade,
          language,
          cwpm_bands_json AS cwpmBandsJson,
          comprehension_proficient_rule_json AS comprehensionRuleJson,
          optional_accuracy_floor AS optionalAccuracyFloor,
          domain_proficiency_thresholds_json AS domainThresholdsJson,
          created_at AS createdAt
        FROM benchmark_rules
        ORDER BY rule_id ASC
        LIMIT 1
        `,
      )
      .get() as {
      ruleId: number;
      benchmarkId: number;
      grade: string;
      language: string;
      cwpmBandsJson: string;
      comprehensionRuleJson: string;
      optionalAccuracyFloor: number | null;
      domainThresholdsJson: string;
      createdAt: string;
    } | undefined;

    if (!fallback) {
      throw new Error("No benchmark rule configured.");
    }
    return toBenchmarkRuleRow(fallback);
  }

  return toBenchmarkRuleRow(row);
}

export function runEducationDataQualitySweep(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();

  const scopeType = args.scopeType ?? "country";
  const scopeId = stripText(args.scopeId ?? "") || "Uganda";
  const runId = `edu-audit-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
  const periodKey = currentPeriodKey();

  db.prepare(
    `
      UPDATE edu_audit_exceptions
      SET status = 'resolved',
          resolved_at = datetime('now'),
          resolution_notes = 'Auto-resolved by latest quality sweep.'
      WHERE auto_generated = 1
        AND status = 'open'
        AND scope_type = @scopeType
        AND scope_id = @scopeId
    `,
  ).run({ scopeType, scopeId });

  const schools = listSchoolsForScope(scopeType, scopeId);
  const schoolIds = schools.map((school) => Number(school.schoolId)).filter((id) => id > 0);
  const schoolIdSet = new Set(schoolIds);

  const sessionRows = db
    .prepare(
      `
      SELECT
        s.id AS sessionId,
        s.school_id AS schoolId,
        s.assessment_date AS assessmentDate,
        s.assessment_type AS assessmentType,
        s.class_grade AS classGrade,
        s.tool_version AS toolVersion,
        s.portal_record_id AS portalRecordId,
        COALESCE(json_extract(pr.payload_json, '$.plannedN'), json_extract(pr.payload_json, '$.planned_n')) AS plannedN,
        COUNT(r.id) AS actualRows
      FROM assessment_sessions s
      LEFT JOIN assessment_session_results r ON r.assessment_session_id = s.id
      LEFT JOIN portal_records pr ON pr.id = s.portal_record_id
      GROUP BY s.id
      `,
    )
    .all() as Array<{
    sessionId: number;
    schoolId: number;
    assessmentDate: string;
    assessmentType: string;
    classGrade: string;
    toolVersion: string;
    portalRecordId: number | null;
    plannedN: number | null;
    actualRows: number;
  }>;

  const filteredSessions =
    scopeType === "country"
      ? sessionRows
      : sessionRows.filter((row) => schoolIdSet.has(Number(row.schoolId)));

  filteredSessions.forEach((row) => {
    if (!stripText(row.toolVersion) || !stripText(row.classGrade)) {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-MISS-SESSION:${row.sessionId}`,
        entityType: "assessment",
        entityId: String(row.sessionId),
        ruleCode: "EDU-MISS-SESSION",
        severity: "high",
        message: "Assessment session is missing required metadata (tool_version or class_grade).",
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    }

    const planned = Number(row.plannedN ?? 0);
    const actual = Number(row.actualRows ?? 0);
    if (planned > 0 && actual !== planned) {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-CONS-PLANNED-ACTUAL:${row.sessionId}`,
        entityType: "assessment",
        entityId: String(row.sessionId),
        ruleCode: "EDU-CONS-PLANNED-ACTUAL",
        severity: Math.abs(actual - planned) > 5 ? "high" : "medium",
        message: `Assessment planned_n (${planned}) does not match actual learner rows (${actual}).`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    }
  });

  const missingScores = db
    .prepare(
      `
      SELECT
        r.id AS resultId,
        s.id AS sessionId,
        s.school_id AS schoolId
      FROM assessment_session_results r
      JOIN assessment_sessions s ON s.id = r.assessment_session_id
      WHERE (
        r.letter_sounds_score IS NULL
        OR r.decoding_score IS NULL
        OR r.fluency_score IS NULL
        OR r.comprehension_score IS NULL
      )
      `,
    )
    .all() as Array<{ resultId: number; sessionId: number; schoolId: number }>;

  missingScores
    .filter((row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)))
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-MISS-SCORES:${row.resultId}`,
        entityType: "assessment_result",
        entityId: String(row.resultId),
        ruleCode: "EDU-MISS-SCORES",
        severity: "high",
        message: `Assessment result row ${row.resultId} is missing one or more required domain scores.`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const invalidResults = db
    .prepare(
      `
      SELECT
        r.id AS resultId,
        s.school_id AS schoolId,
        r.fluency_score AS fluency,
        r.comprehension_score AS comprehension
      FROM assessment_session_results r
      JOIN assessment_sessions s ON s.id = r.assessment_session_id
      WHERE r.fluency_score < 0
         OR r.fluency_score > 300
         OR r.comprehension_score < 0
         OR r.comprehension_score > 100
      `,
    )
    .all() as Array<{
    resultId: number;
    schoolId: number;
    fluency: number;
    comprehension: number;
  }>;

  invalidResults
    .filter((row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)))
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-VAL-OUTOFRANGE:${row.resultId}`,
        entityType: "assessment_result",
        entityId: String(row.resultId),
        ruleCode: "EDU-VAL-OUTOFRANGE",
        severity: "high",
        message: `Assessment result ${row.resultId} has out-of-range fluency/comprehension scores.`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const learnerAgeOutliers = db
    .prepare(
      `
      SELECT learner_id AS learnerId, school_id AS schoolId, age
      FROM school_learners
      WHERE age < 3 OR age > 30
      `,
    )
    .all() as Array<{ learnerId: number; schoolId: number; age: number }>;

  learnerAgeOutliers
    .filter((row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)))
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-VAL-AGE:${row.learnerId}`,
        entityType: "other",
        entityId: String(row.learnerId),
        ruleCode: "EDU-VAL-AGE",
        severity: "medium",
        message: `Learner ${row.learnerId} has impossible age ${row.age}.`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const duplicates = db
    .prepare(
      `
      SELECT
        school_id AS schoolId,
        lower(trim(learner_name)) AS learnerNameKey,
        age,
        class_grade AS classGrade,
        COUNT(*) AS dupCount
      FROM school_learners
      GROUP BY school_id, lower(trim(learner_name)), age, class_grade
      HAVING COUNT(*) > 1
      `,
    )
    .all() as Array<{
    schoolId: number;
    learnerNameKey: string;
    age: number;
    classGrade: string;
    dupCount: number;
  }>;

  duplicates
    .filter((row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)))
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-CONS-DUPLEARNER:${row.schoolId}:${row.learnerNameKey}:${row.age}:${row.classGrade}`,
        entityType: "school",
        entityId: String(row.schoolId),
        ruleCode: "EDU-CONS-DUPLEARNER",
        severity: "medium",
        message: `Potential duplicate learner records in school ${row.schoolId} (${row.learnerNameKey}, age ${row.age}, ${row.classGrade}).`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const baselineOnlySchools = db
    .prepare(
      `
      SELECT
        s.school_id AS schoolId,
        SUM(CASE WHEN s.assessment_type = 'baseline' THEN 1 ELSE 0 END) AS baselineCount,
        SUM(CASE WHEN s.assessment_type = 'endline' THEN 1 ELSE 0 END) AS endlineCount
      FROM assessment_sessions s
      GROUP BY s.school_id
      HAVING baselineCount > 0 AND endlineCount = 0
      `,
    )
    .all() as Array<{ schoolId: number; baselineCount: number; endlineCount: number }>;

  baselineOnlySchools
    .filter((row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)))
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-COVER-MISSING-ENDLINE:${row.schoolId}`,
        entityType: "school",
        entityId: String(row.schoolId),
        ruleCode: "EDU-COVER-MISSING-ENDLINE",
        severity: "high",
        message: `School ${row.schoolId} has baseline assessments but no endline session.`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const districtCoverageRows = db
    .prepare(
      `
      WITH school_counts AS (
        SELECT COALESCE(district, 'Unknown') AS district, COUNT(*) AS totalSchools
        FROM schools_directory
        GROUP BY COALESCE(district, 'Unknown')
      ),
      assessed_counts AS (
        SELECT COALESCE(sd.district, 'Unknown') AS district, COUNT(DISTINCT s.school_id) AS assessedSchools
        FROM assessment_sessions s
        JOIN schools_directory sd ON sd.id = s.school_id
        GROUP BY COALESCE(sd.district, 'Unknown')
      )
      SELECT
        sc.district,
        sc.totalSchools,
        COALESCE(ac.assessedSchools, 0) AS assessedSchools
      FROM school_counts sc
      LEFT JOIN assessed_counts ac ON ac.district = sc.district
      `,
    )
    .all() as Array<{ district: string; totalSchools: number; assessedSchools: number }>;

  const coveredDistricts = districtCoverageRows
    .filter((row) => {
      if (scopeType === "country") {
        return true;
      }
      if (scopeType === "district") {
        return row.district.toLowerCase() === scopeId.toLowerCase();
      }
      const matchingSchools = schools.filter(
        (school) => school.district.toLowerCase() === row.district.toLowerCase(),
      );
      return matchingSchools.length > 0;
    })
    .filter((row) => row.totalSchools > 0);

  coveredDistricts.forEach((row) => {
    const coveragePct = toPercent(Number(row.assessedSchools), Number(row.totalSchools));
    if (coveragePct < 50) {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-COVER-LOWDIST:${row.district}`,
        entityType: "district",
        entityId: row.district,
        ruleCode: "EDU-COVER-LOWDIST",
        severity: coveragePct < 30 ? "high" : "medium",
        message: `District ${row.district} assessment coverage is low (${coveragePct}%).`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    }
  });

  const evaluationIntegrity = db
    .prepare(
      `
      SELECT id AS evaluationId, school_id AS schoolId
      FROM lesson_evaluations
      WHERE status = 'active'
        AND (length(trim(COALESCE(teacher_uid, ''))) = 0 OR length(trim(COALESCE(grade, ''))) = 0)
      `,
    )
    .all() as Array<{ evaluationId: number; schoolId: number }>;

  evaluationIntegrity
    .filter((row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)))
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-EVAL-INTEGRITY:${row.evaluationId}`,
        entityType: "teacher_evaluation",
        entityId: String(row.evaluationId),
        ruleCode: "EDU-EVAL-INTEGRITY",
        severity: "high",
        message: `Teacher evaluation ${row.evaluationId} is missing teacher_id or class observed grade.`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const storyIntegrity = db
    .prepare(
      `
      SELECT id AS storyId, school_id AS schoolId
      FROM story_library
      WHERE publish_status = 'published'
        AND (school_id IS NULL OR school_id = 0)
      `,
    )
    .all() as Array<{ storyId: number; schoolId: number | null }>;

  storyIntegrity
    .filter((row) => {
      if (scopeType === "country") {
        return true;
      }
      if (!row.schoolId) {
        return true;
      }
      return schoolIdSet.has(Number(row.schoolId));
    })
    .forEach((row) => {
      upsertException({
        fingerprint: `${scopeType}:${scopeId}:EDU-STORY-INTEGRITY:${row.storyId}`,
        entityType: "story",
        entityId: String(row.storyId),
        ruleCode: "EDU-STORY-INTEGRITY",
        severity: "medium",
        message: `Published story ${row.storyId} is missing school linkage.`,
        scopeType,
        scopeId,
        periodKey,
        sourceRunId: runId,
      });
    });

  const recentFluency = db
    .prepare(
      `
      SELECT
        r.learner_uid AS learnerUid,
        s.school_id AS schoolId,
        s.assessment_date AS assessmentDate,
        COALESCE(r.computed_level_band, CASE
          WHEN COALESCE(r.fluency_score, 0) <= 0 THEN 0
          WHEN r.fluency_score <= 19 THEN 1
          WHEN r.fluency_score <= 39 THEN 2
          WHEN r.fluency_score <= 59 THEN 3
          ELSE 4
        END) AS band,
        r.fluency_score AS fluency
      FROM assessment_session_results r
      JOIN assessment_sessions s ON s.id = r.assessment_session_id
      WHERE length(trim(COALESCE(r.learner_uid, ''))) > 0
      ORDER BY r.learner_uid ASC, s.assessment_date ASC
      `,
    )
    .all() as Array<{
    learnerUid: string;
    schoolId: number;
    assessmentDate: string;
    band: number;
    fluency: number | null;
  }>;

  const lastByLearner = new Map<string, { schoolId: number; fluency: number | null }>();
  recentFluency.forEach((row) => {
    if (scopeType !== "country" && !schoolIdSet.has(Number(row.schoolId))) {
      return;
    }
    const key = row.learnerUid.trim();
    if (!key) {
      return;
    }
    const prev = lastByLearner.get(key);
    if (prev) {
      const delta = Math.abs(Number(row.fluency ?? 0) - Number(prev.fluency ?? 0));
      if (delta > 80) {
        upsertException({
          fingerprint: `${scopeType}:${scopeId}:EDU-OUT-CWPMJUMP:${key}:${row.assessmentDate}`,
          entityType: "assessment_result",
          entityId: key,
          ruleCode: "EDU-OUT-CWPMJUMP",
          severity: "medium",
          message: `Learner ${key} has an extreme fluency jump (${delta} cwpm).`,
          scopeType,
          scopeId,
          periodKey,
          sourceRunId: runId,
        });
      }
    }
    lastByLearner.set(key, {
      schoolId: Number(row.schoolId),
      fluency: row.fluency,
    });
  });

  const schoolsTotal = schools.length;
  const schoolsWithBaseline = db
    .prepare(
      `
      SELECT COUNT(DISTINCT s.school_id) AS total
      FROM assessment_sessions s
      WHERE s.assessment_type = 'baseline'
      `,
    )
    .get() as { total: number };

  const schoolsWithEndline = db
    .prepare(
      `
      SELECT COUNT(DISTINCT s.school_id) AS total
      FROM assessment_sessions s
      WHERE s.assessment_type = 'endline'
      `,
    )
    .get() as { total: number };

  const sessionCount = filteredSessions.length;
  const missingSessionFields = filteredSessions.filter(
    (row) => !stripText(row.classGrade) || !stripText(row.toolVersion),
  ).length;

  const missingScoreCount = missingScores.filter(
    (row) => scopeType === "country" || schoolIdSet.has(Number(row.schoolId)),
  ).length;

  const learnerRowsCount = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM assessment_session_results r
      JOIN assessment_sessions s ON s.id = r.assessment_session_id
      `,
    )
    .get() as { total: number };

  const completenessPct =
    sessionCount + Number(learnerRowsCount?.total ?? 0) > 0
      ? Number(
        (
          100 -
          ((missingSessionFields + missingScoreCount) /
            (sessionCount + Number(learnerRowsCount?.total ?? 0))) *
            100
        ).toFixed(1),
      )
      : 100;

  const districtsLowCoverage = coveredDistricts.filter(
    (row) => toPercent(Number(row.assessedSchools), Number(row.totalSchools)) < 50,
  ).length;

  const exceptionCounts = summarizeOpenExceptions(scopeType, scopeId);

  db.prepare(
    `
    INSERT INTO edu_data_quality_summary (
      scope_type,
      scope_id,
      period_key,
      completeness_pct,
      coverage_json,
      exception_counts_json,
      last_updated
    ) VALUES (
      @scopeType,
      @scopeId,
      @periodKey,
      @completenessPct,
      @coverageJson,
      @exceptionCountsJson,
      @lastUpdated
    )
    ON CONFLICT(scope_type, scope_id, period_key) DO UPDATE SET
      completeness_pct = excluded.completeness_pct,
      coverage_json = excluded.coverage_json,
      exception_counts_json = excluded.exception_counts_json,
      last_updated = excluded.last_updated
    `,
  ).run({
    scopeType,
    scopeId,
    periodKey,
    completenessPct: Math.max(0, Math.min(100, completenessPct)),
    coverageJson: JSON.stringify({
      schoolsTotal,
      schoolsWithBaseline: Number(schoolsWithBaseline?.total ?? 0),
      schoolsWithEndline: Number(schoolsWithEndline?.total ?? 0),
      schoolsMissingEndline: Math.max(0, schoolsTotal - Number(schoolsWithEndline?.total ?? 0)),
      districtsLowCoverage,
    }),
    exceptionCountsJson: JSON.stringify(exceptionCounts),
    lastUpdated: new Date().toISOString(),
  });

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "run_edu_data_quality_sweep",
    "edu_audit_exceptions",
    null,
    `Executed education data quality sweep for ${scopeType}/${scopeId}. Run: ${runId}.`,
  );

  return {
    runId,
    periodKey,
    scopeType,
    scopeId,
    completenessPct: Math.max(0, Math.min(100, completenessPct)),
    exceptionCounts,
  };
}

export function listEducationAuditExceptions(filters?: {
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
  status?: "open" | "resolved" | "overridden";
  severity?: "low" | "medium" | "high";
  ruleCode?: string;
  limit?: number;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const clauses: string[] = ["1=1"];
  const params: Record<string, string | number> = {};

  if (filters?.scopeType) {
    clauses.push("scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeId?.trim()) {
    clauses.push("scope_id = @scopeId");
    params.scopeId = filters.scopeId.trim();
  }
  if (filters?.status) {
    clauses.push("status = @status");
    params.status = filters.status;
  }
  if (filters?.severity) {
    clauses.push("severity = @severity");
    params.severity = filters.severity;
  }
  if (filters?.ruleCode?.trim()) {
    clauses.push("rule_code = @ruleCode");
    params.ruleCode = filters.ruleCode.trim();
  }

  const limit = Math.max(1, Math.min(filters?.limit ?? 400, 2000));
  const rows = db
    .prepare(
      `
      SELECT
        exception_id AS exceptionId,
        entity_type AS entityType,
        entity_id AS entityId,
        rule_code AS ruleCode,
        severity,
        message,
        status,
        scope_type AS scopeType,
        scope_id AS scopeId,
        period_key AS periodKey,
        created_at AS createdAt,
        resolved_at AS resolvedAt,
        resolved_by AS resolvedBy,
        resolution_notes AS resolutionNotes
      FROM edu_audit_exceptions
      WHERE ${clauses.join(" AND ")}
      ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
               CASE status WHEN 'open' THEN 0 WHEN 'overridden' THEN 1 ELSE 2 END,
               created_at DESC,
               exception_id DESC
      LIMIT ${limit}
      `,
    )
    .all(params) as Array<{
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
  }>;

  return rows.map((row) => ({
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
    resolvedBy: row.resolvedBy === null ? null : Number(row.resolvedBy),
    resolutionNotes: row.resolutionNotes,
  })) as EducationAuditExceptionRecord[];
}

export function resolveEducationAuditException(args: {
  user: Pick<PortalUser, "id" | "fullName" | "isSuperAdmin">;
  exceptionId: number;
  status: "resolved" | "overridden";
  notes: string;
}) {
  ensureNationalIntelligenceSchema();
  if (!stripText(args.notes)) {
    throw new Error("Resolution notes are required.");
  }
  if (args.status === "overridden" && !args.user.isSuperAdmin) {
    throw new Error("Only Super Admin can override education audit exceptions.");
  }

  const db = getDb();
  const result = db
    .prepare(
      `
      UPDATE edu_audit_exceptions
      SET
        status = @status,
        resolved_by = @resolvedBy,
        resolved_at = datetime('now'),
        resolution_notes = @notes
      WHERE exception_id = @exceptionId
      `,
    )
    .run({
      status: args.status,
      resolvedBy: args.user.id,
      notes: stripText(args.notes),
      exceptionId: args.exceptionId,
    });

  if (Number(result.changes ?? 0) <= 0) {
    throw new Error("Audit exception not found.");
  }

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    args.status === "overridden" ? "override" : "resolve",
    "edu_audit_exceptions",
    args.exceptionId,
    stripText(args.notes),
  );
}

export function listDataQualitySummaries(filters?: {
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
  periodKey?: string;
  limit?: number;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const clauses: string[] = ["1=1"];
  const params: Record<string, string> = {};

  if (filters?.scopeType) {
    clauses.push("scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeId?.trim()) {
    clauses.push("scope_id = @scopeId");
    params.scopeId = filters.scopeId.trim();
  }
  if (filters?.periodKey?.trim()) {
    clauses.push("period_key = @periodKey");
    params.periodKey = filters.periodKey.trim();
  }

  const limit = Math.max(1, Math.min(filters?.limit ?? 200, 1000));
  const rows = db
    .prepare(
      `
      SELECT
        scope_type AS scopeType,
        scope_id AS scopeId,
        period_key AS periodKey,
        completeness_pct AS completenessPct,
        coverage_json AS coverageJson,
        exception_counts_json AS exceptionCountsJson,
        last_updated AS lastUpdated
      FROM edu_data_quality_summary
      WHERE ${clauses.join(" AND ")}
      ORDER BY last_updated DESC
      LIMIT ${limit}
      `,
    )
    .all(params) as Array<{
    scopeType: NlisGeoScopeType;
    scopeId: string;
    periodKey: string;
    completenessPct: number;
    coverageJson: string;
    exceptionCountsJson: string;
    lastUpdated: string;
  }>;

  return rows.map((row) => ({
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    periodKey: row.periodKey,
    completenessPct: Number(row.completenessPct ?? 0),
    coverageIndicators: parseJsonObject<DataQualityCenterSummaryRecord["coverageIndicators"]>(
      row.coverageJson,
      {
        schoolsTotal: 0,
        schoolsWithBaseline: 0,
        schoolsWithEndline: 0,
        schoolsMissingEndline: 0,
        districtsLowCoverage: 0,
      },
    ),
    exceptionCounts: parseJsonObject<DataQualityCenterSummaryRecord["exceptionCounts"]>(
      row.exceptionCountsJson,
      { open: 0, high: 0, medium: 0, low: 0 },
    ),
    lastUpdated: row.lastUpdated,
  })) as DataQualityCenterSummaryRecord[];
}

export function assignPriorityQueueItem(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  schoolId: number;
  periodKey?: string;
  ownerUserId: number;
  notes?: string;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const periodKey = stripText(args.periodKey ?? "") || currentPeriodKey();

  db.prepare(
    `
      INSERT INTO edu_priority_queue_assignments (
        school_id,
        period_key,
        owner_user_id,
        notes,
        assigned_at
      ) VALUES (
        @schoolId,
        @periodKey,
        @ownerUserId,
        @notes,
        datetime('now')
      )
      ON CONFLICT(school_id, period_key) DO UPDATE SET
        owner_user_id = excluded.owner_user_id,
        notes = excluded.notes,
        assigned_at = excluded.assigned_at
      `,
  ).run({
    schoolId: args.schoolId,
    periodKey,
    ownerUserId: args.ownerUserId,
    notes: stripText(args.notes ?? "") || null,
  });

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "assign",
    "edu_priority_queue_assignments",
    args.schoolId,
    `Assigned priority queue school ${args.schoolId} to user ${args.ownerUserId}.`,
  );
}

export function getNationalInsights(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const periodStart = normalizeDate(args.periodStart ?? "", `${new Date().getUTCFullYear()}-01-01`);
  const periodEnd = normalizeDate(args.periodEnd ?? "", new Date().toISOString().slice(0, 10));
  const schools = listSchoolsForScope(args.scopeType, args.scopeId);

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
    } as NationalInsightWidgetData;
  }

  const placeholders = schoolIds.map((_, index) => `@s${index}`).join(",");
  const params: Record<string, number | string> = {
    periodStart,
    periodEnd,
  };
  schoolIds.forEach((schoolId, index) => {
    params[`s${index}`] = schoolId;
  });

  const resultRows = db
    .prepare(
      `
      SELECT
        s.school_id AS schoolId,
        s.assessment_type AS assessmentType,
        s.assessment_date AS assessmentDate,
        COALESCE(r.comprehension_score, 0) AS comprehensionScore,
        COALESCE(r.computed_level_band, CASE
          WHEN COALESCE(r.fluency_score, 0) <= 0 THEN 0
          WHEN r.fluency_score <= 19 THEN 1
          WHEN r.fluency_score <= 39 THEN 2
          WHEN r.fluency_score <= 59 THEN 3
          ELSE 4
        END) AS band
      FROM assessment_sessions s
      JOIN assessment_session_results r ON r.assessment_session_id = s.id
      WHERE s.school_id IN (${placeholders})
        AND s.assessment_date >= @periodStart
        AND s.assessment_date <= @periodEnd
      ORDER BY s.assessment_date ASC, r.id ASC
      `,
    )
    .all(params) as Array<{
    schoolId: number;
    assessmentType: "baseline" | "progress" | "endline";
    assessmentDate: string;
    comprehensionScore: number | null;
    band: number;
  }>;

  const baselineRows = resultRows.filter((row) => row.assessmentType === "baseline");
  const latestRows =
    resultRows.filter((row) => row.assessmentType === "endline").length > 0
      ? resultRows.filter((row) => row.assessmentType === "endline")
      : resultRows;

  const baselineDist = computeDistribution(
    baselineRows.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore })),
  );
  const latestDist = computeDistribution(
    latestRows.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore })),
  );

  const movement = {
    nonReaderReductionPct: Number(
      (baselineDist.nonReadersPct - latestDist.nonReadersPct).toFixed(1),
    ),
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
    const baseline = baselineRows.filter((row) => Number(row.schoolId) === Number(school.schoolId));
    const latest = latestRows.filter((row) => Number(row.schoolId) === Number(school.schoolId));
    if (baseline.length > 0) {
      schoolBaseline.set(
        Number(school.schoolId),
        computeDistribution(
          baseline.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore })),
        ),
      );
    }
    if (latest.length > 0) {
      schoolLatest.set(
        Number(school.schoolId),
        computeDistribution(
          latest.map((row) => ({ band: Number(row.band), comprehensionScore: row.comprehensionScore })),
        ),
      );
    }
  });

  const cohortTracking = schools
    .map((school) => {
      const baseline = schoolBaseline.get(Number(school.schoolId));
      const latest = schoolLatest.get(Number(school.schoolId));
      if (!baseline || !latest) {
        return null;
      }
      return {
        schoolId: Number(school.schoolId),
        schoolName: school.schoolName,
        baselineAt20PlusPct: baseline.at20PlusPct,
        latestAt20PlusPct: latest.at20PlusPct,
        deltaPct: Number((latest.at20PlusPct - baseline.at20PlusPct).toFixed(1)),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number((right?.deltaPct ?? 0) - (left?.deltaPct ?? 0)))
    .slice(0, 60) as NationalInsightWidgetData["cohortTracking"];

  const coachingVisitsRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM coaching_visits
      WHERE school_id IN (${placeholders})
        AND visit_date >= @periodStart
        AND visit_date <= @periodEnd
      `,
    )
    .get(params) as { total: number };

  const teachingScores = db
    .prepare(
      `
      SELECT
        school_id AS schoolId,
        lesson_date AS lessonDate,
        overall_score AS overallScore
      FROM lesson_evaluations
      WHERE school_id IN (${placeholders})
        AND status = 'active'
        AND lesson_date >= @periodStart
        AND lesson_date <= @periodEnd
      ORDER BY lesson_date ASC, id ASC
      `,
    )
    .all(params) as Array<{ schoolId: number; lessonDate: string; overallScore: number }>;

  const teachingAvgLatestPct =
    teachingScores.length > 0
      ? Number(
        (
          teachingScores.reduce((sum, row) => sum + (Number(row.overallScore ?? 0) / 4) * 100, 0) /
          teachingScores.length
        ).toFixed(1),
      )
      : 0;

  const teachingBySchool = new Map<number, number[]>();
  teachingScores.forEach((row) => {
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

  const materialsCoverageRow = db
    .prepare(
      `
      SELECT COUNT(DISTINCT school_id) AS coveredSchools
      FROM material_distributions
      WHERE school_id IN (${placeholders})
        AND date >= @periodStart
        AND date <= @periodEnd
      `,
    )
    .get(params) as { coveredSchools: number };

  const storyParticipationRow = db
    .prepare(
      `
      SELECT COUNT(DISTINCT school_id) AS schools
      FROM story_activities
      WHERE school_id IN (${placeholders})
        AND date >= @periodStart
        AND date <= @periodEnd
      `,
    )
    .get(params) as { schools: number };

  const qualitySummary = listDataQualitySummaries({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodKey: currentPeriodKey(),
    limit: 1,
  })[0] ?? {
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

  const coachingFrequencyPerSchool = Number(
    (Number(coachingVisitsRow?.total ?? 0) / Math.max(1, schools.length)).toFixed(2),
  );

  const alignedDrivers = {
    coachingFrequencyPerSchool,
    teachingQualityLatestPct: teachingAvgLatestPct,
    teachingQualityDeltaPct:
      teachingDeltaN > 0 ? Number((teachingDeltaAccum / teachingDeltaN).toFixed(1)) : 0,
    materialsCoveragePct: toPercent(Number(materialsCoverageRow?.coveredSchools ?? 0), schools.length),
    storyParticipationPct: toPercent(Number(storyParticipationRow?.schools ?? 0), schools.length),
    disclaimer: "Aligned trends; association not causation.",
  };

  const assignmentRows = getDb()
    .prepare(
      `
      SELECT
        a.school_id AS schoolId,
        a.period_key AS periodKey,
        a.owner_user_id AS ownerUserId,
        pu.full_name AS ownerName,
        a.assigned_at AS assignedAt,
        a.notes
      FROM edu_priority_queue_assignments a
      LEFT JOIN portal_users pu ON pu.id = a.owner_user_id
      WHERE a.period_key = @periodKey
      `,
    )
    .all({ periodKey: currentPeriodKey() }) as Array<{
    schoolId: number;
    periodKey: string;
    ownerUserId: number;
    ownerName: string | null;
    assignedAt: string;
    notes: string | null;
  }>;

  const assignmentBySchool = new Map<number, (typeof assignmentRows)[number]>();
  assignmentRows.forEach((row) => {
    assignmentBySchool.set(Number(row.schoolId), row);
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
      const at20PlusDeltaPct = baseline
        ? Number((latest.at20PlusPct - baseline.at20PlusPct).toFixed(1))
        : 0;

      const schoolTeachingScores = teachingBySchool.get(schoolId) ?? [];
      const schoolTeachingLatestPct =
        schoolTeachingScores.length > 0
          ? Number(((Number(schoolTeachingScores[schoolTeachingScores.length - 1]) / 4) * 100).toFixed(1))
          : teachingAvgLatestPct;

      const schoolVisits = db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM coaching_visits
          WHERE school_id = @schoolId
            AND visit_date >= @periodStart
            AND visit_date <= @periodEnd
          `,
        )
        .get({
          schoolId,
          periodStart,
          periodEnd,
        }) as { total: number };

      const coachingCoveragePct = Number(
        (Math.min(1, Number(schoolVisits?.total ?? 0)) * 100).toFixed(1),
      );

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
  } as NationalInsightWidgetData;
}

export function listInterventionPlans(filters?: {
  scopeType?: "school" | "district";
  scopeId?: string;
  status?: InterventionPlanRecord["status"];
  limit?: number;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const clauses: string[] = ["1=1"];
  const params: Record<string, string> = {};

  if (filters?.scopeType) {
    clauses.push("p.scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeId?.trim()) {
    clauses.push("p.scope_id = @scopeId");
    params.scopeId = filters.scopeId.trim();
  }
  if (filters?.status) {
    clauses.push("p.status = @status");
    params.status = filters.status;
  }

  const limit = Math.max(1, Math.min(filters?.limit ?? 300, 1000));
  const rows = db
    .prepare(
      `
      SELECT
        p.plan_id AS planId,
        p.scope_type AS scopeType,
        p.scope_id AS scopeId,
        p.school_id AS schoolId,
        p.district,
        p.title,
        p.status,
        p.target_metrics_json AS targetMetricsJson,
        p.start_date AS startDate,
        p.end_date AS endDate,
        p.notes,
        p.created_by AS createdBy,
        pu.full_name AS createdByName,
        p.created_at AS createdAt,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completedActions,
        COUNT(a.action_id) AS totalActions
      FROM intervention_plan p
      LEFT JOIN intervention_actions a ON a.plan_id = p.plan_id
      LEFT JOIN portal_users pu ON pu.id = p.created_by
      WHERE ${clauses.join(" AND ")}
      GROUP BY p.plan_id
      ORDER BY p.created_at DESC, p.plan_id DESC
      LIMIT ${limit}
      `,
    )
    .all(params) as Array<{
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
    createdByName: string;
    createdAt: string;
    completedActions: number;
    totalActions: number;
  }>;

  return rows.map((row) => ({
    planId: Number(row.planId),
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    schoolId: row.schoolId === null ? null : Number(row.schoolId),
    district: row.district,
    title: row.title,
    status: row.status,
    targetMetrics: parseJsonObject<Record<string, number | string>>(row.targetMetricsJson, {}),
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
    createdBy: Number(row.createdBy),
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    completedActions: Number(row.completedActions ?? 0),
    totalActions: Number(row.totalActions ?? 0),
  })) as InterventionPlanRecord[];
}

export function createInterventionPlan(args: {
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
  ensureNationalIntelligenceSchema();
  const db = getDb();

  const insert = db
    .prepare(
      `
      INSERT INTO intervention_plan (
        scope_type,
        scope_id,
        school_id,
        district,
        title,
        created_by,
        created_at,
        status,
        target_metrics_json,
        start_date,
        end_date,
        notes
      ) VALUES (
        @scopeType,
        @scopeId,
        @schoolId,
        @district,
        @title,
        @createdBy,
        datetime('now'),
        @status,
        @targetMetrics,
        @startDate,
        @endDate,
        @notes
      )
      `,
    )
    .run({
      scopeType: args.input.scopeType,
      scopeId: stripText(args.input.scopeId),
      schoolId: args.input.schoolId ?? null,
      district: stripText(args.input.district ?? "") || null,
      title: stripText(args.input.title),
      createdBy: args.user.id,
      status: args.input.status ?? "planned",
      targetMetrics: JSON.stringify(args.input.targetMetrics ?? {}),
      startDate: args.input.startDate ? stripText(args.input.startDate) : null,
      endDate: args.input.endDate ? stripText(args.input.endDate) : null,
      notes: stripText(args.input.notes ?? "") || null,
    });

  const planId = Number(insert.lastInsertRowid);

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "create",
    "intervention_plan",
    planId,
    `Created intervention plan ${stripText(args.input.title)}.`,
  );

  return listInterventionPlans({ limit: 1 }).find((plan) => plan.planId === planId) ?? null;
}

export function createInterventionPlanFromPriority(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  item: {
    schoolId: number;
    schoolName: string;
    district: string;
    metrics: NationalPriorityQueueItem["metrics"];
    recommendedIntervention: NationalPriorityQueueItem["recommendedIntervention"];
  };
}) {
  return createInterventionPlan({
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

export function addInterventionAction(args: {
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
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const insert = db
    .prepare(
      `
      INSERT INTO intervention_actions (
        plan_id,
        action_type,
        owner_user_id,
        due_date,
        status,
        visit_id,
        training_id,
        assessment_id,
        story_activity_id,
        outcome_notes,
        created_at,
        updated_at
      ) VALUES (
        @planId,
        @actionType,
        @ownerUserId,
        @dueDate,
        @status,
        @visitId,
        @trainingId,
        @assessmentId,
        @storyActivityId,
        @outcomeNotes,
        datetime('now'),
        datetime('now')
      )
      `,
    )
    .run({
      planId: args.input.planId,
      actionType: args.input.actionType,
      ownerUserId: args.input.ownerUserId,
      dueDate: args.input.dueDate ? stripText(args.input.dueDate) : null,
      status: args.input.status ?? "planned",
      visitId: args.input.visitId ?? null,
      trainingId: args.input.trainingId ?? null,
      assessmentId: args.input.assessmentId ?? null,
      storyActivityId: args.input.storyActivityId ?? null,
      outcomeNotes: stripText(args.input.outcomeNotes ?? "") || null,
    });

  const actionId = Number(insert.lastInsertRowid);

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "create",
    "intervention_actions",
    actionId,
    `Added intervention action ${args.input.actionType} to plan ${args.input.planId}.`,
  );

  return actionId;
}

export function updateInterventionAction(args: {
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
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const patch: string[] = [];
  const params: Record<string, string | number | null> = {
    actionId: args.actionId,
  };

  if (typeof args.input.ownerUserId === "number") {
    patch.push("owner_user_id = @ownerUserId");
    params.ownerUserId = args.input.ownerUserId;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "dueDate")) {
    patch.push("due_date = @dueDate");
    params.dueDate = args.input.dueDate ? stripText(args.input.dueDate) : null;
  }
  if (args.input.status) {
    patch.push("status = @status");
    params.status = args.input.status;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "visitId")) {
    patch.push("visit_id = @visitId");
    params.visitId = args.input.visitId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "trainingId")) {
    patch.push("training_id = @trainingId");
    params.trainingId = args.input.trainingId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "assessmentId")) {
    patch.push("assessment_id = @assessmentId");
    params.assessmentId = args.input.assessmentId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "storyActivityId")) {
    patch.push("story_activity_id = @storyActivityId");
    params.storyActivityId = args.input.storyActivityId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(args.input, "outcomeNotes")) {
    patch.push("outcome_notes = @outcomeNotes");
    params.outcomeNotes = stripText(args.input.outcomeNotes ?? "") || null;
  }

  if (patch.length === 0) {
    return;
  }

  patch.push("updated_at = datetime('now')");
  const result = db
    .prepare(`UPDATE intervention_actions SET ${patch.join(", ")} WHERE action_id = @actionId`)
    .run(params);

  if (Number(result.changes ?? 0) <= 0) {
    throw new Error("Intervention action not found.");
  }

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "update",
    "intervention_actions",
    args.actionId,
    "Updated intervention action.",
  );
}

export function listInterventionActions(planId: number) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        a.action_id AS actionId,
        a.plan_id AS planId,
        a.action_type AS actionType,
        a.owner_user_id AS ownerUserId,
        pu.full_name AS ownerUserName,
        a.due_date AS dueDate,
        a.status,
        a.visit_id AS visitId,
        a.training_id AS trainingId,
        a.assessment_id AS assessmentId,
        a.story_activity_id AS storyActivityId,
        a.outcome_notes AS outcomeNotes,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt
      FROM intervention_actions a
      LEFT JOIN portal_users pu ON pu.id = a.owner_user_id
      WHERE a.plan_id = @planId
      ORDER BY CASE a.status
        WHEN 'in_progress' THEN 0
        WHEN 'planned' THEN 1
        WHEN 'paused' THEN 2
        ELSE 3
      END,
      a.due_date ASC,
      a.action_id DESC
      `,
    )
    .all({ planId }) as Array<{
    actionId: number;
    planId: number;
    actionType: InterventionActionRecord["actionType"];
    ownerUserId: number;
    ownerUserName: string;
    dueDate: string | null;
    status: InterventionActionRecord["status"];
    visitId: number | null;
    trainingId: number | null;
    assessmentId: number | null;
    storyActivityId: number | null;
    outcomeNotes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;

  return rows.map((row) => ({
    actionId: Number(row.actionId),
    planId: Number(row.planId),
    actionType: row.actionType,
    ownerUserId: Number(row.ownerUserId),
    ownerUserName: row.ownerUserName,
    dueDate: row.dueDate,
    status: row.status,
    visitId: row.visitId === null ? null : Number(row.visitId),
    trainingId: row.trainingId === null ? null : Number(row.trainingId),
    assessmentId: row.assessmentId === null ? null : Number(row.assessmentId),
    storyActivityId: row.storyActivityId === null ? null : Number(row.storyActivityId),
    outcomeNotes: row.outcomeNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })) as InterventionActionRecord[];
}

function computeInterventionCoverage(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const db = getDb();
  const scope = rangeFromScope(args.scopeType, args.scopeId);

  const schoolCount = db
    .prepare(
      `SELECT COUNT(*) AS total FROM schools_directory sd WHERE ${scope.where}`,
    )
    .get(scope.params) as { total: number };

  const plansCount = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM intervention_plan p
      WHERE (
        (@scopeType = 'country')
        OR (p.scope_type = @scopeType AND p.scope_id = @scopeId)
      )
      `,
    )
    .get({
      scopeType: args.scopeType,
      scopeId: args.scopeId,
    }) as { total: number };

  const actions = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM intervention_actions
      `,
    )
    .get() as { total: number; completed: number };

  return {
    schoolsTotal: Number(schoolCount?.total ?? 0),
    plansTotal: Number(plansCount?.total ?? 0),
    actionsTotal: Number(actions?.total ?? 0),
    actionsCompleted: Number(actions?.completed ?? 0),
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  };
}

function buildNationalReportFacts(args: {
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const insights = getNationalInsights({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  });

  const qualitySummary = listDataQualitySummaries({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodKey: currentPeriodKey(),
    limit: 1,
  })[0] ?? null;

  const interventions = computeInterventionCoverage({
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

  const n = {
    schoolsInScope: listSchoolsForScope(args.scopeType, args.scopeId).length,
    movementSampleSize: insights.movement.sampleSize,
  };

  return {
    factsVersion: REPORT_FACTS_VERSION,
    preset: args.preset,
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    n,
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

export async function generateNationalReportPack(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  ensureNationalIntelligenceSchema();

  const periodStart = normalizeDate(args.periodStart ?? "", `${new Date().getUTCFullYear()}-01-01`);
  const periodEnd = normalizeDate(args.periodEnd ?? "", new Date().toISOString().slice(0, 10));
  const facts = buildNationalReportFacts({
    preset: args.preset,
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart,
    periodEnd,
  });

  const aiNarrative = await aiNarrativeFromFacts(facts);
  const reportCode = generateReportCode();

  const narrative = {
    factsPass: facts,
    narrativePass: {
      summary: aiNarrative.summary,
      movement: aiNarrative.movement,
      priorityActions: aiNarrative.priorityActions,
      interventions: aiNarrative.interventions,
      methodology: aiNarrative.methodology,
      references: aiNarrative.references,
    },
    generatedWithAi: aiNarrative.generatedWithAi,
  };

  const htmlReport = buildNationalReportHtml({
    preset: args.preset,
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart,
    periodEnd,
    facts,
    narrative: narrative.narrativePass,
  });

  const pdfBytes = await generateNationalReportPdf({
    reportCode,
    title: `${args.preset} — ${args.scopeType}:${args.scopeId}`,
    periodStart,
    periodEnd,
    narrative: narrative.narrativePass,
  });
  const pdfPath = await saveNationalReportPdf(reportCode, pdfBytes);

  if (isPostgresConfigured()) {
    const now = new Date().toISOString();
    const insert = await queryPostgres<{ reportId: number }>(
      `
        INSERT INTO national_report_packs (
          report_code,
          preset,
          scope_type,
          scope_id,
          period_start,
          period_end,
          facts_json,
          narrative_json,
          html_report,
          pdf_stored_path,
          generated_by_user_id,
          generated_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz
        )
        RETURNING report_id AS "reportId"
      `,
      [
        reportCode,
        args.preset,
        args.scopeType,
        args.scopeId,
        periodStart,
        periodEnd,
        JSON.stringify(facts),
        JSON.stringify(narrative),
        htmlReport,
        pdfPath,
        args.user.id,
        now,
        now,
      ],
    );
    const reportId = Number(insert.rows[0]?.reportId ?? 0);

    await queryPostgres(
      `
        INSERT INTO audit_logs (
          user_id, user_name, action, target_table, target_id, detail
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        args.user.id,
        args.user.fullName,
        "generate_national_report_pack",
        "national_report_packs",
        String(reportId),
        `Generated ${args.preset} for ${args.scopeType}/${args.scopeId}.`,
      ],
    );

    const report = await getNationalReportPackByIdAsync(reportId);
    if (!report) {
      throw new Error("Generated report pack could not be reloaded.");
    }
    return report;
  }

  const db = getDb();
  const insert = db
    .prepare(
      `
      INSERT INTO national_report_packs (
        report_code,
        preset,
        scope_type,
        scope_id,
        period_start,
        period_end,
        facts_json,
        narrative_json,
        html_report,
        pdf_stored_path,
        generated_by_user_id,
        generated_at,
        updated_at
      ) VALUES (
        @reportCode,
        @preset,
        @scopeType,
        @scopeId,
        @periodStart,
        @periodEnd,
        @factsJson,
        @narrativeJson,
        @htmlReport,
        @pdfPath,
        @generatedBy,
        datetime('now'),
        datetime('now')
      )
      `,
    )
    .run({
      reportCode,
      preset: args.preset,
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      periodStart,
      periodEnd,
      factsJson: JSON.stringify(facts),
      narrativeJson: JSON.stringify(narrative),
      htmlReport,
      pdfPath,
      generatedBy: args.user.id,
    });

  const reportId = Number(insert.lastInsertRowid);

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "generate_national_report_pack",
    "national_report_packs",
    reportId,
    `Generated ${args.preset} for ${args.scopeType}/${args.scopeId}.`,
  );

  const report = listNationalReportPacks({ limit: 1 }).find((item) => item.reportId === reportId);
  if (!report) {
    throw new Error("Generated report pack could not be reloaded.");
  }
  return report;
}

export function listNationalReportPacks(filters?: {
  preset?: NationalReportPreset;
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
  limit?: number;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const clauses: string[] = ["1=1"];
  const params: Record<string, string> = {};

  if (filters?.preset) {
    clauses.push("n.preset = @preset");
    params.preset = filters.preset;
  }
  if (filters?.scopeType) {
    clauses.push("n.scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeId?.trim()) {
    clauses.push("n.scope_id = @scopeId");
    params.scopeId = filters.scopeId.trim();
  }

  const limit = Math.max(1, Math.min(filters?.limit ?? 120, 500));
  const rows = db
    .prepare(
      `
      SELECT
        n.report_id AS reportId,
        n.report_code AS reportCode,
        n.preset,
        n.scope_type AS scopeType,
        n.scope_id AS scopeId,
        n.period_start AS periodStart,
        n.period_end AS periodEnd,
        n.facts_json AS factsJson,
        n.narrative_json AS narrativeJson,
        n.html_report AS htmlReport,
        n.pdf_stored_path AS pdfPath,
        n.generated_by_user_id AS generatedByUserId,
        COALESCE(pu.full_name, 'Unknown') AS generatedByName,
        n.generated_at AS generatedAt,
        n.updated_at AS updatedAt
      FROM national_report_packs n
      LEFT JOIN portal_users pu ON pu.id = n.generated_by_user_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY n.generated_at DESC, n.report_id DESC
      LIMIT ${limit}
      `,
    )
    .all(params) as Array<{
    reportId: number;
    reportCode: string;
    preset: string;
    scopeType: string;
    scopeId: string;
    periodStart: string;
    periodEnd: string;
    factsJson: string;
    narrativeJson: string;
    htmlReport: string;
    pdfPath: string | null;
    generatedByUserId: number;
    generatedByName: string;
    generatedAt: string;
    updatedAt: string;
  }>;

  return rows.map((row) => toReportRecord(row));
}

async function getNationalReportPackByIdAsync(reportId: number) {
  if (!isPostgresConfigured()) {
    return listNationalReportPacks({ limit: 1 }).find((item) => item.reportId === reportId) ?? null;
  }

  const result = await queryPostgres<{
    reportId: number;
    reportCode: string;
    preset: string;
    scopeType: string;
    scopeId: string;
    periodStart: string;
    periodEnd: string;
    factsJson: string;
    narrativeJson: string;
    htmlReport: string;
    pdfPath: string | null;
    generatedByUserId: number;
    generatedByName: string;
    generatedAt: string;
    updatedAt: string;
  }>(
    `
      SELECT
        n.report_id AS "reportId",
        n.report_code AS "reportCode",
        n.preset,
        n.scope_type AS "scopeType",
        n.scope_id AS "scopeId",
        n.period_start AS "periodStart",
        n.period_end AS "periodEnd",
        n.facts_json AS "factsJson",
        n.narrative_json AS "narrativeJson",
        n.html_report AS "htmlReport",
        n.pdf_stored_path AS "pdfPath",
        n.generated_by_user_id AS "generatedByUserId",
        COALESCE(pu.full_name, 'Unknown') AS "generatedByName",
        n.generated_at::text AS "generatedAt",
        n.updated_at::text AS "updatedAt"
      FROM national_report_packs n
      LEFT JOIN portal_users pu ON pu.id = n.generated_by_user_id
      WHERE n.report_id = $1
      LIMIT 1
    `,
    [reportId],
  );
  return result.rows[0] ? toReportRecord(result.rows[0]) : null;
}

export async function listNationalReportPacksAsync(filters?: {
  preset?: NationalReportPreset;
  scopeType?: NlisGeoScopeType;
  scopeId?: string;
  limit?: number;
}) {
  if (!isPostgresConfigured()) {
    return listNationalReportPacks(filters);
  }

  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters?.preset) {
    params.push(filters.preset);
    clauses.push(`n.preset = $${params.length}`);
  }
  if (filters?.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`n.scope_type = $${params.length}`);
  }
  if (filters?.scopeId?.trim()) {
    params.push(filters.scopeId.trim());
    clauses.push(`n.scope_id = $${params.length}`);
  }

  const limit = Math.max(1, Math.min(filters?.limit ?? 120, 500));
  const result = await queryPostgres<{
    reportId: number;
    reportCode: string;
    preset: string;
    scopeType: string;
    scopeId: string;
    periodStart: string;
    periodEnd: string;
    factsJson: string;
    narrativeJson: string;
    htmlReport: string;
    pdfPath: string | null;
    generatedByUserId: number;
    generatedByName: string;
    generatedAt: string;
    updatedAt: string;
  }>(
    `
      SELECT
        n.report_id AS "reportId",
        n.report_code AS "reportCode",
        n.preset,
        n.scope_type AS "scopeType",
        n.scope_id AS "scopeId",
        n.period_start AS "periodStart",
        n.period_end AS "periodEnd",
        n.facts_json AS "factsJson",
        n.narrative_json AS "narrativeJson",
        n.html_report AS "htmlReport",
        n.pdf_stored_path AS "pdfPath",
        n.generated_by_user_id AS "generatedByUserId",
        COALESCE(pu.full_name, 'Unknown') AS "generatedByName",
        n.generated_at::text AS "generatedAt",
        n.updated_at::text AS "updatedAt"
      FROM national_report_packs n
      LEFT JOIN portal_users pu ON pu.id = n.generated_by_user_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY n.generated_at DESC, n.report_id DESC
      LIMIT ${limit}
    `,
    params,
  );

  return result.rows.map((row) => toReportRecord(row));
}

export async function getNationalReportPdf(reportCode: string) {
  ensureNationalIntelligenceSchema();
  const report = (await listNationalReportPacksAsync({ limit: 500 })).find(
    (item) => item.reportCode === reportCode,
  );
  if (!report) {
    return null;
  }

  if (report.pdfPath) {
    try {
      const bytes = await fs.readFile(report.pdfPath);
      return {
        bytes,
        fileName: `${reportCode}.pdf`,
      };
    } catch {
      // Fall through to regenerate from stored report data below.
    }
  }

  const regeneratedBytes = await generateNationalReportPdf({
    reportCode,
    title: `${report.preset} — ${report.scopeType}:${report.scopeId}`,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    narrative: report.narrative.narrativePass,
  });
  const regeneratedPath = await saveNationalReportPdf(reportCode, regeneratedBytes);
  if (isPostgresConfigured()) {
    await queryPostgres(
      `
        UPDATE national_report_packs
        SET pdf_stored_path = $2,
            updated_at = $3::timestamptz
        WHERE report_code = $1
      `,
      [reportCode, regeneratedPath, new Date().toISOString()],
    );
  } else {
    getDb().prepare(
      `
        UPDATE national_report_packs
        SET pdf_stored_path = @pdfPath,
            updated_at = @updatedAt
        WHERE report_code = @reportCode
      `,
    ).run({
      reportCode,
      pdfPath: regeneratedPath,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    bytes: Buffer.from(regeneratedBytes),
    fileName: `${reportCode}.pdf`,
  };
}

export function createPartnerApiClient(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    partnerName: string;
    allowedScopeType: NlisGeoScopeType;
    allowedScopeIds: string[];
  };
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();

  const partnerName = stripText(args.input.partnerName);
  if (!partnerName) {
    throw new Error("Partner name is required.");
  }

  const scopeIds = args.input.allowedScopeIds
    .map((scopeId) => stripText(scopeId))
    .filter(Boolean);
  if (scopeIds.length === 0) {
    throw new Error("At least one allowed scope id is required.");
  }

  const rawApiKey = `ozk_${crypto.randomBytes(24).toString("hex")}`;
  const apiKeyHash = hashPartnerApiKey(rawApiKey);

  const insert = db
    .prepare(
      `
      INSERT INTO partner_api_clients (
        partner_name,
        api_key_hash,
        allowed_scope_type,
        allowed_scope_ids_json,
        active,
        created_by,
        created_at
      ) VALUES (
        @partnerName,
        @apiKeyHash,
        @allowedScopeType,
        @allowedScopeIds,
        1,
        @createdBy,
        datetime('now')
      )
      `,
    )
    .run({
      partnerName,
      apiKeyHash,
      allowedScopeType: args.input.allowedScopeType,
      allowedScopeIds: JSON.stringify(scopeIds),
      createdBy: args.user.id,
    });

  const clientId = Number(insert.lastInsertRowid);

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "create",
    "partner_api_clients",
    clientId,
    `Created partner API client for ${partnerName}.`,
  );

  return {
    clientId,
    apiKey: rawApiKey,
  };
}

export async function createPartnerApiClientAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    partnerName: string;
    allowedScopeType: NlisGeoScopeType;
    allowedScopeIds: string[];
  };
}) {
  if (!isPostgresConfigured()) {
    return createPartnerApiClient(args);
  }

  const partnerName = stripText(args.input.partnerName);
  if (!partnerName) {
    throw new Error("Partner name is required.");
  }

  const scopeIds = args.input.allowedScopeIds.map((scopeId) => stripText(scopeId)).filter(Boolean);
  if (scopeIds.length === 0) {
    throw new Error("At least one allowed scope id is required.");
  }

  const rawApiKey = `ozk_${crypto.randomBytes(24).toString("hex")}`;
  const apiKeyHash = hashPartnerApiKey(rawApiKey);

  const insert = await queryPostgres<{ clientId: number }>(
    `
      INSERT INTO partner_api_clients (
        partner_name,
        api_key_hash,
        allowed_scope_type,
        allowed_scope_ids_json,
        active,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, TRUE, $5, NOW()
      )
      RETURNING client_id AS "clientId"
    `,
    [partnerName, apiKeyHash, args.input.allowedScopeType, JSON.stringify(scopeIds), args.user.id],
  );

  const clientId = Number(insert.rows[0]?.clientId ?? 0);
  await queryPostgres(
    `
      INSERT INTO audit_logs (
        user_id, user_name, action, target_table, target_id, detail
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      args.user.id,
      args.user.fullName,
      "create",
      "partner_api_clients",
      String(clientId),
      `Created partner API client for ${partnerName}.`,
    ],
  );

  return {
    clientId,
    apiKey: rawApiKey,
  };
}

export function listPartnerApiClients() {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        client_id AS clientId,
        partner_name AS partnerName,
        allowed_scope_type AS allowedScopeType,
        allowed_scope_ids_json AS allowedScopeIdsJson,
        active,
        created_by AS createdBy,
        created_at AS createdAt,
        last_used_at AS lastUsedAt
      FROM partner_api_clients
      ORDER BY created_at DESC, client_id DESC
      `,
    )
    .all() as Array<{
    clientId: number;
    partnerName: string;
    allowedScopeType: NlisGeoScopeType;
    allowedScopeIdsJson: string;
    active: number;
    createdBy: number;
    createdAt: string;
    lastUsedAt: string | null;
  }>;

  return rows.map((row) => ({
    clientId: Number(row.clientId),
    partnerName: row.partnerName,
    allowedScopeType: row.allowedScopeType,
    allowedScopeIds: parseJsonObject<string[]>(row.allowedScopeIdsJson, []),
    active: Number(row.active) === 1,
    createdBy: Number(row.createdBy),
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  })) as PartnerApiClientRecord[];
}

export async function listPartnerApiClientsAsync() {
  if (!isPostgresConfigured()) {
    return listPartnerApiClients();
  }

  const result = await queryPostgres<{
    clientId: number;
    partnerName: string;
    allowedScopeType: NlisGeoScopeType;
    allowedScopeIdsJson: string;
    active: boolean;
    createdBy: number;
    createdAt: string;
    lastUsedAt: string | null;
  }>(
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
      ORDER BY created_at DESC, client_id DESC
    `,
  );

  return result.rows.map((row) => ({
    clientId: Number(row.clientId),
    partnerName: row.partnerName,
    allowedScopeType: row.allowedScopeType,
    allowedScopeIds: parseJsonObject<string[]>(row.allowedScopeIdsJson, []),
    active: Boolean(row.active),
    createdBy: Number(row.createdBy),
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  })) as PartnerApiClientRecord[];
}

export function setPartnerApiClientActive(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  clientId: number;
  active: boolean;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const result = db
    .prepare("UPDATE partner_api_clients SET active = @active WHERE client_id = @clientId")
    .run({
      active: args.active ? 1 : 0,
      clientId: args.clientId,
    });

  if (Number(result.changes ?? 0) <= 0) {
    throw new Error("Partner API client not found.");
  }

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    args.active ? "enable" : "disable",
    "partner_api_clients",
    args.clientId,
    `Set partner API client active=${args.active ? "true" : "false"}.`,
  );
}

export async function setPartnerApiClientActiveAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  clientId: number;
  active: boolean;
}) {
  if (!isPostgresConfigured()) {
    setPartnerApiClientActive(args);
    return;
  }

  const result = await queryPostgres<{ clientId: number }>(
    `
      UPDATE partner_api_clients
      SET active = $2
      WHERE client_id = $1
      RETURNING client_id AS "clientId"
    `,
    [args.clientId, args.active],
  );

  if (!result.rows[0]?.clientId) {
    throw new Error("Partner API client not found.");
  }

  await queryPostgres(
    `
      INSERT INTO audit_logs (
        user_id, user_name, action, target_table, target_id, detail
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      args.user.id,
      args.user.fullName,
      args.active ? "enable" : "disable",
      "partner_api_clients",
      String(args.clientId),
      `Set partner API client active=${args.active ? "true" : "false"}.`,
    ],
  );
}

export function authenticatePartnerApiKey(rawKey: string) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  const apiKeyHash = hashPartnerApiKey(stripText(rawKey));

  const row = db
    .prepare(
      `
      SELECT
        client_id AS clientId,
        partner_name AS partnerName,
        allowed_scope_type AS allowedScopeType,
        allowed_scope_ids_json AS allowedScopeIdsJson,
        active,
        created_by AS createdBy,
        created_at AS createdAt,
        last_used_at AS lastUsedAt
      FROM partner_api_clients
      WHERE api_key_hash = @apiKeyHash
      LIMIT 1
      `,
    )
    .get({ apiKeyHash }) as {
    clientId: number;
    partnerName: string;
    allowedScopeType: NlisGeoScopeType;
    allowedScopeIdsJson: string;
    active: number;
    createdBy: number;
    createdAt: string;
    lastUsedAt: string | null;
  } | undefined;

  if (!row || Number(row.active) !== 1) {
    return null;
  }

  db.prepare("UPDATE partner_api_clients SET last_used_at = datetime('now') WHERE client_id = @clientId").run({
    clientId: row.clientId,
  });

  return {
    clientId: Number(row.clientId),
    partnerName: row.partnerName,
    allowedScopeType: row.allowedScopeType,
    allowedScopeIds: parseJsonObject<string[]>(row.allowedScopeIdsJson, []),
  };
}

export async function authenticatePartnerApiKeyAsync(rawKey: string) {
  if (!isPostgresConfigured()) {
    return authenticatePartnerApiKey(rawKey);
  }

  const apiKeyHash = hashPartnerApiKey(stripText(rawKey));
  const result = await queryPostgres<{
    clientId: number;
    partnerName: string;
    allowedScopeType: NlisGeoScopeType;
    allowedScopeIdsJson: string;
    active: boolean;
    createdBy: number;
    createdAt: string;
    lastUsedAt: string | null;
  }>(
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
      WHERE api_key_hash = $1
      LIMIT 1
    `,
    [apiKeyHash],
  );

  const row = result.rows[0];
  if (!row || !row.active) {
    return null;
  }

  await queryPostgres(
    `UPDATE partner_api_clients SET last_used_at = NOW() WHERE client_id = $1`,
    [row.clientId],
  );

  return {
    clientId: Number(row.clientId),
    partnerName: row.partnerName,
    allowedScopeType: row.allowedScopeType,
    allowedScopeIds: parseJsonObject<string[]>(row.allowedScopeIdsJson, []),
  };
}

export function assertPartnerScopeAllowed(args: {
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
}

export function logPartnerExport(args: {
  clientId: number | null;
  partnerName: string;
  endpoint: string;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  format: "json" | "csv" | "pdf";
  actorUserId?: number | null;
}) {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  db.prepare(
    `
      INSERT INTO partner_export_audit_logs (
        client_id,
        partner_name,
        endpoint,
        scope_type,
        scope_id,
        format,
        actor_user_id,
        created_at
      ) VALUES (
        @clientId,
        @partnerName,
        @endpoint,
        @scopeType,
        @scopeId,
        @format,
        @actorUserId,
        datetime('now')
      )
      `,
  ).run({
    clientId: args.clientId,
    partnerName: stripText(args.partnerName),
    endpoint: stripText(args.endpoint),
    scopeType: args.scopeType,
    scopeId: stripText(args.scopeId),
    format: args.format,
    actorUserId: args.actorUserId ?? null,
  });
}

export async function logPartnerExportAsync(args: {
  clientId: number | null;
  partnerName: string;
  endpoint: string;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  format: "json" | "csv" | "pdf";
  actorUserId?: number | null;
}) {
  if (!isPostgresConfigured()) {
    logPartnerExport(args);
    return;
  }

  await queryPostgres(
    `
      INSERT INTO partner_export_audit_logs (
        client_id,
        partner_name,
        endpoint,
        scope_type,
        scope_id,
        format,
        actor_user_id,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      )
    `,
    [
      args.clientId,
      stripText(args.partnerName),
      stripText(args.endpoint),
      args.scopeType,
      stripText(args.scopeId),
      args.format,
      args.actorUserId ?? null,
    ],
  );
}

export function getPartnerImpactDataset(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  ensureNationalIntelligenceSchema();
  const insights = getNationalInsights({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  });

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

export function getPartnerReportsDataset(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  ensureNationalIntelligenceSchema();
  const reports = listNationalReportPacks({
    scopeType: args.scopeType,
    scopeId: args.scopeId,
    limit: 50,
  });

  return reports.map((report) => ({
    reportCode: report.reportCode,
    preset: report.preset,
    scopeType: report.scopeType,
    scopeId: report.scopeId,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    generatedAt: report.generatedAt,
    generatedByName: report.generatedByName,
    pdfUrl: report.pdfPath
      ? `/api/portal/national-intelligence/reports/${encodeURIComponent(report.reportCode)}/pdf`
      : null,
  }));
}

export function buildPartnerImpactCsv(data: ReturnType<typeof getPartnerImpactDataset>) {
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

  data.priorityQueue.forEach((item) => {
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
    ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`);
    lines.push(cells.join(","));
  });

  return lines.join("\n");
}

export function getScopeHierarchyLabel(args: { scopeType: NlisGeoScopeType; scopeId: string }) {
  if (args.scopeType === "country") {
    return "Country (Uganda)";
  }
  if (args.scopeType === "region") {
    return `Region: ${args.scopeId}`;
  }
  if (args.scopeType === "sub_region") {
    return `Sub-region: ${args.scopeId}`;
  }
  if (args.scopeType === "district") {
    return `District: ${args.scopeId}`;
  }
  if (args.scopeType === "sub_county") {
    return `Sub-county: ${args.scopeId}`;
  }
  if (args.scopeType === "parish") {
    return `Parish: ${args.scopeId}`;
  }
  return `School ID: ${args.scopeId}`;
}

export function runNationalNightlyJobs(args: {
  user: Pick<PortalUser, "id" | "fullName">;
}) {
  ensureNationalIntelligenceSchema();

  const sweep = runEducationDataQualitySweep({
    user: args.user,
    scopeType: "country",
    scopeId: "Uganda",
  });
  const insights = getNationalInsights({
    scopeType: "country",
    scopeId: "Uganda",
    periodStart: `${new Date().getUTCFullYear()}-01-01`,
    periodEnd: new Date().toISOString().slice(0, 10),
  });

  logAuditEvent(
    args.user.id,
    args.user.fullName,
    "run_nlis_nightly_jobs",
    "edu_data_quality_summary",
    null,
    `Nightly NLIS jobs executed for Uganda. Open exceptions: ${sweep.exceptionCounts.open}. Priority queue size: ${insights.priorityQueue.length}.`,
  );

  return {
    sweep,
    priorityQueueCount: insights.priorityQueue.length,
    generatedAt: new Date().toISOString(),
  };
}

export function listPortalUsersForAssignments() {
  ensureNationalIntelligenceSchema();
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        id,
        full_name AS fullName,
        role,
        is_admin AS isAdmin,
        is_superadmin AS isSuperAdmin
      FROM portal_users
      WHERE role IN ('Staff', 'Admin') OR is_admin = 1 OR is_superadmin = 1
      ORDER BY is_superadmin DESC, is_admin DESC, full_name ASC
      `,
    )
    .all() as Array<{
    id: number;
    fullName: string;
    role: string;
    isAdmin: number;
    isSuperAdmin: number;
  }>;
}

export function listInterventionActionTypes() {
  return [
    "Remedial & Catch-up program",
    "Teacher coaching cycle",
    "Teacher catch-up training",
    "Leadership mentoring",
    "Assessment support",
    "1001 Story activation/publishing support",
  ] as InterventionActionRecord["actionType"][];
}

export function listNationalReportPresets() {
  return [
    "National Quarterly Snapshot",
    "District Literacy Brief",
    "School Coaching Pack",
    "Annual National Report",
  ] as NationalReportPreset[];
}

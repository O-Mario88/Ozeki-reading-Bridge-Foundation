import { queryPostgres, requirePostgresConfigured } from "@/lib/server/postgres/client";
import type {
  TrainingReportArtifactRecord,
  TrainingReportFacts,
  TrainingReportNarrative,
  TrainingReportScopeType,
} from "@/lib/types";

export type TrainingReportArtifactRow = {
  id: number;
  report_code: string;
  scope_type: string;
  scope_value: string;
  period_start: string;
  period_end: string;
  facts_json: string;
  narrative_json: string;
  html_report: string;
  pdf_stored_path: string | null;
  generated_by_user_id: number;
  generated_at: string;
  updated_at: string;
  generated_by_name?: string;
};

const SELECT_ARTIFACT_COLUMNS = `
  tra.id,
  tra.report_code AS "reportCode",
  tra.scope_type AS "scopeType",
  tra.scope_value AS "scopeValue",
  tra.period_start AS "periodStart",
  tra.period_end AS "periodEnd",
  tra.facts_json AS "factsJson",
  tra.narrative_json AS "narrativeJson",
  tra.html_report AS "htmlReport",
  tra.pdf_stored_path AS "pdfStoredPath",
  tra.generated_by_user_id AS "generatedByUserId",
  pu.full_name AS "generatedByName",
  tra.generated_at::text AS "generatedAt",
  tra.updated_at::text AS "updatedAt"
`;

function mapArtifactRow(row: any): TrainingReportArtifactRecord {
  // We use any for row here because it's the raw result from queryPostgres which is an object with snake_case or camelCase depending on the query.
  // The SELECT_ARTIFACT_COLUMNS uses camelCase aliases, so row will have properties like reportCode, factsJson, etc.
  return {
    id: Number(row.id),
    reportCode: row.reportCode,
    scopeType: row.scopeType as TrainingReportScopeType,
    scopeValue: row.scopeValue,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    facts: (typeof row.factsJson === "string" ? JSON.parse(row.factsJson) : row.factsJson) as TrainingReportFacts,
    narrative: (typeof row.narrativeJson === "string" ? JSON.parse(row.narrativeJson) : row.narrativeJson) as TrainingReportNarrative,
    htmlReport: row.htmlReport,
    pdfStoredPath: row.pdfStoredPath ?? null,
    generatedByUserId: Number(row.generatedByUserId),
    generatedByName: row.generatedByName || "Unknown",
    generatedAt: row.generatedAt,
    updatedAt: row.updatedAt,
  };
}

export async function insertTrainingReportArtifactPostgres(input: {
  reportCode: string;
  scopeType: string;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  facts: TrainingReportFacts;
  narrative: TrainingReportNarrative;
  htmlReport: string;
  pdfStoredPath: string | null;
  userId: number;
}) {
  requirePostgresConfigured();
  const now = new Date().toISOString();
  const result = await queryPostgres<{ id: number }>(
    `
      INSERT INTO training_report_artifacts (
        report_code,
        scope_type,
        scope_value,
        period_start,
        period_end,
        facts_json,
        narrative_json,
        html_report,
        pdf_stored_path,
        generated_by_user_id,
        generated_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `,
    [
      input.reportCode,
      input.scopeType,
      input.scopeValue,
      input.periodStart,
      input.periodEnd,
      JSON.stringify(input.facts),
      JSON.stringify(input.narrative),
      input.htmlReport,
      input.pdfStoredPath,
      input.userId,
      now,
      now,
    ]
  );
  return Number(result.rows[0]?.id ?? 0);
}

export async function getTrainingReportArtifactByCodePostgres(reportCode: string): Promise<TrainingReportArtifactRecord | null> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT ${SELECT_ARTIFACT_COLUMNS}
      FROM training_report_artifacts tra
      LEFT JOIN portal_users pu ON pu.id = tra.generated_by_user_id
      WHERE tra.report_code = $1
      LIMIT 1
    `,
    [reportCode]
  );
  if (!result.rows[0]) return null;
  return mapArtifactRow(result.rows[0]);
}

export async function listTrainingReportArtifactsPostgres(filters: {
  scopeType?: TrainingReportScopeType;
  scopeValue?: string;
  limit?: number;
} = {}): Promise<TrainingReportArtifactRecord[]> {
  requirePostgresConfigured();
  const params: unknown[] = [];
  const clauses: string[] = [];
  const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 500);

  if (filters.scopeType) {
    params.push(filters.scopeType);
    clauses.push(`tra.scope_type = $${params.length}`);
  }
  if (filters.scopeValue) {
    params.push(filters.scopeValue);
    clauses.push(`tra.scope_value = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT ${SELECT_ARTIFACT_COLUMNS}
      FROM training_report_artifacts tra
      LEFT JOIN portal_users pu ON pu.id = tra.generated_by_user_id
      ${whereClause}
      ORDER BY tra.generated_at DESC, tra.id DESC
      LIMIT ${limit}
    `,
    params
  );
  return result.rows.map(mapArtifactRow);
}

// Data fetching helper for training facts
export type TrainingSessionRow = {
  id: number;
  date: string;
  schoolId: number | null;
  schoolName: string;
  district: string;
  region: string;
  subRegion: string;
  followUpDate: string | null;
  followUpType: string | null;
  followUpOwnerUserId: number | null;
  followUpOwnerName: string | null;
};

export async function getTrainingSessionsForReportPostgres(whereClauses: string[], params: unknown[]): Promise<TrainingSessionRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        pr.id,
        pr.date::text AS date,
        pr.school_id AS "schoolId",
        COALESCE(sd.name, pr.school_name) AS "schoolName",
        COALESCE(sd.district, pr.district) AS district,
        COALESCE(sd.region, '') AS region,
        COALESCE(sd.sub_region, '') AS "subRegion",
        pr.follow_up_date::text AS "followUpDate",
        pr.follow_up_type AS "followUpType",
        pr.follow_up_owner_user_id AS "followUpOwnerUserId",
        pu.full_name AS "followUpOwnerName"
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      LEFT JOIN portal_users pu ON pu.id = pr.follow_up_owner_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pr.date ASC, pr.id ASC
    `,
    params
  );
  return result.rows as TrainingSessionRow[];
}

export type ParticipantSummaryRow = {
  participantsTotal: number;
  teachersTotal: number;
  leadersTotal: number;
  femaleTotal: number;
  maleTotal: number;
};

export async function getParticipantSummaryForReportPostgres(trainingIds: number[]): Promise<ParticipantSummaryRow> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        COUNT(*)::int AS "participantsTotal",
        COALESCE(SUM(CASE WHEN lower(trim(pta.participant_role)) = 'classroom teacher' THEN 1 ELSE 0 END), 0)::int AS "teachersTotal",
        COALESCE(SUM(CASE WHEN lower(trim(pta.participant_role)) = 'school leader' THEN 1 ELSE 0 END), 0)::int AS "leadersTotal",
        COALESCE(SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'female' THEN 1 ELSE 0 END), 0)::int AS "femaleTotal",
        COALESCE(SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'male' THEN 1 ELSE 0 END), 0)::int AS "maleTotal"
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id = ANY($1::int[])
    `,
    [trainingIds]
  );
  return result.rows[0] as ParticipantSummaryRow;
}

export type LeaderCategoryRow = {
  category: string;
  total: number;
  female: number;
  male: number;
};

export async function getLeadersByCategoryForReportPostgres(trainingIds: number[]): Promise<LeaderCategoryRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        COALESCE(sc.category, 'School Leader') AS category,
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'female' THEN 1 ELSE 0 END), 0)::int AS female,
        COALESCE(SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'male' THEN 1 ELSE 0 END), 0)::int AS male
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id = ANY($1::int[])
        AND lower(trim(pta.participant_role)) = 'school leader'
      GROUP BY COALESCE(sc.category, 'School Leader')
      ORDER BY total DESC, category ASC
    `,
    [trainingIds]
  );
  return result.rows as LeaderCategoryRow[];
}

export type TeacherBreakdownRow = {
  classTaught?: string;
  subjectTaught?: string;
  total: number;
};

export async function getTeacherByClassForReportPostgres(trainingIds: number[]): Promise<TeacherBreakdownRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        COALESCE(NULLIF(trim(sc.class_taught), ''), 'Not specified') AS "classTaught",
        COUNT(*)::int AS total
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id = ANY($1::int[])
        AND lower(trim(pta.participant_role)) = 'classroom teacher'
      GROUP BY COALESCE(NULLIF(trim(sc.class_taught), ''), 'Not specified')
      ORDER BY total DESC, "classTaught" ASC
      LIMIT 20
    `,
    [trainingIds]
  );
  return result.rows as TeacherBreakdownRow[];
}

export async function getTeacherBySubjectForReportPostgres(trainingIds: number[]): Promise<TeacherBreakdownRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        COALESCE(NULLIF(trim(sc.subject_taught), ''), 'Not specified') AS "subjectTaught",
        COUNT(*)::int AS total
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id = ANY($1::int[])
        AND lower(trim(pta.participant_role)) = 'classroom teacher'
      GROUP BY COALESCE(NULLIF(trim(sc.subject_taught), ''), 'Not specified')
      ORDER BY total DESC, "subjectTaught" ASC
      LIMIT 20
    `,
    [trainingIds]
  );
  return result.rows as TeacherBreakdownRow[];
}

export type GeographyBreakdownRow = {
  region: string;
  subRegion: string;
  district: string;
  trainingsCount: number;
  schoolsCount: number;
  participantsCount: number;
};

export async function getGeographyBreakdownForReportPostgres(trainingIds: number[]): Promise<GeographyBreakdownRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        COALESCE(sd.region, '') AS region,
        COALESCE(sd.sub_region, '') AS "subRegion",
        COALESCE(sd.district, pr.district) AS district,
        COUNT(DISTINCT pr.id)::int AS "trainingsCount",
        COUNT(DISTINCT pr.school_id)::int AS "schoolsCount",
        COUNT(pta.id)::int AS "participantsCount"
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      LEFT JOIN portal_training_attendance pta ON pta.portal_record_id = pr.id
      WHERE pr.id = ANY($1::int[])
      GROUP BY COALESCE(sd.region, ''), COALESCE(sd.sub_region, ''), COALESCE(sd.district, pr.district)
      ORDER BY "trainingsCount" DESC, district ASC
    `,
    [trainingIds]
  );
  return result.rows as GeographyBreakdownRow[];
}

export type TrainingFeedbackRow = {
  feedbackRole: "participant" | "trainer";
  whatWentWell: string | null;
  howTrainingChangedTeaching: string | null;
  whatYouWillDoToImproveReadingLevels: string | null;
  challenges: string | null;
  recommendationsNextTraining: string | null;
};

export async function getTrainingFeedbackForReportPostgres(trainingIds: number[]): Promise<TrainingFeedbackRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        tf.feedback_role AS "feedbackRole",
        tf.what_went_well AS "whatWentWell",
        tf.how_training_changed_teaching AS "howTrainingChangedTeaching",
        tf.what_you_will_do_to_improve_reading_levels AS "whatYouWillDoToImproveReadingLevels",
        tf.challenges,
        tf.recommendations_next_training AS "recommendationsNextTraining"
      FROM training_feedback_entries tf
      WHERE tf.training_record_id = ANY($1::int[])
    `,
    [trainingIds]
  );
  return result.rows as TrainingFeedbackRow[];
}

export type ApprovedQuoteRow = {
  quote: string;
  role: string | null;
  district: string | null;
  schoolName: string | null;
};

export async function getApprovedQuotesForReportPostgres(trainingIds: number[]): Promise<ApprovedQuoteRow[]> {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT
        pt.story_text AS quote,
        pt.storyteller_role AS role,
        pt.district,
        pt.school_name AS "schoolName"
      FROM portal_testimonials pt
      WHERE pt.source_training_record_id = ANY($1::int[])
        AND pt.source_type = 'training_feedback'
        AND COALESCE(pt.moderation_status, 'approved') = 'approved'
      ORDER BY pt.created_at DESC, pt.id DESC
      LIMIT 20
    `,
    [trainingIds]
  );
  return result.rows as ApprovedQuoteRow[];
}

export async function getCoachingCountsForReportPostgres(schoolIds: number[], periodStart: string, observedEnd: string) {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT COUNT(*)::int AS total
      FROM coaching_visits
      WHERE school_id = ANY($1::int[])
        AND visit_date >= $2::date
        AND visit_date <= $3::date
    `,
    [schoolIds, periodStart, observedEnd]
  );
  return Number(result.rows[0]?.total ?? 0);
}

export async function getAssessmentCountsForReportPostgres(schoolIds: number[], periodStart: string, observedEnd: string) {
  requirePostgresConfigured();
  const result = await queryPostgres(
    `
      SELECT COUNT(*)::int AS total
      FROM assessment_sessions
      WHERE school_id = ANY($1::int[])
        AND assessment_date >= $2::date
        AND assessment_date <= $3::date
    `,
    [schoolIds, periodStart, observedEnd]
  );
  return Number(result.rows[0]?.total ?? 0);
}

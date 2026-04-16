import type {
  SchoolAccountProfile,
  SchoolAccountRecentItem,
  SchoolContactInput,
  SchoolContactRecord,
  SchoolDirectoryRecord,
  SchoolLearnerInput,
  SchoolLearnerRecord,
} from "@/lib/types";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import { randomUUID } from "node:crypto";

export type SchoolDirectoryFilters = {
  district?: string;
  query?: string;
  scopedDistrict?: string;
};

function asNullableString(value: unknown) {
  return value === null || value === undefined || String(value).trim() === ""
    ? null
    : String(value);
}

function asNullableNumber(value: unknown) {
  return value === null || value === undefined || value === "" ? null : Number(value);
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }
  return fallback;
}

function normalizeSchoolRecord(row: Record<string, unknown>): SchoolDirectoryRecord {
  const id = Number(row.id);
  return {
    id,
    schoolUid: String(row.schoolUid ?? "").trim() || `sch-pg-${id}`,
    schoolCode: String(row.schoolCode ?? ""),
    name: String(row.name ?? ""),
    country: String(row.country ?? "Uganda"),
    region: String(row.region ?? ""),
    subRegion: String(row.subRegion ?? ""),
    district: String(row.district ?? ""),
    subCounty: String(row.subCounty ?? ""),
    parish: String(row.parish ?? ""),
    village: asNullableString(row.village),
    alternateSchoolNames: asNullableString(row.alternateSchoolNames),
    schoolStatus: String(row.schoolStatus ?? "Open"),
    schoolStatusDate: asNullableString(row.schoolStatusDate),
    currentPartnerType: String(row.currentPartnerType ?? "NA"),
    yearFounded: asNullableNumber(row.yearFounded),

    clientSchoolNumber: Number(row.clientSchoolNumber ?? 0),
    metricCount: Number(row.metricCount ?? 0),
    runningTotalMaxEnrollment: Number(row.runningTotalMaxEnrollment ?? 0),
    currentPartnerSchool: asBoolean(row.currentPartnerSchool),
    schoolActive: asBoolean(row.schoolActive, true),
    enrollmentTotal: Number(row.enrollmentTotal ?? 0),
    enrollmentByGrade: asNullableString(row.enrollmentByGrade),
    enrolledBoys: Number(row.enrolledBoys ?? 0),
    enrolledGirls: Number(row.enrolledGirls ?? 0),
    enrolledLearners: Number(row.enrolledLearners ?? 0),
    directImpactLearners: Number(row.directImpactLearners ?? 0),
    classesJson: asNullableString(row.classesJson),
    enrolledBaby: Number(row.enrolledBaby ?? 0),
    enrolledMiddle: Number(row.enrolledMiddle ?? 0),
    enrolledTop: Number(row.enrolledTop ?? 0),
    enrolledP1: Number(row.enrolledP1 ?? 0),
    enrolledP2: Number(row.enrolledP2 ?? 0),
    enrolledP3: Number(row.enrolledP3 ?? 0),
    enrolledP4: Number(row.enrolledP4 ?? 0),
    enrolledP5: Number(row.enrolledP5 ?? 0),
    enrolledP6: Number(row.enrolledP6 ?? 0),
    enrolledP7: Number(row.enrolledP7 ?? 0),
    contactName: asNullableString(row.contactName),
    contactPhone: asNullableString(row.contactPhone),
    contactEmail: asNullableString(row.contactEmail),
    primaryContactId:
      row.primaryContactId === null || row.primaryContactId === undefined ? null : Number(row.primaryContactId),
    primaryContactName: asNullableString(row.primaryContactName),
    primaryContactCategory: row.primaryContactCategory
      ? (String(row.primaryContactCategory) as SchoolDirectoryRecord["primaryContactCategory"])
      : null,
    programStatus: String(row.programStatus ?? "active") as SchoolDirectoryRecord["programStatus"],
    graduatedAt: asNullableString(row.graduatedAt),
    graduatedByUserId:
      row.graduatedByUserId === null || row.graduatedByUserId === undefined ? null : Number(row.graduatedByUserId),
    graduationNotes: asNullableString(row.graduationNotes),
    graduationVersion: asNullableString(row.graduationVersion),
    createdAt: String(row.createdAt ?? new Date(0).toISOString()),
  };
}

function normalizeSchoolContactCategory(value: unknown): SchoolContactInput["category"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "proprietor" || normalized === "director") return "Proprietor";
  if (normalized === "head teacher" || normalized === "headteacher") return "Head Teacher";
  if (normalized === "deputy head teacher" || normalized === "deputy") return "Deputy Head Teacher";
  if (
    normalized === "head teacher lower" ||
    normalized === "headteacher lower" ||
    normalized === "head teacher lower section"
  ) {
    return "Head Teacher Lower";
  }
  if (normalized === "dos") return "DOS";
  if (normalized === "administrator" || normalized === "admin") return "Administrator";
  if (normalized === "accountant" || normalized === "bursar") return "Accountant";
  return "Teacher";
}

function nullableString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function normalizeSchoolContactRecord(row: Record<string, unknown>): SchoolContactRecord {
  return {
    contactId: Number(row.contactId ?? row.contact_id ?? 0),
    contactUid: String(row.contactUid ?? row.contact_uid ?? ""),
    schoolId: Number(row.schoolId ?? row.school_id ?? 0),
    fullName: String(row.fullName ?? row.full_name ?? ""),
    gender: String(row.gender ?? "Other") as SchoolContactRecord["gender"],
    phone: nullableString(row.phone),
    email: nullableString(row.email),
    whatsapp: nullableString(row.whatsapp),
    category: normalizeSchoolContactCategory(row.category),
    roleTitle: nullableString(row.roleTitle ?? row.role_title),
    isPrimaryContact: asBoolean(row.isPrimaryContact ?? row.is_primary_contact),
    classTaught: nullableString(row.classTaught ?? row.class_taught),
    subjectTaught: nullableString(row.subjectTaught ?? row.subject_taught),
    teacherUid: nullableString(row.teacherUid ?? row.teacher_uid) ?? null,
    contactRecordType: nullableString(row.contactRecordType ?? row.contact_record_type),
    nickname: nullableString(row.nickname),
    leadershipRole: asBoolean(row.leadershipRole ?? row.leadership_role),
    subRole: nullableString(row.subRole ?? row.sub_role),
    roleFormula: nullableString(row.roleFormula ?? row.role_formula),
    lastSsaSent: nullableString(row.lastSsaSent ?? row.last_ssa_sent),
    trainer: asBoolean(row.trainer),
    notes: nullableString(row.notes),
    createdAt: String(row.createdAt ?? row.created_at ?? new Date(0).toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date(0).toISOString()),
  };
}

function normalizeSchoolLearnerRecord(row: Record<string, unknown>): SchoolLearnerRecord {
  return {
    learnerId: Number(row.learnerId ?? row.learner_id ?? 0),
    learnerUid: String(row.learnerUid ?? row.learner_uid ?? ""),
    schoolId: Number(row.schoolId ?? row.school_id ?? 0),
    learnerName: String(row.learnerName ?? row.learner_name ?? ""),
    classGrade: String(row.classGrade ?? row.class_grade ?? ""),
    age: Number(row.age ?? 0),
    gender: String(row.gender ?? "Other") as SchoolLearnerRecord["gender"],
    internalChildId: nullableString(row.internalChildId ?? row.internal_child_id),
    createdAt: String(row.createdAt ?? row.created_at ?? new Date(0).toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date(0).toISOString()),
  };
}

function createGeneratedUid(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

const SCHOOL_SELECT = `
  SELECT
    s.id,
    COALESCE(s.school_uid, '') AS "schoolUid",
    s.school_code AS "schoolCode",
    s.name,
    COALESCE(s.country, 'Uganda') AS country,
    COALESCE(s.region, '') AS region,
    COALESCE(s.sub_region, '') AS "subRegion",
    s.district,
    s.sub_county AS "subCounty",
    s.parish,
    s.village,
    s.alternate_school_names AS "alternateSchoolNames",
    COALESCE(s.school_status, 'Open') AS "schoolStatus",
    s.school_status_date::text AS "schoolStatusDate",
    COALESCE(s.current_partner_type, 'NA') AS "currentPartnerType",
    s.year_founded AS "yearFounded",
    COALESCE(s.client_school_number, 0) AS "clientSchoolNumber",
    COALESCE(s.metric_count, 0) AS "metricCount",
    COALESCE(s.running_total_max_enrollment, 0) AS "runningTotalMaxEnrollment",
    COALESCE(s.current_partner_school, FALSE) AS "currentPartnerSchool",
    COALESCE(s.school_active, TRUE) AS "schoolActive",
    CASE
      WHEN COALESCE(s.enrollment_total, 0) > 0 THEN COALESCE(s.enrollment_total, 0)
      WHEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0) > 0
        THEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0)
      ELSE COALESCE(s.enrolled_learners, 0)
    END AS "enrollmentTotal",
    s.enrollment_by_grade AS "enrollmentByGrade",
    COALESCE(s.enrolled_boys, 0) AS "enrolledBoys",
    COALESCE(s.enrolled_girls, 0) AS "enrolledGirls",
    COALESCE(s.enrolled_baby, 0) AS "enrolledBaby",
    COALESCE(s.enrolled_middle, 0) AS "enrolledMiddle",
    COALESCE(s.enrolled_top, 0) AS "enrolledTop",
    COALESCE(s.enrolled_p1, 0) AS "enrolledP1",
    COALESCE(s.enrolled_p2, 0) AS "enrolledP2",
    COALESCE(s.enrolled_p3, 0) AS "enrolledP3",
    COALESCE(s.enrolled_p4, 0) AS "enrolledP4",
    COALESCE(s.enrolled_p5, 0) AS "enrolledP5",
    COALESCE(s.enrolled_p6, 0) AS "enrolledP6",
    COALESCE(s.enrolled_p7, 0) AS "enrolledP7",
    CASE
      WHEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0) > 0
        THEN COALESCE(s.enrolled_boys, 0) + COALESCE(s.enrolled_girls, 0)
      ELSE COALESCE(s.enrolled_learners, 0)
    END AS "enrolledLearners",
    (
      COALESCE(s.enrolled_baby, 0) +
      COALESCE(s.enrolled_middle, 0) +
      COALESCE(s.enrolled_top, 0) +
      COALESCE(s.enrolled_p1, 0) +
      COALESCE(s.enrolled_p2, 0) +
      COALESCE(s.enrolled_p3, 0)
    ) AS "directImpactLearners",
    s.classes_json AS "classesJson",
    s.contact_name AS "contactName",
    s.contact_phone AS "contactPhone",
    s.contact_email AS "contactEmail",
    s.primary_contact_id AS "primaryContactId",
    sc.full_name AS "primaryContactName",
    sc.category AS "primaryContactCategory",
    COALESCE(s.program_status, 'active') AS "programStatus",
    s.graduated_at::text AS "graduatedAt",
    s.graduated_by_user_id AS "graduatedByUserId",
    s.graduation_notes AS "graduationNotes",
    s.graduation_version AS "graduationVersion",
    s.created_at::text AS "createdAt"
  FROM schools_directory s
  LEFT JOIN school_contacts sc
    ON sc.contact_id = s.primary_contact_id
`;

function mapRecentItem(row: Record<string, unknown>): SchoolAccountRecentItem {
  return {
    id: Number(row.id ?? 0),
    module: String(row.module ?? "training") as SchoolAccountRecentItem["module"],
    title: String(row.title ?? ""),
    subtitle: asNullableString(row.subtitle),
    date: asNullableString(row.date),
    status: asNullableString(row.status),
    href: String(row.href ?? "/portal/schools"),
  };
}

export async function listSchoolDirectoryRecordsPostgres(filters: SchoolDirectoryFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.scopedDistrict) {
    params.push(filters.scopedDistrict);
    clauses.push(`lower(s.district) = lower($${params.length})`);
  }

  if (filters.district) {
    params.push(`%${filters.district.trim()}%`);
    clauses.push(`s.district ILIKE $${params.length}`);
  }

  if (filters.query) {
    params.push(`%${filters.query.trim()}%`);
    const placeholder = `$${params.length}`;
    clauses.push(`(s.name ILIKE ${placeholder} OR s.school_code ILIKE ${placeholder})`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `${SCHOOL_SELECT}
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT 500`,
    params,
  );
  return result.rows.map((row) => normalizeSchoolRecord(row));
}

export async function getSchoolDirectoryRecordPostgres(id: number) {
  const result = await queryPostgres(
    `${SCHOOL_SELECT}
     WHERE s.id = $1
     LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  return row ? normalizeSchoolRecord(row) : null;
}

async function safeQuery<T>(fn: () => Promise<{ rows: T[] }>): Promise<{ rows: T[] }> {
  try {
    return await fn();
  } catch {
    return { rows: [] };
  }
}

export async function getSchoolAccountProfilePostgres(id: number): Promise<SchoolAccountProfile | null> {
  const school = await getSchoolDirectoryRecordPostgres(id);
  if (!school) {
    return null;
  }

  const fyStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const fyLastStart = new Date(new Date().getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
  const fyLastEnd = new Date(new Date().getFullYear() - 1, 11, 31).toISOString().slice(0, 10);


  const [
    contactsResult,
    trainingsResult,
    onlineTrainingsResult,
    visitsResult,
    assessmentsResult,
    evaluationsResult,
    summaryResult,
    progressResult,
    trainingRowsResult,
    onlineRowsResult,
    interactionRowsResult,
    contactsList,
  ] = await Promise.all([
    queryPostgres<{ total: number }>(`SELECT COUNT(*)::int AS total FROM school_contacts WHERE school_id = $1`, [id]),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM portal_records WHERE module = 'training' AND school_id = $1`,
      [id],
    ),
    safeQuery(() => queryPostgres<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT DISTINCT ots.id
          FROM online_training_sessions ots
          LEFT JOIN online_training_participants otp ON otp.session_id = ots.id
          WHERE otp.school_id = $1
             OR (ots.scope_type = 'school' AND ots.scope_id = $1)
        ) scoped
      `,
      [id],
    )),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM coaching_visits WHERE school_id = $1`,
      [id],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM assessment_sessions WHERE school_id = $1`,
      [id],
    ),
    queryPostgres<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM lesson_evaluations WHERE school_id = $1 AND status != 'void'`,
      [id],
    ),
    queryPostgres<{
      dateOfLastActivity: string | null;
      dateOfLastStaffVisit: string | null;
      lastMetricsDate: string | null;
      schoolVisitsThisFy: number;
      schoolVisitsLastFy: number;
    }>(
      `
        SELECT
          GREATEST(
            COALESCE((SELECT MAX(pr.date)::text FROM portal_records pr WHERE pr.school_id = $1), ''),
            COALESCE((SELECT MAX(cv.visit_date)::text FROM coaching_visits cv WHERE cv.school_id = $1), ''),
            COALESCE((SELECT MAX(ses.assessment_date)::text FROM assessment_sessions ses WHERE ses.school_id = $1), ''),
            COALESCE((SELECT MAX(le.lesson_date)::text FROM lesson_evaluations le WHERE le.school_id = $1 AND le.status != 'void'), '')
          ) AS "dateOfLastActivity",
          (
            SELECT MAX(cv.visit_date)::text
            FROM coaching_visits cv
            WHERE cv.school_id = $1
          ) AS "dateOfLastStaffVisit",
          (
            SELECT MAX(ses.assessment_date)::text
            FROM assessment_sessions ses
            WHERE ses.school_id = $1
          ) AS "lastMetricsDate",
          (
            SELECT COUNT(*)::int
            FROM coaching_visits cv
            WHERE cv.school_id = $1
              AND cv.visit_date >= $2::date
          ) AS "schoolVisitsThisFy",
          (
            SELECT COUNT(*)::int
            FROM coaching_visits cv
            WHERE cv.school_id = $1
              AND cv.visit_date >= $3::date
              AND cv.visit_date <= $4::date
          ) AS "schoolVisitsLastFy"
      `,
      [id, fyStart, fyLastStart, fyLastEnd],
    ),
    queryPostgres<{
      learnersAssessed: number;
      storyReadingAvg: number | null;
      comprehensionAvg: number | null;
      onBenchmarkPct: number | null;
      fluentReaderPct: number | null;
      latestReadingStage: string | null;
    }>(
      `
        SELECT
          COUNT(*)::int AS "learnersAssessed",
          ROUND(AVG(COALESCE(story_reading_score, 0))::numeric, 1) AS "storyReadingAvg",
          ROUND(AVG(COALESCE(reading_comprehension_score, 0))::numeric, 1) AS "comprehensionAvg",
          ROUND(
            (
              COUNT(*) FILTER (
                WHERE lower(COALESCE(expected_vs_actual_status, '')) IN ('at_expected', 'above_expected')
              )::numeric / NULLIF(COUNT(*)::numeric, 0)
            ) * 100,
            1
          ) AS "onBenchmarkPct",
          ROUND(
            (
              COUNT(*) FILTER (WHERE COALESCE(computed_level_band, 0) >= 4)::numeric / NULLIF(COUNT(*)::numeric, 0)
            ) * 100,
            1
          ) AS "fluentReaderPct",
          (
            SELECT ar.reading_stage_label
            FROM assessment_records ar
            WHERE ar.school_id = $1
              AND trim(COALESCE(ar.reading_stage_label, '')) <> ''
            ORDER BY ar.assessment_date DESC, ar.id DESC
            LIMIT 1
          ) AS "latestReadingStage"
        FROM assessment_records
        WHERE school_id = $1
      `,
      [id],
    ),
    queryPostgres(
      `
        SELECT
          pr.id,
          'trainings' AS module,
          COALESCE(NULLIF(pr.program_type, ''), 'Training') AS title,
          pr.school_name AS subtitle,
          pr.date::text AS date,
          pr.status,
          '/portal/trainings/' || pr.id AS href
        FROM portal_records pr
        WHERE pr.module = 'training'
          AND pr.school_id = $1
        ORDER BY pr.date DESC, pr.id DESC
        LIMIT 6
      `,
      [id],
    ),
    safeQuery(() => queryPostgres(
      `
        SELECT
          scoped.id,
          'onlineTrainings' AS module,
          scoped.title,
          scoped.audience AS subtitle,
          scoped.session_date AS date,
          scoped.status,
          '/portal/events' AS href
        FROM (
          SELECT DISTINCT
            ots.id,
            ots.title,
            ots.audience,
            ots.start_time::date::text AS session_date,
            ots.status
          FROM online_training_sessions ots
          LEFT JOIN online_training_participants otp ON otp.session_id = ots.id
          WHERE otp.school_id = $1
             OR (ots.scope_type = 'school' AND ots.scope_id = $1)
        ) scoped
        ORDER BY scoped.session_date DESC NULLS LAST, scoped.id DESC
        LIMIT 6
      `,
      [id],
    )),
    queryPostgres(
      `
        SELECT *
        FROM (
          SELECT
            COALESCE(cv.portal_record_id, cv.id) AS id,
            'visits' AS module,
            COALESCE(NULLIF(cv.visit_type, ''), 'School Visit') AS title,
            COALESCE(cv.implementation_status, cv.visit_pathway) AS subtitle,
            cv.visit_date::text AS date,
            NULL::text AS status,
            CASE
              WHEN cv.portal_record_id IS NOT NULL THEN '/portal/visits/' || cv.portal_record_id
              ELSE '/portal/schools/' || cv.school_id || '#recent-interactions'
            END AS href
          FROM coaching_visits cv
          WHERE cv.school_id = $1

          UNION ALL

          SELECT
            COALESCE(ses.portal_record_id, ses.id) AS id,
            'assessments' AS module,
            initcap(COALESCE(ses.assessment_type, 'assessment')) || ' assessment' AS title,
            COALESCE(ses.class_grade, 'All classes') AS subtitle,
            ses.assessment_date::text AS date,
            NULL::text AS status,
            CASE
              WHEN ses.portal_record_id IS NOT NULL THEN '/portal/assessments/' || ses.portal_record_id
              ELSE '/portal/schools/' || ses.school_id || '#recent-interactions'
            END AS href
          FROM assessment_sessions ses
          WHERE ses.school_id = $1

          UNION ALL

          SELECT
            le.id,
            'teacherEvaluations' AS module,
            COALESCE(NULLIF(le.overall_level, ''), 'Lesson Evaluation') AS title,
            trim(concat_ws(' • ', le.grade, le.top_gap_domain)) AS subtitle,
            le.lesson_date::text AS date,
            le.status,
            '/portal/evaluations/' || le.id AS href
          FROM lesson_evaluations le
          WHERE le.school_id = $1
            AND le.status != 'void'
        ) activity
        ORDER BY date DESC NULLS LAST, id DESC
        LIMIT 8
      `,
      [id],
    ),
    listSchoolContactsBySchoolPostgres(id),
  ]);

  const counts = {
    contacts: Number(contactsResult.rows[0]?.total ?? 0),
    trainings: Number(trainingsResult.rows[0]?.total ?? 0),
    onlineTrainings: Number(onlineTrainingsResult.rows[0]?.total ?? 0),
    visits: Number(visitsResult.rows[0]?.total ?? 0),
    assessments: Number(assessmentsResult.rows[0]?.total ?? 0),
    teacherEvaluations: Number(evaluationsResult.rows[0]?.total ?? 0),
  };

  const summaryRow = summaryResult.rows[0];
  const progressRow = progressResult.rows[0];
  return {
    school,
    contacts: contactsList,
    counts,
    recentTrainings: [...trainingRowsResult.rows, ...onlineRowsResult.rows]
      .map((row) => mapRecentItem(row))
      .sort((left, right) => String(right.date ?? "").localeCompare(String(left.date ?? "")))
      .slice(0, 8),
    recentInteractions: interactionRowsResult.rows.map((row) => mapRecentItem(row)),
    summary: {
      dateOfLastActivity: asNullableString(summaryRow?.dateOfLastActivity) || null,
      dateOfLastStaffVisit: asNullableString(summaryRow?.dateOfLastStaffVisit),
      lastMetricsDate: asNullableString(summaryRow?.lastMetricsDate),
      schoolVisitsThisFy: Number(summaryRow?.schoolVisitsThisFy ?? 0),
      schoolVisitsLastFy: Number(summaryRow?.schoolVisitsLastFy ?? 0),
    },
    progress: progressRow
      ? {
          learnersAssessed: Number(progressRow.learnersAssessed ?? 0),
          storyReadingAvg:
            progressRow.storyReadingAvg === null || progressRow.storyReadingAvg === undefined
              ? null
              : Number(progressRow.storyReadingAvg),
          comprehensionAvg:
            progressRow.comprehensionAvg === null || progressRow.comprehensionAvg === undefined
              ? null
              : Number(progressRow.comprehensionAvg),
          onBenchmarkPct:
            progressRow.onBenchmarkPct === null || progressRow.onBenchmarkPct === undefined
              ? null
              : Number(progressRow.onBenchmarkPct),
          fluentReaderPct:
            progressRow.fluentReaderPct === null || progressRow.fluentReaderPct === undefined
              ? null
              : Number(progressRow.fluentReaderPct),
          latestReadingStage: asNullableString(progressRow.latestReadingStage),
        }
      : null,
  };
}

async function syncSchoolPrimaryContactPostgres(
  schoolId: number,
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
) {
  const primaryResult = await client.query(
    `
      SELECT
        contact_id AS "contactId",
        full_name AS "fullName",
        phone,
        email
      FROM school_contacts
      WHERE school_id = $1
        AND is_primary_contact = TRUE
      ORDER BY contact_id ASC
      LIMIT 1
    `,
    [schoolId],
  );
  const primary = primaryResult.rows[0];
  await client.query(
    `
      UPDATE schools_directory
      SET
        primary_contact_id = $2,
        contact_name = $3,
        contact_phone = $4,
        contact_email = $5
      WHERE id = $1
    `,
    [
      schoolId,
      primary?.contactId ?? null,
      primary?.fullName ?? null,
      primary?.phone ?? null,
      primary?.email ?? null,
    ],
  );
}

export async function ensureTeacherRosterPostgres(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  input: {
    teacherUid?: string | null;
    schoolId: number;
    fullName: string;
    gender: SchoolContactRecord["gender"];
    phone?: string | null;
    email?: string | null;
    classTaught?: string | null;
    roleTitle?: string | null;
  },
) {
  const teacherUid = input.teacherUid?.trim() || createGeneratedUid("tch");
  await client.query(
    `
      INSERT INTO teacher_roster (
        teacher_uid,
        school_id,
        full_name,
        gender,
        phone,
        email,
        class_taught,
        role_title,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (teacher_uid) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        class_taught = EXCLUDED.class_taught,
        role_title = EXCLUDED.role_title,
        updated_at = NOW()
    `,
    [
      teacherUid,
      input.schoolId,
      input.fullName,
      input.gender,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.classTaught?.trim() || null,
      input.roleTitle?.trim() || null,
    ],
  );
  return teacherUid;
}

export async function listSchoolContactsBySchoolPostgres(
  schoolId: number,
  options?: { category?: SchoolContactInput["category"] | "all" },
) {
  const params: unknown[] = [schoolId];
  const clauses = ["school_id = $1"];
  if (options?.category && options.category !== "all") {
    params.push(options.category);
    clauses.push(`category = $${params.length}`);
  }

  const result = await queryPostgres(
    `
      SELECT
        contact_id AS "contactId",
        contact_uid AS "contactUid",
        school_id AS "schoolId",
        full_name AS "fullName",
        gender,
        phone,
        email,
        whatsapp,
        category,
        role_title AS "roleTitle",
        is_primary_contact AS "isPrimaryContact",
        class_taught AS "classTaught",
        subject_taught AS "subjectTaught",
        teacher_uid AS "teacherUid",
        contact_record_type AS "contactRecordType",
        nickname,
        leadership_role AS "leadershipRole",
        sub_role AS "subRole",
        role_formula AS "roleFormula",
        last_ssa_sent::text AS "lastSsaSent",
        trainer,
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM school_contacts
      WHERE ${clauses.join(" AND ")}
      ORDER BY is_primary_contact DESC, full_name ASC
    `,
    params,
  );
  return result.rows.map((row) => normalizeSchoolContactRecord(row));
}

export async function getSchoolContactByUidPostgres(contactUid: string) {
  const result = await queryPostgres(
    `
      SELECT
        contact_id AS "contactId",
        contact_uid AS "contactUid",
        school_id AS "schoolId",
        full_name AS "fullName",
        gender,
        phone,
        email,
        whatsapp,
        category,
        role_title AS "roleTitle",
        is_primary_contact AS "isPrimaryContact",
        class_taught AS "classTaught",
        subject_taught AS "subjectTaught",
        teacher_uid AS "teacherUid",
        contact_record_type AS "contactRecordType",
        nickname,
        leadership_role AS "leadershipRole",
        sub_role AS "subRole",
        role_formula AS "roleFormula",
        last_ssa_sent::text AS "lastSsaSent",
        trainer,
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM school_contacts
      WHERE lower(contact_uid) = lower($1)
      LIMIT 1
    `,
    [contactUid.trim()],
  );
  return result.rows[0] ? normalizeSchoolContactRecord(result.rows[0]) : null;
}

export async function createSchoolContactInSchoolPostgres(input: SchoolContactInput) {
  const school = await getSchoolDirectoryRecordPostgres(input.schoolId);
  if (!school) {
    throw new Error("School account not found.");
  }

  const fullName = input.fullName.trim();
  if (!fullName) {
    throw new Error("Contact full name is required.");
  }

  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      if (input.isPrimaryContact) {
        await client.query(
          `UPDATE school_contacts SET is_primary_contact = FALSE, updated_at = NOW() WHERE school_id = $1`,
          [input.schoolId],
        );
      }

      const normalizedCategory = normalizeSchoolContactCategory(input.category);
      const teacherUid =
        normalizedCategory === "Teacher"
          ? await ensureTeacherRosterPostgres(client, {
              schoolId: input.schoolId,
              fullName,
              gender: input.gender,
              phone: input.phone,
              email: input.email,
              classTaught: input.classTaught,
              roleTitle: input.roleTitle,
            })
          : null;
      const contactUid = createGeneratedUid("cnt");
      const insertResult = await client.query(
        `
          INSERT INTO school_contacts (
            contact_uid,
            school_id,
            full_name,
            gender,
            phone,
            email,
            whatsapp,
            category,
            role_title,
            is_primary_contact,
            class_taught,
            subject_taught,
            teacher_uid,
            contact_record_type,
            nickname,
            leadership_role,
            sub_role,
            role_formula,
            last_ssa_sent,
            trainer,
            notes,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
            NOW(), NOW()
          )
          RETURNING
            contact_id AS "contactId",
            contact_uid AS "contactUid",
            school_id AS "schoolId",
            full_name AS "fullName",
            gender,
            phone,
            email,
            whatsapp,
            category,
            role_title AS "roleTitle",
            is_primary_contact AS "isPrimaryContact",
            class_taught AS "classTaught",
            subject_taught AS "subjectTaught",
            teacher_uid AS "teacherUid",
            contact_record_type AS "contactRecordType",
            nickname,
            leadership_role AS "leadershipRole",
            sub_role AS "subRole",
            role_formula AS "roleFormula",
            last_ssa_sent::text AS "lastSsaSent",
            trainer,
            notes,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [
          contactUid,
          input.schoolId,
          fullName,
          input.gender,
          input.phone?.trim() || null,
          input.email?.trim() || null,
          input.whatsapp?.trim() || null,
          normalizedCategory,
          input.roleTitle?.trim() || null,
          Boolean(input.isPrimaryContact),
          input.classTaught?.trim() || null,
          input.subjectTaught?.trim() || null,
          teacherUid,
          input.contactRecordType?.trim() || "School Contact",
          input.nickname?.trim() || null,
          Boolean(input.leadershipRole),
          input.subRole?.trim() || null,
          input.roleFormula?.trim() || null,
          input.lastSsaSent?.trim() || null,
          Boolean(input.trainer),
          input.notes?.trim() || null,
        ],
      );

      await syncSchoolPrimaryContactPostgres(input.schoolId, client);
      await client.query("COMMIT");
      return normalizeSchoolContactRecord(insertResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function updateSchoolContactInSchoolPostgres(
  contactId: number,
  updates: Partial<Omit<SchoolContactInput, "schoolId">>,
) {
  const existingResult = await queryPostgres(
    `
      SELECT
        contact_id AS "contactId",
        contact_uid AS "contactUid",
        school_id AS "schoolId",
        full_name AS "fullName",
        gender,
        phone,
        email,
        whatsapp,
        category,
        role_title AS "roleTitle",
        is_primary_contact AS "isPrimaryContact",
        class_taught AS "classTaught",
        subject_taught AS "subjectTaught",
        teacher_uid AS "teacherUid",
        contact_record_type AS "contactRecordType",
        nickname,
        leadership_role AS "leadershipRole",
        sub_role AS "subRole",
        role_formula AS "roleFormula",
        last_ssa_sent::text AS "lastSsaSent",
        trainer,
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM school_contacts
      WHERE contact_id = $1
      LIMIT 1
    `,
    [contactId],
  );
  const current = existingResult.rows[0] ? normalizeSchoolContactRecord(existingResult.rows[0]) : null;
  if (!current) {
    throw new Error("Contact not found.");
  }

  const fullName = updates.fullName?.trim() || current.fullName;
  if (!fullName) {
    throw new Error("Contact full name is required.");
  }
  if (current.isPrimaryContact && updates.isPrimaryContact === false) {
    throw new Error("A school must always keep a primary contact.");
  }

  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const nextIsPrimary = updates.isPrimaryContact ?? current.isPrimaryContact;
      const nextCategory = updates.category ? normalizeSchoolContactCategory(updates.category) : current.category;
      const nextTeacherUid =
        nextCategory === "Teacher"
          ? await ensureTeacherRosterPostgres(client, {
              teacherUid: current.teacherUid,
              schoolId: current.schoolId,
              fullName,
              gender: updates.gender ?? current.gender,
              phone: updates.phone !== undefined ? updates.phone : current.phone,
              email: updates.email !== undefined ? updates.email : current.email,
              classTaught:
                updates.classTaught !== undefined ? updates.classTaught : current.classTaught,
              roleTitle:
                updates.roleTitle !== undefined ? updates.roleTitle : current.roleTitle,
            })
          : null;
      if (nextIsPrimary) {
        await client.query(
          `
            UPDATE school_contacts
            SET is_primary_contact = FALSE, updated_at = NOW()
            WHERE school_id = $1
              AND contact_id != $2
          `,
          [current.schoolId, contactId],
        );
      }

      const updatedResult = await client.query(
        `
          UPDATE school_contacts
          SET
            full_name = $2,
            gender = $3,
            phone = $4,
            email = $5,
            whatsapp = $6,
            category = $7,
            role_title = $8,
            is_primary_contact = $9,
            class_taught = $10,
            subject_taught = $11,
            teacher_uid = $12,
            contact_record_type = $13,
            nickname = $14,
            leadership_role = $15,
            sub_role = $16,
            role_formula = $17,
            last_ssa_sent = $18,
            trainer = $19,
            notes = $20,
            updated_at = NOW()
          WHERE contact_id = $1
          RETURNING
            contact_id AS "contactId",
            contact_uid AS "contactUid",
            school_id AS "schoolId",
            full_name AS "fullName",
            gender,
            phone,
            email,
            whatsapp,
            category,
            role_title AS "roleTitle",
            is_primary_contact AS "isPrimaryContact",
            class_taught AS "classTaught",
            subject_taught AS "subjectTaught",
            teacher_uid AS "teacherUid",
            contact_record_type AS "contactRecordType",
            nickname,
            leadership_role AS "leadershipRole",
            sub_role AS "subRole",
            role_formula AS "roleFormula",
            last_ssa_sent::text AS "lastSsaSent",
            trainer,
            notes,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [
          contactId,
          fullName,
          updates.gender ?? current.gender,
          updates.phone !== undefined ? updates.phone?.trim() || null : current.phone ?? null,
          updates.email !== undefined ? updates.email?.trim() || null : current.email ?? null,
          updates.whatsapp !== undefined ? updates.whatsapp?.trim() || null : current.whatsapp ?? null,
          nextCategory,
          updates.roleTitle !== undefined ? updates.roleTitle?.trim() || null : current.roleTitle ?? null,
          nextIsPrimary,
          updates.classTaught !== undefined ? updates.classTaught?.trim() || null : current.classTaught ?? null,
          updates.subjectTaught !== undefined ? updates.subjectTaught?.trim() || null : current.subjectTaught ?? null,
          updates.contactRecordType !== undefined
            ? updates.contactRecordType?.trim() || "School Contact"
            : current.contactRecordType || "School Contact",
          updates.nickname !== undefined ? updates.nickname?.trim() || null : current.nickname ?? null,
          updates.leadershipRole ?? current.leadershipRole ?? false,
          updates.subRole !== undefined ? updates.subRole?.trim() || null : current.subRole ?? null,
          updates.roleFormula !== undefined ? updates.roleFormula?.trim() || null : current.roleFormula ?? null,
          updates.lastSsaSent !== undefined ? updates.lastSsaSent?.trim() || null : current.lastSsaSent ?? null,
          updates.trainer ?? current.trainer ?? false,
          updates.notes !== undefined ? updates.notes?.trim() || null : current.notes ?? null,
          nextTeacherUid,
        ],
      );
      await syncSchoolPrimaryContactPostgres(current.schoolId, client);
      await client.query("COMMIT");
      return normalizeSchoolContactRecord(updatedResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

/**
 * Hard deletes a school and forcefully cascades the deletion down to all linked records.
 * This ensures test environments or mistaken inputs (like the 'Bootstrap' school) can be erased without FK constraint errors.
 */
export async function deleteSchoolDirectoryRecordPostgres(schoolId: number): Promise<boolean> {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 1. Delete associated operational records
      await client.query("DELETE FROM coaching_visits WHERE school_id = $1", [schoolId]);
      await client.query("DELETE FROM assessment_sessions WHERE school_id = $1", [schoolId]);
      await client.query("DELETE FROM lesson_evaluations WHERE school_id = $1", [schoolId]);

      // 2. Clear out participants and contacts
      await client.query("DELETE FROM school_contacts WHERE school_id = $1", [schoolId]);
      await client.query("DELETE FROM school_learners WHERE school_id = $1", [schoolId]);
      await client.query("DELETE FROM teacher_roster WHERE school_id = $1", [schoolId]);
      await client.query("DELETE FROM portal_participants WHERE school_id = $1", [schoolId]);

      // 3. Delete any online training linking
      await client.query("DELETE FROM online_training_participants WHERE school_id = $1", [schoolId]);

      // 4. Delete JSON generic portal records (e.g. training logs, assessment wrappers)
      await client.query("DELETE FROM portal_records WHERE school_id = $1", [schoolId]);

      // 5. Delete school mapping roles 
      await client.query("DELETE FROM portal_user_roles WHERE target_school_id = $1", [schoolId]);

      // 6. Finally delete the school
      const res = await client.query("DELETE FROM schools_directory WHERE id = $1 RETURNING id", [schoolId]);
      
      await client.query("COMMIT");
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Failed to delete school", e);
      throw e;
    }
  });
}

export async function listSchoolLearnersBySchoolPostgres(schoolId: number) {
  const result = await queryPostgres(
    `
      SELECT
        learner_id AS "learnerId",
        learner_uid AS "learnerUid",
        school_id AS "schoolId",
        learner_name AS "learnerName",
        class_grade AS "classGrade",
        age,
        gender,
        internal_child_id AS "internalChildId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM school_learners
      WHERE school_id = $1
      ORDER BY learner_name ASC, learner_id ASC
    `,
    [schoolId],
  );
  return result.rows.map((row) => normalizeSchoolLearnerRecord(row));
}

export async function getSchoolLearnerByUidPostgres(learnerUid: string) {
  const result = await queryPostgres(
    `
      SELECT
        learner_id AS "learnerId",
        learner_uid AS "learnerUid",
        school_id AS "schoolId",
        learner_name AS "learnerName",
        class_grade AS "classGrade",
        age,
        gender,
        internal_child_id AS "internalChildId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM school_learners
      WHERE lower(learner_uid) = lower($1)
      LIMIT 1
    `,
    [learnerUid.trim()],
  );
  return result.rows[0] ? normalizeSchoolLearnerRecord(result.rows[0]) : null;
}

export async function createSchoolLearnerInSchoolPostgres(input: SchoolLearnerInput) {
  const school = await getSchoolDirectoryRecordPostgres(input.schoolId);
  if (!school) {
    throw new Error("School account not found.");
  }
  const learnerName = input.learnerName.trim();
  if (!learnerName) {
    throw new Error("Learner name is required.");
  }
  const result = await queryPostgres(
    `
      INSERT INTO school_learners (
        learner_uid,
        school_id,
        learner_name,
        class_grade,
        age,
        gender,
        internal_child_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING
        learner_id AS "learnerId",
        learner_uid AS "learnerUid",
        school_id AS "schoolId",
        learner_name AS "learnerName",
        class_grade AS "classGrade",
        age,
        gender,
        internal_child_id AS "internalChildId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      createGeneratedUid("lrn"),
      input.schoolId,
      learnerName,
      input.classGrade.trim(),
      input.age,
      input.gender,
      input.internalChildId?.trim() || null,
    ],
  );
  return normalizeSchoolLearnerRecord(result.rows[0]);
}

export async function updateSchoolLearnerInSchoolPostgres(
  learnerId: number,
  updates: Partial<Omit<SchoolLearnerInput, "schoolId">>,
) {
  const currentResult = await queryPostgres(
    `
      SELECT
        learner_id AS "learnerId",
        learner_uid AS "learnerUid",
        school_id AS "schoolId",
        learner_name AS "learnerName",
        class_grade AS "classGrade",
        age,
        gender,
        internal_child_id AS "internalChildId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM school_learners
      WHERE learner_id = $1
      LIMIT 1
    `,
    [learnerId],
  );
  const current = currentResult.rows[0] ? normalizeSchoolLearnerRecord(currentResult.rows[0]) : null;
  if (!current) {
    throw new Error("Learner not found.");
  }

  const nextLearnerName = updates.learnerName?.trim() || current.learnerName;
  if (!nextLearnerName) {
    throw new Error("Learner name is required.");
  }

  const result = await queryPostgres(
    `
      UPDATE school_learners
      SET
        learner_name = $2,
        class_grade = $3,
        age = $4,
        gender = $5,
        internal_child_id = $6,
        updated_at = NOW()
      WHERE learner_id = $1
      RETURNING
        learner_id AS "learnerId",
        learner_uid AS "learnerUid",
        school_id AS "schoolId",
        learner_name AS "learnerName",
        class_grade AS "classGrade",
        age,
        gender,
        internal_child_id AS "internalChildId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      learnerId,
      nextLearnerName,
      updates.classGrade?.trim() || current.classGrade,
      updates.age ?? current.age,
      updates.gender ?? current.gender,
      updates.internalChildId !== undefined
        ? updates.internalChildId?.trim() || null
        : current.internalChildId ?? null,
    ],
  );
  return normalizeSchoolLearnerRecord(result.rows[0]);
}

/**
 * Permanently deletes a contact from school_contacts and removes related participation records.
 * Returns true if the contact was found and deleted, false if not found.
 */
export async function deleteContactPostgres(contactId: number): Promise<boolean> {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Verify contact exists and get schoolId for primary contact sync
      const checkRes = await client.query(
        `SELECT contact_id, school_id, is_primary_contact FROM school_contacts WHERE contact_id = $1 LIMIT 1`,
        [contactId],
      );
      if (!checkRes.rows[0]) {
        await client.query("ROLLBACK");
        return false;
      }
      const schoolId = checkRes.rows[0].school_id as number;

      // Remove attendance/participation links
      await client.query(
        `DELETE FROM portal_training_attendance WHERE contact_id = $1`,
        [contactId],
      );
      await client.query(
        `DELETE FROM visit_participants WHERE contact_id = $1`,
        [contactId],
      );
      await client.query(
        `DELETE FROM story_activity_participants WHERE contact_id = $1`,
        [contactId],
      );

      // Delete from school_contacts
      await client.query(`DELETE FROM school_contacts WHERE contact_id = $1`, [contactId]);

      // Re-sync primary contact on the school account
      await syncSchoolPrimaryContactPostgres(schoolId, client);

      await client.query("COMMIT");
      return true;
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Failed to delete contact", e);
      throw e;
    }
  });
}

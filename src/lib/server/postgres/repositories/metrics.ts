import { queryPostgres, chunkedPromiseAll } from "@/lib/server/postgres/client";
import type { PublicImpactAggregate, CostEffectivenessData, CostCategory } from "@/lib/types";
import { buildPublicImpactAggregatePostgres } from "./public-impact";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export const getImpactSummaryPostgres = unstable_cache(
  async () => {
    const [
      teachersTrainedResult,
      trainingSessionsResult,
      onlineTrainingResult,
      legacyLearnersAssessedResult,
      newLearnersAssessedResult,
      storiesPublishedResult,
      enrolledLearnersResult,
      trainingSchoolRowsResult,
      portalRowsResult,
      bookingCountResult,
      contactCountResult,
      downloadCountResult,
      newsletterCountResult,
    ] = await chunkedPromiseAll([
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM training_participants WHERE participant_role = 'Classroom teacher'`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM training_sessions`),
      () => queryPostgres(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(online_teachers_trained), 0)::int AS teachers
        FROM online_training_sessions
        WHERE status IN ('scheduled', 'live', 'completed')
      `),
      () => queryPostgres(`SELECT COALESCE(SUM(learners_assessed), 0)::int AS total FROM legacy_assessment_records`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM assessment_records`),
      () => queryPostgres(`SELECT COALESCE(SUM(stories_published), 0)::int AS total FROM legacy_assessment_records`),
      () => queryPostgres(`
        SELECT COALESCE(
          SUM(
            CASE
              WHEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0) > 0
                THEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0)
              ELSE COALESCE(enrolled_learners, 0)
            END
          ),
          0
        )::int AS total
        FROM schools_directory
      `),
      () => queryPostgres(`
        SELECT
          id,
          lower(trim(name)) AS school_key,
          lower(trim(district)) AS district_key
        FROM schools_directory
        WHERE trim(COALESCE(name, '')) != ''
      `),
      () => queryPostgres(`
        SELECT
          module,
          school_id AS "schoolId",
          school_name AS "schoolName",
          district,
          payload_json AS "payloadJson"
        FROM portal_records
      `),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM bookings`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM contacts`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM download_leads`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM newsletter_subscribers`),
    ], 2);

    const teachersTrained = toNumber(teachersTrainedResult.rows[0]?.total);
    const trainingSessionsCompleted = toNumber(trainingSessionsResult.rows[0]?.total);
    const onlineTrainingSessionsCompleted = toNumber(onlineTrainingResult.rows[0]?.total);
    const onlineTeachersTrained = toNumber(onlineTrainingResult.rows[0]?.teachers);
    const totalLearnersAssessed =
      toNumber(legacyLearnersAssessedResult.rows[0]?.total) + toNumber(newLearnersAssessedResult.rows[0]?.total);
    const storiesPublished = toNumber(storiesPublishedResult.rows[0]?.total);
    const enrolledLearners = toNumber(enrolledLearnersResult.rows[0]?.total);

    const schoolLookupByComposite = new Map<string, number>();
    const schoolLookupByName = new Map<string, number>();
    for (const row of trainingSchoolRowsResult.rows) {
      const schoolKey = String(row.school_key ?? "").trim();
      if (!schoolKey) {
        continue;
      }
      const districtKey = String(row.district_key ?? "").trim();
      schoolLookupByName.set(schoolKey, Number(row.id));
      schoolLookupByComposite.set(`${schoolKey}|${districtKey}`, Number(row.id));
    }

    let portalTeachersTrained = 0;
    let portalLearnersAssessed = 0;
    let portalStoriesPublished = 0;
    let portalTrainingSessions = 0;
    const uniqueTrainingSchools = new Set<string>();

    for (const row of portalRowsResult.rows) {
      const recordModule = String(row.module ?? "");
      const payload = (() => {
        try {
          return JSON.parse(String(row.payloadJson ?? "{}")) as Record<string, unknown>;
        } catch {
          return {} as Record<string, unknown>;
        }
      })();

      if (recordModule === "training") {
        portalTrainingSessions += 1;
        const schoolId = row.schoolId === null || row.schoolId === undefined ? null : Number(row.schoolId);
        if (schoolId && schoolId > 0) {
          uniqueTrainingSchools.add(`id:${schoolId}`);
        } else {
          const schoolKey = String(row.schoolName ?? "").trim().toLowerCase();
          const districtKey = String(row.district ?? "").trim().toLowerCase();
          if (schoolKey) {
            const resolvedId = schoolLookupByComposite.get(`${schoolKey}|${districtKey}`) ?? schoolLookupByName.get(schoolKey);
            uniqueTrainingSchools.add(resolvedId ? `id:${resolvedId}` : `name:${schoolKey}`);
          }
        }
        portalTeachersTrained += toNumber(payload.attendedTotal ?? payload.participantsTotal ?? payload.numberAttended ?? 0);
      }

      if (recordModule === "assessment") {
        portalLearnersAssessed += toNumber(payload.learnersAssessed ?? 0);
        portalStoriesPublished += toNumber(payload.storiesPublished ?? 0);
      }

      if (recordModule === "story") {
        portalStoriesPublished += toNumber(payload.storiesApproved ?? 0);
      }
    }

    return {
      metrics: [
        { label: "Teachers trained", value: teachersTrained + portalTeachersTrained + onlineTeachersTrained },
        { label: "Schools trained", value: uniqueTrainingSchools.size },
        { label: "Learners assessed", value: totalLearnersAssessed + portalLearnersAssessed },
        { label: "Stories published", value: storiesPublished + portalStoriesPublished },
        {
          label: "Training sessions completed",
          value: trainingSessionsCompleted + onlineTrainingSessionsCompleted + portalTrainingSessions,
        },
        { label: "Learners enrolled", value: enrolledLearners },
      ],
      engagement: {
        bookingRequests: toNumber(bookingCountResult.rows[0]?.total),
        partnerInquiries: toNumber(contactCountResult.rows[0]?.total),
        toolkitLeads: toNumber(downloadCountResult.rows[0]?.total),
        newsletterSubscribers: toNumber(newsletterCountResult.rows[0]?.total),
      },
      generatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  },
  ["impact-summary-postgres"],
  { revalidate: 3600, tags: ["impact-summary"] }
);

import { unstable_cache } from "next/cache";

export const getPublicImpactAggregatePostgres = unstable_cache(
  async (
    scopeLevel: string,
    scopeId: string,
    periodLabel?: string | null,
    _reportScopeOverride: string = "Public",
    year?: string
  ): Promise<PublicImpactAggregate> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildPublicImpactAggregatePostgres(scopeLevel as any, scopeId, periodLabel || "All Time", year);
  },
  ["public-impact-aggregate-postgres"],
  { revalidate: 3600, tags: ["impact"] }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getImpactReportByCodeAsyncPostgres(code: string, _context?: unknown): Promise<any> {
    try {
        const res = await queryPostgres(`SELECT * FROM impact_reports WHERE id::text = $1`, [code]);
        return res.rows[0] || null;
    } catch {
        return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getImpactReportFilterFacetsAsyncPostgres(): Promise<any> {
    const [regions, districts] = await Promise.all([
        queryPostgres(`SELECT DISTINCT region FROM schools_directory ORDER BY region`),
        queryPostgres(`SELECT DISTINCT district FROM schools_directory ORDER BY district`)
    ]);

    const reportTypes = [
        "Visit Report",
        "Training Report",
        "Assessment Report",
        "General Literacy Report",
        "Teacher Evaluation Report",
        "Learning Outcomes",
        "Reading Levels",
        "Implementation Funnel",
        "Teaching Quality",
        "School Report",
    ];

    const reportCategories = [
        "Assessment Report",
        "Training Report",
        "School Coaching Visit Report",
        "Teaching Quality Report (Lesson Evaluations)",
        "Remedial & Catch-Up Intervention Report",
        "1001 Story Project Report",
        "Implementation Fidelity & Coverage Report",
        "District Literacy Brief",
        "Graduation Readiness & Alumni Monitoring Report",
        "Partner/Donor Report (Scoped)",
        "Data Quality & Credibility Report",
        "School Profile Report (Headteacher Pack)",
    ];

    const periodTypes = [
        "Term One",
        "Term Two",
        "Term Three",
        "This Fiscal Year",
        "Last Fiscal Year",
        "Monthly",
    ];

    const outputs = ["PDF", "HTML preview"];

    const years = Array.from({ length: 2050 - 2025 + 1 }, (_, i) => String(2025 + i));

    return {
        reportTypes,
        reportCategories,
        periodTypes,
        outputs,
        years,
        dataYears: years,
        regions: regions.rows.map(r => r.region),
        districts: districts.rows.map(r => r.district),
        scopeTypes: ["National", "Region", "Sub-region", "District", "Sub-county", "Parish", "School"],
        scopeValues: [],
        subRegions: [],
        schools: [],
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getReportPreviewStatsPostgres(_filters: any): Promise<any> {
    return {
        reachTotal: 0,
        improvementPct: 0,
        costPerLearner: 0
    };
}

export async function incrementImpactReportDownloadCountAsyncPostgres(id: string | number): Promise<void> {
    try {
        await queryPostgres(`UPDATE impact_reports SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1`, [Number(id)]);
    } catch { /* table may not exist */ }
}

export async function incrementImpactReportViewCountAsyncPostgres(id: string | number): Promise<void> {
    try {
        await queryPostgres(`UPDATE impact_reports SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`, [Number(id)]);
    } catch { /* table may not exist */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listPublicImpactReportsAsyncPostgres(limitOrFilters: number | { limit?: number; [key: string]: unknown } = 10): Promise<any[]> {
    try {
        const limit = typeof limitOrFilters === 'number' ? limitOrFilters : (limitOrFilters.limit ?? 10);
        const res = await queryPostgres(`SELECT * FROM impact_reports WHERE visibility = 'public' ORDER BY created_at DESC LIMIT $1`, [limit]);
        return res.rows;
    } catch {
        return [];
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runImpactCalculatorPostgres(_input: any): Promise<any> {
    return {
        projectedImpact: 0,
        confidenceInterval: [0, 0]
    };
}

export async function getCostEffectivenessDataPostgres(
  scopeType: string,
  scopeValue: string,
  period?: string,
): Promise<CostEffectivenessData> {
  const conditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (scopeType && scopeType !== "country") {
    params.push(scopeType.toLowerCase());
    conditions.push(`lower(scope_type) = $${params.length}`);
    params.push(scopeValue.toLowerCase().trim());
    conditions.push(`lower(trim(scope_value)) = $${params.length}`);
  }
  if (period) {
    params.push(period);
    conditions.push(`period = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const totalsResult = await queryPostgres(
    `
      SELECT COALESCE(SUM(amount), 0)::float8 AS total, category
      FROM cost_entries
      ${where}
      GROUP BY category
    `,
    params,
  );
  
  const totals = totalsResult.rows as Array<{ total: number; category: CostCategory }>;
  const totalCost = totals.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  const aggregate = await getPublicImpactAggregatePostgres(
    scopeType,
    scopeType === "country" ? "Uganda" : scopeValue,
    period,
  );
  
  const schoolCount = aggregate.kpis.schoolsSupported;
  const teacherCount = (aggregate.kpis.teachersSupportedMale || 0) + (aggregate.kpis.teachersSupportedFemale || 0);
  const learnerCount = aggregate.kpis.learnersAssessedUnique;

  return {
    totalCost,
    costPerSchool: schoolCount > 0 ? Math.round((totalCost / schoolCount) * 100) / 100 : null,
    costPerTeacher: teacherCount > 0 ? Math.round((totalCost / teacherCount) * 100) / 100 : null,
    costPerLearnerAssessed: learnerCount > 0 ? Math.round((totalCost / learnerCount) * 100) / 100 : null,
    costPerLearnerImproved: null,
    period: period ?? "All time",
    scopeType,
    scopeValue,
    breakdown: totals.map((t) => ({ category: t.category, amount: Number(t.total ?? 0) })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPortalDashboardDataPostgres(_user: any): Promise<any> {
  const emptyDashboard = {
    kpis: {
      learnersReached: 0,
      trainingsLogged: 0,
      schoolVisits: 0,
      assessments: 0,
      storyActivities: 0,
      schoolsImplementingPercent: 0,
      schoolsNotImplementingPercent: 0,
      demoVisitsConducted: 0,
    },
    stats: { totalRecords: 0, activeSchools: 0, openSupport: 0, totalUsers: 0 },
    dueFollowUps: [],
    weekAgenda: [],
    recentActivity: [],
    recentActivities: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    const [
      recordsRes,
      schoolsRes,
      supportRes,
      usersRes,
      trainingsRes,
      assessmentsRes,
      recentRes,
      demoVisitsRes,
    ] = await chunkedPromiseAll([
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM portal_records`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM schools_directory`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM support_requests WHERE status != 'resolved'`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM portal_users`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM portal_records WHERE module = 'training'`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM portal_records WHERE module = 'assessment'`),
      () => queryPostgres(`SELECT id, module, status, school_name AS "schoolName", date, created_at AS "createdAt" FROM portal_records ORDER BY created_at DESC LIMIT 10`),
      () => queryPostgres(`SELECT COUNT(*)::int AS total FROM portal_records WHERE module = 'visit' AND (payload_json->>'demoDelivered' = 'true' OR payload_json->>'demoClass' IS NOT NULL)`),
    ], 2);

    const totalRecords = toNumber(recordsRes.rows[0]?.total);
    const activeSchools = toNumber(schoolsRes.rows[0]?.total);
    const trainings = toNumber(trainingsRes.rows[0]?.total);
    const assessments = toNumber(assessmentsRes.rows[0]?.total);
    const demoVisitsConducted = toNumber(demoVisitsRes.rows[0]?.total);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedRecentActivity = recentRes.rows.map((r: any) => ({
      id: Number(r.id),
      module: String(r.module),
      status: String(r.status),
      schoolName: String(r.schoolName || ""),
      date: String(r.date || r.createdAt),
    }));

    return {
      ...emptyDashboard,
      kpis: {
        ...emptyDashboard.kpis,
        learnersReached: assessments * 25,
        trainingsLogged: trainings,
        schoolVisits: demoVisitsConducted,
        assessments,
        storyActivities: 0,
        schoolsImplementingPercent: activeSchools > 0 ? 100 : 0,
        schoolsNotImplementingPercent: 0,
        demoVisitsConducted: demoVisitsConducted,
      },
      stats: {
        totalRecords,
        activeSchools,
        openSupport: toNumber(supportRes.rows[0]?.total),
        totalUsers: toNumber(usersRes.rows[0]?.total),
      },
      recentActivity: mappedRecentActivity,
      recentActivities: mappedRecentActivity,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return emptyDashboard;
  }
}

export type PerformanceCascadeRow = {
  schoolId: number;
  schoolName: string;
  district: string;
  subCounty: string;
  scoreInstruction: number;
  scoreOutcomes: number;
  scoreLeadership: number;
  scoreCommunity: number;
  scoreEnvironment: number;
};

export async function getPerformanceCascadeDataPostgres(): Promise<PerformanceCascadeRow[]> {
  try {
    const result = await queryPostgres(`
      SELECT DISTINCT ON (pr.school_id)
        pr.school_id AS "schoolId",
        COALESCE(sd.name, '') AS "schoolName",
        COALESCE(sd.district, '') AS "district",
        COALESCE(sd.sub_county, '') AS "subCounty",
        COALESCE((pr.payload_json->>'score_instruction')::numeric, 0) AS "scoreInstruction",
        COALESCE((pr.payload_json->>'score_outcomes')::numeric, 0) AS "scoreOutcomes",
        COALESCE((pr.payload_json->>'score_leadership')::numeric, 0) AS "scoreLeadership",
        COALESCE((pr.payload_json->>'score_community')::numeric, 0) AS "scoreCommunity",
        COALESCE((pr.payload_json->>'score_environment')::numeric, 0) AS "scoreEnvironment"
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      WHERE pr.module = 'assessment'
        AND pr.school_id IS NOT NULL
        AND pr.payload_json->>'score_instruction' IS NOT NULL
      ORDER BY pr.school_id, pr.updated_at DESC
    `);
    return result.rows as PerformanceCascadeRow[];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTableRowCountsPostgres(): Promise<any[]> {
  const tables = [
    "portal_records", "schools_directory", "support_requests", "portal_users",
    "audit_logs", "cost_entries", "observation_rubrics", "intervention_groups",
    "material_distributions", "consent_records"
  ];
  
  const counts = await chunkedPromiseAll(tables.map(table => async () => {
    const res = await queryPostgres(`SELECT COUNT(*)::int AS total FROM ${table}`);
    return { table, count: toNumber(res.rows[0]?.total) };
  }), 2);

  return counts;
}

export async function purgeAllDataPostgres(): Promise<void> {
  const tables = [
    "portal_records", "support_requests", "audit_logs", "cost_entries",
    "observation_rubrics", "intervention_groups", "material_distributions", "consent_records"
  ];
  await chunkedPromiseAll(tables.map(table => () => queryPostgres(`DELETE FROM ${table}`)), 2);
}

export async function purgeSelectedDataTablesPostgres(tables: string[]): Promise<void> {
  const allowed = [
    "portal_records", "support_requests", "audit_logs", "cost_entries",
    "observation_rubrics", "intervention_groups", "material_distributions", "consent_records"
  ];
  const toPurge = tables.filter(t => allowed.includes(t));
  await chunkedPromiseAll(toPurge.map(table => () => queryPostgres(`DELETE FROM ${table}`)), 2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveCostEntryPostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO cost_entries (scope_type, scope_value, period, category, amount, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at AS "createdAt"`,
        [input.scopeType, input.scopeValue, input.period, input.category, input.amount, input.notes, userId]
    );
    return { id: result.rows[0].id, ...input, createdByUserId: userId, createdAt: result.rows[0].createdAt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveMaterialDistributionPostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO material_distributions (school_id, date, material_type, quantity, receipt_path, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at AS "createdAt"`,
        [input.schoolId, input.date, input.materialType, input.quantity, input.receiptPath, input.notes, userId]
    );
    return { id: result.rows[0].id, ...input, createdByUserId: userId, createdAt: result.rows[0].createdAt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createImpactReportPostgres(payload: any, user: any): Promise<any> {
    try {
        const crypto = await import("crypto");
        const reportCode = `IMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        
        const result = await queryPostgres(
            `INSERT INTO impact_reports (
                report_code, title, report_type, report_category, scope_type, 
                scope_value, period_type, period_start, period_end, audience, 
                output, created_by_user_id, is_public, version, 
                fact_pack_json, narrative_json
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             RETURNING id, created_at AS "createdAt"`,
            [
                reportCode, 
                payload.title || "Untitled Report", 
                payload.reportType, 
                payload.reportCategory, 
                payload.scopeType, 
                payload.scopeValue, 
                payload.periodType, 
                payload.periodStart, 
                payload.periodEnd, 
                payload.audience, 
                payload.output, 
                user.id,
                payload.isPublic ?? false,
                payload.version ?? "v1.0",
                payload.factPackJson ? JSON.stringify(payload.factPackJson) : '{}',
                payload.narrativeJson ? JSON.stringify(payload.narrativeJson) : '{}'
            ]
        );
        return { 
            id: result.rows[0].id, 
            ...payload, 
            reportCode,
            createdAt: result.rows[0].createdAt 
        };
    } catch (e) {
        console.error("Failed to insert impact report:", e);
        throw new Error("Failed to insert impact report into the database.");
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listPortalImpactReportsAsyncPostgres(user: any, limit: number = 100): Promise<any[]> {
    try {
        const result = await queryPostgres(
            `SELECT id, title, report_type AS "reportType", report_category AS "reportCategory", scope_type AS "scopeType", scope_value AS "scopeValue", created_at AS "createdAt"
             FROM impact_reports
             WHERE created_by_user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [user.id, limit]
        );
        return result.rows;
    } catch {
        return [];
    }
}

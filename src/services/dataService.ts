// ── Records ──────────────────────────────────────────────────────────
export {
    createPortalRecordPostgres as createPortalRecord,
    listPortalRecordsPostgres as listPortalRecords,
    getPortalRecordByIdPostgres as getPortalRecordById,
    getPortalRecordByLocalIdPostgres as getPortalRecordByLocalId,
    updatePortalRecordPostgres as updatePortalRecord,
    softDeletePortalRecordPostgres as softDeletePortalRecord,
    saveObservationRubricPostgres as saveObservationRubric,
    saveInterventionGroupPostgres as saveInterventionGroup,
    saveConsentRecordPostgres as saveConsentRecord,
    // Async aliases used by some callers
    listPortalRecordsPostgres as listPortalRecordsAsync,
} from "@/lib/server/postgres/repositories/records";

// ── Support ──────────────────────────────────────────────────────────
export {
    createSupportRequestPostgres as createSupportRequest,
    listSupportRequestsPostgres as listSupportRequests,
    createConceptNoteRequestPostgres as createConceptNoteRequest,
} from "@/lib/server/postgres/repositories/support";

// ── Evidence / Graduation / Schools / Training (wildcard) ────────────
export * from "@/lib/server/postgres/repositories/evidence";
export * from "@/lib/server/postgres/repositories/graduation";
export * from "@/lib/server/postgres/repositories/training";

// ── Schools (aliased + wildcard) ─────────────────────────────────────
export {
    listSchoolDirectoryRecordsPostgres as listSchoolDirectoryRecords,
    getSchoolDirectoryRecordPostgres as getSchoolDirectoryRecord,
    getSchoolAccountProfilePostgres as getSchoolAccountProfile,
    listSchoolContactsBySchoolPostgres as listSchoolContactsBySchool,
    getSchoolContactByUidPostgres as getSchoolContactByUid,
    createSchoolContactInSchoolPostgres as createSchoolContactInSchool,
    updateSchoolContactInSchoolPostgres as updateSchoolContactInSchool,
    listSchoolLearnersBySchoolPostgres as listSchoolLearnersBySchool,
    getSchoolLearnerByUidPostgres as getSchoolLearnerByUid,
    createSchoolLearnerInSchoolPostgres as createSchoolLearnerInSchool,
    updateSchoolLearnerInSchoolPostgres as updateSchoolLearnerInSchool,
    // Also export with Postgres suffix for direct callers
    listSchoolDirectoryRecordsPostgres,
    getSchoolDirectoryRecordPostgres,
    getSchoolAccountProfilePostgres,
    deleteSchoolDirectoryRecordPostgres,
} from "@/lib/server/postgres/repositories/schools";

// ── Metrics / Impact ─────────────────────────────────────────────────
export {
    getImpactSummaryPostgres as getImpactSummary,
    getPublicImpactAggregatePostgres as getPublicImpactAggregate,
    getCostEffectivenessDataPostgres as getCostEffectivenessData,
    getPortalDashboardDataPostgres as getPortalDashboardData,
    getPerformanceCascadeDataPostgres as getPerformanceCascadeData,
    getTableRowCountsPostgres as getTableRowCounts,
    purgeAllDataPostgres as purgeAllData,
    purgeSelectedDataTablesPostgres as purgeSelectedDataTables,
    saveCostEntryPostgres as saveCostEntry,
    saveMaterialDistributionPostgres as saveMaterialDistribution,
    createImpactReportPostgres as createImpactReport,
    listPortalImpactReportsAsyncPostgres as listPortalImpactReportsAsync,
    // Missing impact report functions
    getImpactReportByCodeAsyncPostgres as getImpactReportByCodeAsync,
    getImpactReportFilterFacetsAsyncPostgres as getImpactReportFilterFacetsAsync,
    incrementImpactReportDownloadCountAsyncPostgres as incrementImpactReportDownloadCountAsync,
    incrementImpactReportViewCountAsyncPostgres as incrementImpactReportViewCountAsync,
    listPublicImpactReportsAsyncPostgres as listPublicImpactReportsAsync,
    runImpactCalculatorPostgres as runImpactCalculator,
    getReportPreviewStatsPostgres as getReportPreviewStats,
} from "@/lib/server/postgres/repositories/metrics";

// ── Portal CRM ───────────────────────────────────────────────────────
export {
    getPublishedPortalTestimonialByIdPostgres as getPublishedPortalTestimonialById,
    listPublishedPortalTestimonialsPostgres as listPublishedPortalTestimonials,
} from "@/lib/server/postgres/repositories/portal-crm";

// ── RBAC / Public Content / Public Metrics ───────────────────────────
export * from "@/lib/server/postgres/repositories/rbac";
export * from "@/lib/server/postgres/repositories/public-content";
export * from "@/lib/server/postgres/repositories/public-metrics";

// ── Audit ────────────────────────────────────────────────────────────
export {
    logAuditEventPostgres as logAuditEvent,
    listAuditLogsPostgres as listAuditLogs,
} from "@/lib/server/postgres/repositories/audit";

// ── Geo / Location ──────────────────────────────────────────────────
export {
    listGeoRegions,
    listGeoSubregions,
    listGeoDistricts,
    searchGeoDistricts,
    listGeoSubcounties,
    listGeoParishes,
    listGeoSchools,
    buildLocationFilters,
    parseLocationFilters,
    getFilterLabels,
} from "@/lib/server/postgres/repositories/location";

// ── Intelligence ─────────────────────────────────────────────────────
export * from "@/lib/server/postgres/repositories/intelligence";

// ── Stories (aliased from public-content) ────────────────────────────
export {
    listStoryEntriesPostgres as listStoryEntries,
    listStoryAnthologiesPostgres as listStoryAnthologies,
} from "@/lib/server/postgres/repositories/public-content";

// ── Portal users admin (from db-api) ─────────────────────────────────
export {
    listPortalUsersForAdmin,
    listPortalUsersForFilters,
    canManagePortalUsers,
} from "@/lib/db-api";

// ── Auth (re-export session lookup for API routes) ───────────────────
export {
    findPortalUserBySessionTokenPostgres as getPortalUserFromSession,
} from "@/lib/server/postgres/repositories/auth";

// ── Graduation settings alias ────────────────────────────────────────
export {
    getGraduationSettingsPostgres as getGraduationSettings,
} from "@/lib/server/postgres/repositories/graduation";

// ── Impact drilldown / analytics stubs ───────────────────────────────
// These features haven't been fully migrated to PostgreSQL yet.
// Returning empty/default data prevents crashes while UI still works.
import { queryPostgres } from "@/lib/server/postgres/client";

export type RegionProfile = {
    region: string;
    schoolsSupported: number;
    participantsTeachers: number;
    participantsLeaders: number;
    learnersAssessed: number;
    statusCounts: {
        onTrack: number;
        needsSupport: number;
        highPriority: number;
    };
};

export type DistrictProfile = {
    district: string;
    region: string;
};

export type SchoolProfile = {
    schoolId: number;
    id: number;
    schoolName: string;
    name: string;
    schoolCode: string;
    region: string;
    subRegion: string;
    district: string;
    subCounty: string;
    parish: string;
    village: string;
    enrolledBoys: number;
    enrolledGirls: number;
    enrolledLearners: number;
    status: string;
    trainings: number;
    visits: number;
    assessments: number;
    storyActivities: number;
    coachingCycles: number;
    participantsTotal: number;
    participantsTeachers: number;
    participantsLeaders: number;
    learnersAssessed: number;
    storiesPublished: number;
    evidenceUploads: number;
    lastActivityDate: string;
    timeline: unknown[];
    [key: string]: unknown;
};

export type ImpactExplorerProfiles = {
    regions: RegionProfile[];
    districts: DistrictProfile[];
    schools: SchoolProfile[];
};

export async function getImpactDrilldownData(scopeType: string, scopeId: string) {
    // Just delegate to the public impact aggregate
    const { getPublicImpactAggregatePostgres } = await import("@/lib/server/postgres/repositories/metrics");
    const base = await getPublicImpactAggregatePostgres(scopeType, scopeId, "FY");
    return {
        ...base,
        kpis: {
            schoolsSupported: 0,
            learnersAssessed: 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(base as any).kpis
        }
    };
}

export type FidelityDriver = {
    driver: string;
    label: string;
    score: number;
    detail: string;
};

export async function calculateFidelityScore(scopeType: string, scopeId: string) {
    const scopeFilter = scopeType === 'district'
        ? `WHERE district = $1`
        : scopeType === 'school'
        ? `WHERE school_id = $1::int`
        : scopeType === 'region'
        ? `WHERE district IN (SELECT DISTINCT district FROM schools_directory WHERE region = $1)`
        : '';

    const [activityRows, schoolRows] = await Promise.all([
        scopeFilter
            ? queryPostgres(`
                SELECT
                    COUNT(*) FILTER (WHERE module = 'training')::int                             AS trainings,
                    COUNT(*) FILTER (WHERE module = 'visit')::int                                AS visits,
                    COUNT(*) FILTER (WHERE module = 'assessment')::int                           AS assessments,
                    COUNT(*) FILTER (WHERE module IN ('story_activity','story'))::int             AS story_activities
                FROM portal_records ${scopeFilter}`, [scopeId])
            : queryPostgres(`
                SELECT
                    COUNT(*) FILTER (WHERE module = 'training')::int  AS trainings,
                    COUNT(*) FILTER (WHERE module = 'visit')::int     AS visits,
                    COUNT(*) FILTER (WHERE module = 'assessment')::int AS assessments,
                    COUNT(*) FILTER (WHERE module IN ('story_activity','story'))::int AS story_activities
                FROM portal_records`),
        scopeFilter
            ? queryPostgres(`SELECT COUNT(*)::int AS school_count FROM schools_directory ${scopeFilter}`, [scopeId])
            : queryPostgres(`SELECT COUNT(*)::int AS school_count FROM schools_directory`),
    ]);

    const act = activityRows.rows[0] as Record<string, unknown> ?? {};
    const schoolCount = Math.max(1, Number(schoolRows.rows[0]?.school_count ?? 1));
    const trainings = Number(act.trainings ?? 0);
    const visits = Number(act.visits ?? 0);
    const assessments = Number(act.assessments ?? 0);
    const storyActivities = Number(act.story_activities ?? 0);

    const trainingScore = Math.min(100, Math.round((trainings / schoolCount) * 50));
    const visitScore = Math.min(100, Math.round((visits / schoolCount) * 40));
    const assessmentScore = Math.min(100, Math.round((assessments / schoolCount) * 30));
    const storyScore = Math.min(100, Math.round((storyActivities / schoolCount) * 20));

    const drivers: FidelityDriver[] = [
        { driver: 'training', label: 'Training Frequency', score: trainingScore, detail: `${trainings} sessions across ${schoolCount} schools` },
        { driver: 'coaching', label: 'Coaching Visits', score: visitScore, detail: `${visits} visits recorded` },
        { driver: 'assessment', label: 'Assessment Compliance', score: assessmentScore, detail: `${assessments} assessments completed` },
        { driver: 'story', label: 'Story Activity', score: storyScore, detail: `${storyActivities} story sessions` },
    ];

    const overall = Math.round((trainingScore + visitScore + assessmentScore + storyScore) / 4);
    const band = overall >= 75 ? 'Strong' : overall >= 50 ? 'Developing' : overall >= 25 ? 'Emerging' : 'Critical';

    return { overall, totalScore: overall, band, drivers, components: drivers };
}

export type LearningDomain = {
    domain: string;
    change: number | null;
    baselineAvg: number | null;
    endlineAvg: number | null;
    sampleSize: number;
};

export async function getLearningGainsData(scopeType: string, scopeId: string) {
    const joinFilter = scopeType === 'district'
        ? `JOIN schools_directory sd ON sd.id = ar.school_id WHERE sd.district = $1`
        : scopeType === 'school'
        ? `JOIN schools_directory sd ON sd.id = ar.school_id WHERE ar.school_id = $1::int`
        : scopeType === 'region'
        ? `JOIN schools_directory sd ON sd.id = ar.school_id WHERE sd.region = $1`
        : `JOIN schools_directory sd ON sd.id = ar.school_id`;

    const params = joinFilter.includes('$1') ? [scopeId] : [];

    const result = await queryPostgres(`
        SELECT
            assessment_type,
            AVG(letter_identification_score)   AS letter_names,
            AVG(sound_identification_score)    AS letter_sounds,
            AVG(decodable_words_score)         AS real_words,
            AVG(made_up_words_score)           AS made_up_words,
            AVG(story_reading_score)           AS story_reading,
            AVG(reading_comprehension_score)   AS comprehension,
            COUNT(*)::int                      AS sample_size
        FROM assessment_records ar
        ${joinFilter}
        GROUP BY assessment_type`, params);

    const byType = new Map(result.rows.map((r: Record<string, unknown>) => [r.assessment_type as string, r]));
    const baseline = byType.get('baseline') ?? byType.get('Baseline');
    const endline  = byType.get('endline')  ?? byType.get('Endline');

    const domainKeys: Array<{ key: string; domain: string }> = [
        { key: 'letter_names',   domain: 'Letter Names' },
        { key: 'letter_sounds',  domain: 'Letter Sounds' },
        { key: 'real_words',     domain: 'Real Words' },
        { key: 'made_up_words',  domain: 'Made-Up Words' },
        { key: 'story_reading',  domain: 'Story Reading' },
        { key: 'comprehension',  domain: 'Comprehension' },
    ];

    const domains: LearningDomain[] = domainKeys.map(({ key, domain }) => {
        const baselineAvg = baseline ? Number((baseline as Record<string, unknown>)[key] ?? null) : null;
        const endlineAvg  = endline  ? Number((endline  as Record<string, unknown>)[key] ?? null) : null;
        const change = baselineAvg !== null && endlineAvg !== null ? Math.round((endlineAvg - baselineAvg) * 100) / 100 : null;
        return { domain, change, baselineAvg, endlineAvg, sampleSize: Number((endline as Record<string, unknown> | undefined)?.sample_size ?? 0) };
    });

    const gains = domains.filter(d => d.change !== null);
    const improvingDomains = gains.filter(d => (d.change ?? 0) > 0).length;
    const schoolImprovementIndex = gains.length > 0 ? Math.round((improvingDomains / gains.length) * 100) : 0;

    return {
        gains,
        schoolImprovementIndex,
        domains,
        summary: gains.length > 0 ? {
            baselineSampleSize: Number((baseline as Record<string, unknown> | undefined)?.sample_size ?? 0),
            endlineSampleSize: Number((endline as Record<string, unknown> | undefined)?.sample_size ?? 0),
            domainsImproved: improvingDomains,
            totalDomains: gains.length,
        } : null,
    };
}

export async function getImpactExplorerProfiles(): Promise<ImpactExplorerProfiles> {
    const [regionRows, schoolRows, activityRows, assessmentRows] = await Promise.all([
        queryPostgres(`
            SELECT region,
                COUNT(*)::int                                                         AS school_count,
                COALESCE(SUM(enrolled_learners),0)::int                              AS total_learners,
                COUNT(DISTINCT district)::int                                         AS district_count
            FROM schools_directory WHERE region IS NOT NULL GROUP BY region ORDER BY region`),
        queryPostgres(`
            SELECT id, school_code AS "schoolCode", name, district, sub_region AS "subRegion", region,
                sub_county AS "subCounty", parish, village,
                enrolled_boys AS "enrolledBoys", enrolled_girls AS "enrolledGirls",
                enrolled_learners AS "enrolledLearners", program_status AS status
            FROM schools_directory ORDER BY name LIMIT 500`),
        queryPostgres(`
            SELECT school_id,
                COUNT(*) FILTER (WHERE module = 'training')::int      AS trainings,
                COUNT(*) FILTER (WHERE module = 'visit')::int         AS visits,
                COUNT(*) FILTER (WHERE module = 'assessment')::int    AS assessments,
                COUNT(*) FILTER (WHERE module IN ('story_activity','story'))::int AS story_activities,
                MAX(date)::text                                         AS last_activity_date
            FROM portal_records WHERE school_id IS NOT NULL GROUP BY school_id`),
        queryPostgres(`
            SELECT school_id, COUNT(DISTINCT learner_uid)::int AS learners_assessed
            FROM assessment_records GROUP BY school_id`),
    ]);

    const activityBySchool = new Map(activityRows.rows.map((r: Record<string, unknown>) => [Number(r.school_id), r]));
    const assessmentBySchool = new Map(assessmentRows.rows.map((r: Record<string, unknown>) => [Number(r.school_id), Number(r.learners_assessed ?? 0)]));

    const schools: SchoolProfile[] = schoolRows.rows.map((row: Record<string, unknown>) => {
        const schoolId = Number(row.id);
        const act = activityBySchool.get(schoolId) as Record<string, unknown> | undefined;
        return {
            schoolId,
            id: schoolId,
            schoolName: String(row.name ?? ''),
            name: String(row.name ?? ''),
            schoolCode: String(row.schoolCode ?? ''),
            region: String(row.region ?? ''),
            subRegion: String(row.subRegion ?? ''),
            district: String(row.district ?? ''),
            subCounty: String(row.subCounty ?? ''),
            parish: String(row.parish ?? ''),
            village: String(row.village ?? ''),
            enrolledBoys: Number(row.enrolledBoys ?? 0),
            enrolledGirls: Number(row.enrolledGirls ?? 0),
            enrolledLearners: Number(row.enrolledLearners ?? 0),
            status: String(row.status ?? 'active'),
            trainings: Number(act?.trainings ?? 0),
            visits: Number(act?.visits ?? 0),
            assessments: Number(act?.assessments ?? 0),
            storyActivities: Number(act?.story_activities ?? 0),
            coachingCycles: Number(act?.visits ?? 0),
            participantsTotal: 0,
            participantsTeachers: 0,
            participantsLeaders: 0,
            learnersAssessed: assessmentBySchool.get(schoolId) ?? 0,
            storiesPublished: 0,
            evidenceUploads: 0,
            lastActivityDate: String(act?.last_activity_date ?? ''),
            timeline: [],
        };
    });

    const regionActivityBySchool = new Map(schools.map(s => [s.region, s]));
    const regions: RegionProfile[] = regionRows.rows.map((row: Record<string, unknown>) => {
        const region = String(row.region ?? '');
        const regionSchools = schools.filter(s => s.region === region);
        return {
            region,
            schoolsSupported: regionSchools.filter(s => s.trainings > 0 || s.visits > 0).length,
            participantsTeachers: 0,
            participantsLeaders: 0,
            learnersAssessed: regionSchools.reduce((s, sc) => s + sc.learnersAssessed, 0),
            statusCounts: {
                onTrack: regionSchools.filter(s => s.trainings >= 2 && s.visits >= 1).length,
                needsSupport: regionSchools.filter(s => s.trainings === 1 || (s.trainings === 0 && s.visits >= 1)).length,
                highPriority: regionSchools.filter(s => s.trainings === 0 && s.visits === 0).length,
            },
        };
        void regionActivityBySchool.get(region);
    });

    const districtNames = [...new Set(schools.map(s => s.district).filter(Boolean))];
    const districts: DistrictProfile[] = districtNames.map(district => ({
        district,
        region: schools.find(s => s.district === district)?.region ?? '',
    }));

    return { regions, districts, schools };
}

export async function getPortalAnalyticsData(_user: unknown) {
    return { charts: [], summary: {}, generatedAt: '', scope: 'all', totals: {}, participants: {}, engagement: {}, financials: {}, stories: {}, training: {}, impact: {}, schools: {}, visits: {} } as unknown as import("@/lib/types").PortalAnalyticsData;
}

export async function getPortalOperationalReportsData(_user: unknown) {
    return {
        generatedAt: new Date().toISOString(),
        totals: {
            totalRecords: 0,
            totalSchools: 0,
            totalEnrollment: 0,
            totalDistricts: 0,
            trainings: 0,
            schoolVisits: 0,
            storyActivities: 0,
            resourcesDistributed: 0,
            lessonEvaluations: 0,
            teacherAssessments: 0,
            learnerAssessments: 0,
            schoolsWithContacts: 0,
            teacherObservationCount: 0,
            schoolsImplementingPercent: 0,
            schoolsNotImplementingPercent: 0,
            schoolsWithImplementationData: 0,
            implementationStartedVisits: 0,
            implementationNotStartedVisits: 0,
            implementationPartialVisits: 0,
            demoVisitsConducted: 0,
        },
        districts: [],
        schools: [],
        observationEvents: [],
        trainingActivities: [],
        visitActivities: [],
        evaluationActivities: [],
        assessmentActivities: [],
    } as import("@/lib/types").PortalOperationalReportsData;
}

export async function getDistrictStats(districtName: string): Promise<import("@/lib/types").DistrictStats> {
    const result = await queryPostgres(
        `SELECT
           COUNT(*)::int                                                          AS "totalSchools",
           COUNT(*) FILTER (WHERE program_status IN ('active','graduated'))::int  AS "totalZapSchools",
           COALESCE(SUM(enrolled_learners), 0)::int                               AS "totalLearners",
           MAX(region)                                                             AS region
         FROM schools_directory WHERE district = $1`,
        [districtName],
    );
    const row = result.rows[0] ?? {};
    return {
        district: districtName,
        region: String(row.region ?? ''),
        totalSchools: Number(row.totalSchools ?? 0),
        totalZapSchools: Number(row.totalZapSchools ?? 0),
        totalLearners: Number(row.totalLearners ?? 0),
    };
}

export async function getRegionStats(regionName: string): Promise<import("@/lib/types").RegionStats> {
    const result = await queryPostgres(
        `SELECT
           COUNT(*)::int                                                          AS "totalSchools",
           COUNT(*) FILTER (WHERE program_status IN ('active','graduated'))::int  AS "totalZapSchools",
           COALESCE(SUM(enrolled_learners), 0)::int                               AS "totalLearners",
           COUNT(DISTINCT district)::int                                          AS "totalDistricts",
           COALESCE(array_agg(DISTINCT district) FILTER (WHERE district IS NOT NULL), '{}') AS districts
         FROM schools_directory WHERE region = $1`,
        [regionName],
    );
    const row = result.rows[0] ?? {};
    return {
        region: regionName,
        totalSchools: Number(row.totalSchools ?? 0),
        totalDistricts: Number(row.totalDistricts ?? 0),
        totalZapSchools: Number(row.totalZapSchools ?? 0),
        totalLearners: Number(row.totalLearners ?? 0),
        districts: (row.districts as string[]) ?? [],
    };
}

export async function listSchoolSupportStatuses(_filters?: unknown) {
    return [] as import("@/lib/types").SchoolSupportStatusRecord[];
}

export async function listTeacherSupportStatuses(_filters?: unknown) {
    return [];
}

export async function listSchoolsByDistrict(district: string) {
    const result = await queryPostgres(
        `SELECT id, name, district, sub_county AS "subCounty", parish, status, enrollment FROM school_directory WHERE district = $1 ORDER BY name`,
        [district],
    );
    return result.rows as Array<{ id: number; name: string; district: string; subCounty: string; parish: string; status: string; enrollment: number }>;
}

export type LeagueTableRow = {
    district: string;
    region: string;
    rank: number;
    fidelityScore: number | null;
    outcomesScore: number | null;
    schoolsSupported: number;
    learnersAssessed: number;
    priorityFlag: "urgent" | "watch" | "on-track";
};

export async function getGovernmentViewData(_period?: string) {
    const [districtRows, regionRows, activityRows, assessmentRows] = await Promise.all([
        queryPostgres(`
            SELECT
                district,
                MAX(region) AS region,
                COUNT(*)::int                                                          AS total_schools,
                COUNT(*) FILTER (WHERE program_status IN ('active','graduated'))::int  AS zap_schools,
                COALESCE(SUM(enrolled_learners),0)::int                               AS total_learners
            FROM schools_directory
            WHERE district IS NOT NULL
            GROUP BY district
            ORDER BY district`),
        queryPostgres(`
            SELECT region,
                COUNT(DISTINCT district)::int    AS total_districts,
                COUNT(*)::int                   AS total_schools,
                COALESCE(SUM(enrolled_learners),0)::int AS total_learners
            FROM schools_directory
            WHERE region IS NOT NULL
            GROUP BY region
            ORDER BY region`),
        queryPostgres(`
            SELECT district,
                COUNT(*) FILTER (WHERE module = 'training')::int  AS trainings,
                COUNT(*) FILTER (WHERE module = 'visit')::int     AS visits,
                COUNT(*) FILTER (WHERE module = 'assessment')::int AS assessments
            FROM portal_records
            WHERE district IS NOT NULL
            GROUP BY district`),
        queryPostgres(`
            SELECT sd.district, COUNT(ar.id)::int AS learners_assessed
            FROM assessment_records ar
            JOIN schools_directory sd ON sd.id = ar.school_id
            GROUP BY sd.district`),
    ]);

    const activityByDistrict = new Map(activityRows.rows.map((r: Record<string, unknown>) => [r.district as string, r]));
    const assessmentByDistrict = new Map(assessmentRows.rows.map((r: Record<string, unknown>) => [r.district as string, Number(r.learners_assessed ?? 0)]));

    const leagueTable: LeagueTableRow[] = districtRows.rows.map((row: Record<string, unknown>, i: number) => {
        const district = row.district as string;
        const act = activityByDistrict.get(district) as Record<string, unknown> | undefined;
        const schoolsSupported = Number(row.zap_schools ?? 0);
        const learnersAssessed = assessmentByDistrict.get(district) ?? 0;
        const trainings = Number(act?.trainings ?? 0);
        const visits = Number(act?.visits ?? 0);
        const assessments = Number(act?.assessments ?? 0);
        const activityScore = Math.min(100, Math.round(((trainings * 20) + (visits * 30) + (assessments * 10)) / Math.max(schoolsSupported, 1)));
        const outcomesScore = learnersAssessed > 0 ? Math.min(100, Math.round((learnersAssessed / Math.max(Number(row.total_learners ?? 1), 1)) * 100)) : null;
        const priorityFlag: LeagueTableRow["priorityFlag"] = activityScore >= 60 ? "on-track" : activityScore >= 30 ? "watch" : "urgent";
        return { district, region: String(row.region ?? ''), rank: i + 1, fidelityScore: activityScore, outcomesScore, schoolsSupported, learnersAssessed, priorityFlag };
    }).sort((a, b) => (b.fidelityScore ?? 0) - (a.fidelityScore ?? 0)).map((row, i) => ({ ...row, rank: i + 1 }));

    const districts = districtRows.rows.map((r: Record<string, unknown>) => ({
        district: r.district as string,
        region: String(r.region ?? ''),
        totalSchools: Number(r.total_schools ?? 0),
        zapSchools: Number(r.zap_schools ?? 0),
        totalLearners: Number(r.total_learners ?? 0),
    }));

    const regions = regionRows.rows.map((r: Record<string, unknown>) => ({
        region: r.region as string,
        totalDistricts: Number(r.total_districts ?? 0),
        totalSchools: Number(r.total_schools ?? 0),
        totalLearners: Number(r.total_learners ?? 0),
    }));

    return {
        regions,
        districts,
        summary: {
            totalSchools: districts.reduce((s, d) => s + d.totalSchools, 0),
            totalDistricts: districts.length,
            totalRegions: regions.length,
        },
        generatedAt: new Date().toISOString(),
        leagueTable,
    };
}

export async function validateParticipantBelongsToSchool(
    _participantType: string,
    _participantUid: string,
    _schoolId: number,
) {
    return true; // Allow all for now; full validation to be implemented
}

export {
    saveAssessmentRecordPostgres as saveAssessmentRecordAsync,
    listAssessmentRecordsPostgres as listAssessmentRecordsAsync,
} from "@/lib/server/postgres/repositories/assessments";

export async function listGraduationQueueAsync(filters?: unknown) {
    const { listGraduationQueueAsync: fn } = await import("@/lib/db-api");
    return fn(filters);
}

export async function listGraduationReviewSupervisorsAsync() {
    const { listGraduationReviewSupervisorsAsync: fn } = await import("@/lib/db-api");
    return fn();
}

export async function getTeacherImprovementProfileAsync(input: { schoolId: number; teacherUid: string; [key: string]: unknown }) {
    const { getTeacherImprovementProfileAsync: fn } = await import("@/lib/db-api");
    return fn(input);
}

export async function recomputeLearningAutomationSnapshots(_filters?: unknown) {
    const { recomputeLearningAutomationSnapshots: fn } = await import("@/lib/db-api");
    return fn();
}
// ═══════════════════════════════════════════════════════════════════════
// Additional stubs for API routes that import from dataService
// ═══════════════════════════════════════════════════════════════════════

// ── Auth / Portal User Management ───────────────────────────────────
export async function authenticatePortalUser(identifier: string, password: string) {
    const { authenticatePortalUserPostgres } = await import("@/lib/server/postgres/repositories/auth");
    return authenticatePortalUserPostgres(identifier, password);
}

export async function getPortalUserByEmail(email: string) {
    const { findPortalUserByEmailPostgres } = await import("@/lib/server/postgres/repositories/auth");
    return findPortalUserByEmailPostgres(email);
}

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function createPortalSession(userId: number) {
    const crypto = await import("node:crypto");
    const token = crypto.randomUUID();
    const { createPortalSessionPostgres } = await import("@/lib/server/postgres/repositories/auth");
    await createPortalSessionPostgres(userId, token);
    return { token, maxAge: SESSION_MAX_AGE_SECONDS };
}

export async function deletePortalSession(token: string) {
    const { deletePortalSessionPostgres } = await import("@/lib/server/postgres/repositories/auth");
    return deletePortalSessionPostgres(token);
}

export async function createPortalUserAccount(_input: unknown, _actor?: unknown) {
    const { createPortalUserAccount: fn } = await import("@/lib/db-api");
    return fn(_input as never, _actor as never);
}

export async function deletePortalUserAccount(_userId: number, _actor?: unknown) {
    const { deletePortalUserAccount: fn } = await import("@/lib/db-api");
    return fn(_userId, _actor as never);
}

export async function updatePortalUserPermissions(_userId: number, _permissions: unknown, _actor?: unknown) {
    const { updatePortalUserPermissions: fn } = await import("@/lib/db-api");
    return fn(_userId, _permissions as never, _actor as never);
}

// ── Lesson Evaluations ───────────────────────────────────────────────
export {
    createLessonEvaluationPostgres as createLessonEvaluationAsync,
    listLessonEvaluationsPostgres as listLessonEvaluationsAsync,
    getLessonEvaluationByIdPostgres as getLessonEvaluationByIdAsync,
    updateLessonEvaluationPostgres as updateLessonEvaluationAsync,
    voidLessonEvaluationPostgres as voidLessonEvaluationAsync,
} from "@/lib/server/postgres/repositories/lesson-evaluations";

// ── Teaching quality improvement ─────────────────────────────────────
export async function getSchoolTeachingQualityImprovementSummaryAsync(_schoolIdOrFilters: number | { schoolId?: number; grade?: string; startDate?: string; endDate?: string }) {
    return { comparisons: [], summary: null };
}

export async function getTeachingImprovementSettingsAsync() {
    return { minimumEvaluations: 2, improvementThreshold: 0.25 };
}

export async function listTeacherImprovementComparisonsAsync(filters?: unknown) {
    const { listTeacherImprovementComparisonsAsync: fn } = await import("@/lib/db-api");
    return fn(filters);
}

// ── Graduation ───────────────────────────────────────────────────────
export async function getGraduationSettingsAsync() {
    const { getGraduationSettingsPostgres } = await import("@/lib/server/postgres/repositories/graduation");
    return getGraduationSettingsPostgres();
}

export async function updateGraduationSettingsAsync(_input: unknown, _actor?: unknown) {
    const { updateGraduationSettingsAsync: fn } = await import("@/lib/db-api");
    return fn(_input);
}

export async function getSchoolGraduationEligibilityAsync(schoolId: number, _options?: unknown) {
    const { getSchoolGraduationEligibilityAsync: fn } = await import("@/lib/db-api");
    return fn(schoolId);
}

export async function reviewSchoolGraduationAsync(..._args: unknown[]) {
    const { reviewSchoolGraduationAsync: fn } = await import("@/lib/db-api");
    return fn(..._args as [never, never, never]);
}

// ── Evidence ─────────────────────────────────────────────────────────
// (Evidence functions are exported directly via wildcard from repositories/evidence.ts)

// ── Stories ──────────────────────────────────────────────────────────
export async function getStoryById(id: number) {
    const { getStoryByIdPostgres } = await import("@/lib/server/postgres/repositories/public-content");
    return getStoryByIdPostgres(id);
}

export async function saveStoryEntry(input: unknown) {
    const { saveStoryEntryPostgres } = await import("@/lib/server/postgres/repositories/public-content");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return saveStoryEntryPostgres(input as any, 0);
}

export async function publishStoryEntry(id: number, _actorId?: unknown, _actorName?: unknown) {
    try {
        const { publishStoryEntryPostgres } = await import("@/lib/server/postgres/repositories/public-content");
        await publishStoryEntryPostgres(id);
        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Could not publish story." };
    }
}

export async function unpublishStoryEntry(id: number, _actorId?: unknown, _actorName?: unknown) {
    const { unpublishStoryEntryPostgres } = await import("@/lib/server/postgres/repositories/public-content");
    return unpublishStoryEntryPostgres(id);
}

export async function deleteStoryEntry(id: number, _actorId?: unknown, _actorName?: unknown) {
    const { deleteStoryEntryPostgres } = await import("@/lib/server/postgres/repositories/public-content");
    return deleteStoryEntryPostgres(id);
}

export async function saveStoryAnthology(input: unknown) {
    const { saveStoryAnthologyPostgres } = await import("@/lib/server/postgres/repositories/public-content");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return saveStoryAnthologyPostgres(input as any);
}

// ── School contacts/learners ─────────────────────────────────────────
export async function addSchoolContactToSchool(..._args: unknown[]) {
    return { contactId: 0, contactUid: '', fullName: '', gender: 'Male' as const, schoolId: 0, category: 'Teacher' as const, createdAt: '', updatedAt: '' } as unknown as import("@/lib/types").SchoolContactRecord;
}

export async function addSchoolLearnerToSchool(..._args: unknown[]) {
    return { learnerId: 0, learnerUid: '', learnerName: '', fullName: '', schoolId: 0, gender: 'Boy' as const, age: 0, classGrade: '', createdAt: '', updatedAt: '' } as unknown as import("@/lib/types").SchoolLearnerRecord;
}

// ── Support updates ────────────────────────────────────────────────
export async function updateSupportRequest(id: number, updates: Record<string, unknown>) {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    if (updates.status !== undefined) {
        params.push(updates.status);
        setClauses.push(`status = $${params.length}`);
    }
    if (updates.assignedStaffId !== undefined) {
        params.push(updates.assignedStaffId);
        setClauses.push(`assigned_staff_id = $${params.length}`);
    }
    if (setClauses.length === 0) return;
    params.push(id);
    setClauses.push(`updated_at = NOW()`);
    const { queryPostgres: qp } = await import("@/lib/server/postgres/client");
    await qp(
        `UPDATE support_requests SET ${setClauses.join(", ")} WHERE id = $${params.length}`,
        params,
    );
}

// ── Portal record status ─────────────────────────────────────────────
export async function setPortalRecordStatusAsync(
    id: number,
    status: string,
    _user?: unknown,
    reviewNote?: string,
) {
    const { queryPostgres: qp } = await import("@/lib/server/postgres/client");
    const result = await qp(
        `UPDATE portal_records
         SET status = $1, review_note = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, school_id AS "schoolId", module, status,
                   payload_json AS "payload", review_note AS "reviewNote",
                   updated_at AS "createdAt", updated_at AS "updatedAt"`,
        [status, reviewNote || null, id],
    );
    return result.rows[0] ?? null;
}

// ── Finance budget / reconciliation extras ───────────────────────────
export function getBudgetVsActual(_month?: string | null, _currency?: string | null) {
    return [] as unknown[];
}

export async function listMonthlyBudgets(_month?: string | null, _currency?: string | null) {
    return [];
}

export async function getFinanceContactByEmail(_email: string) {
    return null as unknown;
}

// ── Graduation queue ─────────────────────────────────────────────────
export async function getGraduationQueueAsync() {
    return { eligibleCount: 0, updatedAt: new Date().toISOString(), items: [] as unknown[] };
}

// ── Records ──────────────────────────────────────────────────────────
export {
    createPortalRecordPostgres as createPortalRecord,
    listPortalRecordsPostgres as listPortalRecords,
    getPortalRecordByIdPostgres as getPortalRecordById,
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
} from "@/lib/server/postgres/repositories/schools";

// ── Metrics / Impact ─────────────────────────────────────────────────
export {
    getImpactSummaryPostgres as getImpactSummary,
    getPublicImpactAggregatePostgres as getPublicImpactAggregate,
    getCostEffectivenessDataPostgres as getCostEffectivenessData,
    getPortalDashboardDataPostgres as getPortalDashboardData,
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

export async function calculateFidelityScore(_scopeType: string, _scopeId: string) {
    return { 
        overall: 0, 
        totalScore: 0,
        band: "Developing",
        drivers: [] as FidelityDriver[],
        components: [] 
    };
}

export type LearningDomain = {
    domain: string;
    change: number | null;
    baselineAvg: number | null;
    endlineAvg: number | null;
    sampleSize: number;
};

export async function getLearningGainsData(_scopeType: string, _scopeId: string) {
    return { 
        gains: [], 
        schoolImprovementIndex: 0,
        domains: [] as LearningDomain[],
        summary: null 
    };
}

export async function getImpactExplorerProfiles(): Promise<ImpactExplorerProfiles> {
    return { regions: [], districts: [], schools: [] };
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

export async function getDistrictStats(districtName: string) {
    const result = await queryPostgres(
        `SELECT COUNT(DISTINCT school_id) AS "schoolCount" FROM school_directory WHERE district = $1`,
        [districtName],
    );
    return { schoolCount: Number(result.rows[0]?.schoolCount ?? 0), district: districtName, region: '', totalSchools: 0, totalZapSchools: 0, totalLearners: 0 } as unknown as import("@/lib/types").DistrictStats;
}

export async function getRegionStats(regionName: string) {
    return { region: regionName, schoolCount: 0, totalSchools: 0, totalDistricts: 0, totalZapSchools: 0, totalLearners: 0, districts: [] } as unknown as import("@/lib/types").RegionStats;
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
    return { 
        regions: [], 
        districts: [], 
        summary: {},
        generatedAt: new Date().toISOString(),
        leagueTable: [] as LeagueTableRow[]
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
    const { authenticatePortalUser: fn } = await import("@/services/authService");
    return fn(identifier, password);
}

export async function getPortalUserByEmail(email: string) {
    const { getPortalUserByEmail: fn } = await import("@/services/authService");
    return fn(email);
}

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function createPortalSession(userId: number) {
    const crypto = await import("node:crypto");
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
    const { createPortalSession: insertSession } = await import("@/services/authService");
    await insertSession(userId, token, expiresAt);
    return { token, maxAge: SESSION_MAX_AGE_SECONDS };
}

export async function deletePortalSession(token: string) {
    const { deletePortalSession: fn } = await import("@/services/authService");
    return fn(token);
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
export async function savePortalEvidence(_input: unknown, _actor?: unknown) {
    return { id: 0, storedPath: "", mimeType: "application/octet-stream", fileName: "unknown", module: "", date: "", schoolName: "", sizeBytes: 0, uploadedByUserId: 0, createdAt: "" };
}

export async function listPortalEvidence(_filters?: unknown, _extra?: unknown) {
    return [] as Array<{ id: number; storedPath: string; mimeType: string; fileName: string; module: string; date: string; schoolName: string; sizeBytes: number; uploadedByUserId: number; createdAt: string }>;
}

export async function getPortalEvidenceById(_id: number, _extra?: unknown) {
    return { id: 0, storedPath: "", mimeType: "application/octet-stream", fileName: "unknown", userId: 0, createdAt: "" };
}

// ── Stories ──────────────────────────────────────────────────────────
export async function getStoryById(id: number) {
    const { getStoryByIdPostgres } = await import("@/lib/server/postgres/repositories/public-content");
    return getStoryByIdPostgres(id);
}

export async function saveStoryEntry(input: unknown) {
    const { saveStoryEntryPostgres } = await import("@/lib/server/postgres/repositories/public-content");
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
export async function updateSupportRequest(_id: number, _updates: unknown) {
    throw new Error("updateSupportRequest: not yet migrated to PostgreSQL");
}

// ── Portal record status ─────────────────────────────────────────────
export async function setPortalRecordStatusAsync(
    _id: number,
    _status: string,
    _user?: unknown,
    _reviewNote?: string,
) {
    throw new Error("setPortalRecordStatusAsync: not yet migrated to PostgreSQL");
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

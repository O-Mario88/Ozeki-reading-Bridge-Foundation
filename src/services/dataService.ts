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
    schoolName: string;
    region: string;
    district: string;
    enrolledBoys: number;
    enrolledGirls: number;
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
    return { charts: [], summary: {} };
}

export async function getPortalOperationalReportsData(_user: unknown) {
    return { reports: [] };
}

export async function getDistrictStats(districtName: string) {
    const result = await queryPostgres(
        `SELECT COUNT(DISTINCT school_id) AS "schoolCount" FROM school_directory WHERE district = $1`,
        [districtName],
    );
    return { schoolCount: Number(result.rows[0]?.schoolCount ?? 0), district: districtName };
}

export async function getRegionStats(regionName: string) {
    return { region: regionName, schoolCount: 0 };
}

export async function listSchoolSupportStatuses(_filters?: unknown) {
    return [];
}

export async function listTeacherSupportStatuses(_filters?: unknown) {
    return [];
}

export async function listSchoolsByDistrict(district: string) {
    const result = await queryPostgres(
        `SELECT id, name FROM school_directory WHERE district = $1 ORDER BY name`,
        [district],
    );
    return result.rows;
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

export async function getGovernmentViewData() {
    return { 
        regions: [], 
        districts: [], 
        summary: {},
        generatedAt: new Date().toISOString(),
        leagueTable: [] as LeagueTableRow[]
    };
}

export async function validateParticipantBelongsToSchool(
    _participantUid: string,
    _schoolId: number,
) {
    return true; // Allow all for now; full validation to be implemented
}

export async function listAssessmentRecordsAsync(filters?: { userId?: number; limit?: number }) {
    const { listAssessmentRecordsAsync: fn } = await import("@/lib/db-api");
    return fn(filters);
}

export async function saveAssessmentRecordAsync(input: unknown, actor: unknown) {
    const { saveAssessmentRecordAsync: fn } = await import("@/lib/db-api");
    return fn(input, actor as never);
}

export async function listGraduationQueueAsync(filters?: unknown) {
    const { listGraduationQueueAsync: fn } = await import("@/lib/db-api");
    return fn(filters);
}

export async function listGraduationReviewSupervisorsAsync() {
    const { listGraduationReviewSupervisorsAsync: fn } = await import("@/lib/db-api");
    return fn();
}

export async function getTeacherImprovementProfileAsync(input: { schoolId: number; teacherUid: string }) {
    const { getTeacherImprovementProfileAsync: fn } = await import("@/lib/db-api");
    return fn(input);
}

export async function recomputeLearningAutomationSnapshots() {
    const { recomputeLearningAutomationSnapshots: fn } = await import("@/lib/db-api");
    return fn();
}
// ═══════════════════════════════════════════════════════════════════════
// Additional stubs for API routes that import from dataService
// ═══════════════════════════════════════════════════════════════════════

// ── Auth / Portal User Management ───────────────────────────────────
export async function authenticatePortalUser(_email: string, _password: string) {
    // Auth is handled by portal-auth module; this stub prevents compile errors
    throw new Error("authenticatePortalUser: use portal-auth module instead");
}

export async function getPortalUserByEmail(email: string) {
    const result = await queryPostgres(
        `SELECT id, full_name AS "fullName", email, phone, role, geography_scope AS "geographyScope",
         is_supervisor AS "isSupervisor", is_me AS "isME", is_admin AS "isAdmin", is_superadmin AS "isSuperAdmin"
         FROM portal_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email],
    );
    return result.rows[0] ?? null;
}

export async function createPortalSession(_userId: number) {
    throw new Error("createPortalSession: not yet migrated to PostgreSQL");
}

export async function deletePortalSession(_token: string) {
    throw new Error("deletePortalSession: not yet migrated to PostgreSQL");
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
export async function createLessonEvaluationAsync(input: unknown, actor: unknown) {
    const { createLessonEvaluationAsync: fn } = await import("@/lib/db-api");
    return fn(input, actor as never);
}

export async function listLessonEvaluationsAsync(filters?: unknown) {
    const { listLessonEvaluationsAsync: fn } = await import("@/lib/db-api");
    return fn(filters as never);
}

export async function getLessonEvaluationByIdAsync(id: number) {
    const { getLessonEvaluationByIdAsync: fn } = await import("@/lib/db-api");
    return fn(id);
}

export async function updateLessonEvaluationAsync(id: number, input: unknown, actor: unknown) {
    const { updateLessonEvaluationAsync: fn } = await import("@/lib/db-api");
    return fn(id, input, actor as never);
}

export async function voidLessonEvaluationAsync(id: number, _reason: string, actor: unknown) {
    const { voidLessonEvaluationAsync: fn } = await import("@/lib/db-api");
    return fn(id, actor as never);
}

// ── Teaching quality improvement ─────────────────────────────────────
export async function getSchoolTeachingQualityImprovementSummaryAsync(_schoolId: number) {
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

export async function updateGraduationSettingsAsync(_input: unknown) {
    const { updateGraduationSettingsAsync: fn } = await import("@/lib/db-api");
    return fn(_input);
}

export async function getSchoolGraduationEligibilityAsync(schoolId: number) {
    const { getSchoolGraduationEligibilityAsync: fn } = await import("@/lib/db-api");
    return fn(schoolId);
}

export async function reviewSchoolGraduationAsync(schoolId: number, decision: unknown, actor: unknown) {
    const { reviewSchoolGraduationAsync: fn } = await import("@/lib/db-api");
    return fn(schoolId, decision, actor as never);
}

// ── Evidence ─────────────────────────────────────────────────────────
export async function savePortalEvidence(_input: unknown, _actor: unknown) {
    throw new Error("savePortalEvidence: not yet migrated to PostgreSQL");
}

export async function listPortalEvidence(_filters?: unknown) {
    return [];
}

export async function getPortalEvidenceById(_id: number) {
    return null;
}

// ── Stories ──────────────────────────────────────────────────────────
export async function getStoryById(_id: number) {
    return null;
}

export async function publishStoryEntry(_id: number, _actor: unknown) {
    throw new Error("publishStoryEntry: not yet migrated to PostgreSQL");
}

export async function unpublishStoryEntry(_id: number, _actor: unknown) {
    throw new Error("unpublishStoryEntry: not yet migrated to PostgreSQL");
}

export async function deleteStoryEntry(_id: number, _actor: unknown) {
    throw new Error("deleteStoryEntry: not yet migrated to PostgreSQL");
}

export async function saveStoryAnthology(_input: unknown, _actor: unknown) {
    throw new Error("saveStoryAnthology: not yet migrated to PostgreSQL");
}

// ── School contacts/learners ─────────────────────────────────────────
export async function addSchoolContactToSchool(_schoolId: number, _input: unknown) {
    throw new Error("addSchoolContactToSchool: not yet migrated — use createSchoolContactInSchool instead");
}

export async function addSchoolLearnerToSchool(_schoolId: number, _input: unknown) {
    throw new Error("addSchoolLearnerToSchool: not yet migrated — use createSchoolLearnerInSchool instead");
}

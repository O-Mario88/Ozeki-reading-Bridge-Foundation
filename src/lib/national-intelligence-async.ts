import {
  PortalUser,
  NationalReportPreset,
  NlisGeoScopeType,
  BenchmarkRuleInput,
  BenchmarkProfileRecord,
  InterventionPlanRecord,
} from "./types";
import { IntelligenceService as service } from "@/services/intelligenceService";

export async function listBenchmarkProfilesAsync() {
  return service.listBenchmarkProfiles();
}

export async function listBenchmarkRulesAsync(benchmarkId: number) {
  return service.listBenchmarkRules(benchmarkId);
}

export async function createBenchmarkProfileAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  profile: Partial<BenchmarkProfileRecord>;
  [key: string]: unknown;
}) {
  return service.upsertBenchmarkProfile({
    user: args.user,
    input: args.profile as any,
  });
}

export async function updateBenchmarkProfileAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  profile: Partial<BenchmarkProfileRecord>;
  [key: string]: unknown;
}) {
  return service.upsertBenchmarkProfile({
    user: args.user,
    input: args.profile as any,
  });
}

export async function upsertBenchmarkRuleAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  rule: BenchmarkRuleInput;
  [key: string]: unknown;
}) {
  return service.upsertBenchmarkRule({
    user: args.user,
    input: args.rule,
  });
}

export async function listEducationAuditExceptionsAsync(filters: {
  scopeType?: string;
  scopeId?: string;
  status?: string;
  limit?: number;
  [key: string]: unknown;
}) {
  return service.listEducationAuditExceptions({
    scopeType: filters.scopeType as NlisGeoScopeType,
    scopeId: filters.scopeId,
    status: filters.status as any,
    limit: filters.limit,
  });
}

export async function resolveEducationAuditExceptionAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  exceptionId: number;
  resolutionNotes: string;
  [key: string]: unknown;
}) {
  return service.resolveEducationAuditException({
    user: { ...args.user, isSuperAdmin: false },
    exceptionId: args.exceptionId,
    status: "resolved",
    notes: args.resolutionNotes,
  });
}

export async function listDataQualitySummariesAsync(filters: {
  scopeType?: string;
  scopeId?: string;
  periodKey?: string;
  limit?: number;
}) {
  return service.listDataQualitySummaries({
    scopeType: filters.scopeType as NlisGeoScopeType,
    scopeId: filters.scopeId,
    periodKey: filters.periodKey,
    limit: filters.limit,
  });
}

export async function runEducationDataQualitySweepAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  scopeType: NlisGeoScopeType | string;
  scopeId: string;
}) {
  return service.runEducationDataQualitySweep({ ...args, scopeType: args.scopeType as NlisGeoScopeType });
}

export async function listPortalUsersForAssignmentsAsync() {
  return service.listPortalUsersForAssignments();
}

export async function assignPriorityQueueItemAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  schoolId: number;
  periodKey?: string;
  ownerUserId: number;
  notes?: string;
}) {
  return service.assignPriorityQueueItem(args);
}

export async function getNationalInsightsAsync(args: {
  scopeType: NlisGeoScopeType | string;
  scopeId?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  return service.getNationalInsights({ ...args, scopeType: args.scopeType as NlisGeoScopeType, scopeId: args.scopeId ?? '', periodStart: args.periodStart, periodEnd: args.periodEnd });
}

export async function computeInterventionCoverageAsync(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  return service.computeInterventionCoverage(args);
}

export async function buildNationalReportFactsAsync(args: {
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  return service.buildNationalReportFacts(args);
}

export async function getPartnerImpactDatasetAsync(args: {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  return service.getPartnerImpactDataset(args);
}

export async function runNationalNightlyJobsAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
}) {
  return service.runNationalNightlyJobs(args);
}

export async function listInterventionPlansAsync(filters: {
  scopeType?: string;
  scopeId?: string;
  status?: string;
  limit?: number;
}) {
  return service.listInterventionPlans({
    scopeType: filters.scopeType as any,
    scopeId: filters.scopeId,
    status: filters.status as any,
    limit: filters.limit,
  });
}

export async function getInterventionPlanByIdAsync(planId: number) {
  return service.getInterventionPlanById(planId);
}

export async function upsertInterventionPlanAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  plan: any;
  actions: any[];
}) {
  return service.upsertInterventionPlan(args);
}

export async function addInterventionActionAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: any;
}) {
  return service.addInterventionAction(args);
}

export async function updateInterventionActionAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  actionId: number;
  input: any;
}) {
  return service.updateInterventionAction({
    user: args.user,
    actionId: args.actionId,
    input: args.input,
  });
}

export async function listSchoolsForScopeAsync(
  scopeType: NlisGeoScopeType,
  scopeId: string
) {
  return service.listSchoolsForScope(scopeType, scopeId);
}

export async function getNationalReportPdfAsync(reportCode: string) {
  return service.getNationalReportPdf(reportCode);
}

export function listInterventionActionTypes() {
  return service.listInterventionActionTypes();
}

export function listNationalReportPresets() {
  return service.listNationalReportPresets();
}

export function assertPartnerScopeAllowed(args: any) {
  return service.assertPartnerScopeAllowed(args);
}

export async function authenticatePartnerApiKeyAsync(apiKeyHash: string) {
  return service.authenticatePartnerApiKey(apiKeyHash);
}

export async function logPartnerExportAsync(args: any) {
  return service.logPartnerExport(args);
}

export function buildPartnerImpactCsv(data: any) {
  return service.buildPartnerImpactCsv(data);
}

export async function listNationalReportPacksAsync(filters: any) {
  return service.listNationalReportPacks(filters);
}

export async function generateNationalReportPackAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  return service.generateNationalReportPack(args);
}

export async function listInterventionActionsAsync(planId: number) {
  return service.listInterventionActions(planId);
}

export async function listPartnerApiClientsAsync() {
  return service.listPartnerApiClients();
}

export async function createPartnerApiClientAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  input: {
    partnerName: string;
    allowedScopeType: string;
    allowedScopeIds: string[];
  };
}) {
  return service.createPartnerApiClient(args);
}

export async function setPartnerApiClientActiveAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  clientId: number;
  active: boolean;
}) {
  return service.setPartnerApiClientActive(args);
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
  return service.createInterventionPlan(args);
}

export async function createInterventionPlanFromPriorityAsync(args: {
  user: Pick<PortalUser, "id" | "fullName">;
  item: {
    schoolId: number;
    schoolName: string;
    district: string;
    metrics: any;
    recommendedIntervention: string;
  };
}) {
  return service.createInterventionPlanFromPriority(args);
}

import {
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
  user: { id: number; fullName: string };
  profile: Partial<BenchmarkProfileRecord>;
  [key: string]: unknown;
}) {
  return service.upsertBenchmarkProfile({
    user: args.user,
    input: args.profile as BenchmarkProfileRecord,
  });
}

export async function updateBenchmarkProfileAsync(args: {
  user: { id: number; fullName: string };
  profile: Partial<BenchmarkProfileRecord>;
  [key: string]: unknown;
}) {
  return service.upsertBenchmarkProfile({
    user: args.user,
    input: args.profile as BenchmarkProfileRecord,
  });
}

export async function upsertBenchmarkRuleAsync(args: {
  user: { id: number; fullName: string };
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
    status: filters.status as "open" | "resolved" | "overridden" | undefined,
    limit: filters.limit,
  });
}

export async function resolveEducationAuditExceptionAsync(args: {
  user: { id: number; fullName: string };
  exceptionId: number;
  resolutionNotes?: string;
  notes?: string;
  status?: string;
  [key: string]: unknown;
}) {
  return service.resolveEducationAuditException({
    user: { ...args.user, isSuperAdmin: false },
    exceptionId: args.exceptionId,
    status: (args.status as "resolved") ?? "resolved",
    notes: args.resolutionNotes ?? args.notes ?? '',
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
  user: { id: number; fullName: string };
  scopeType: NlisGeoScopeType | string;
  scopeId: string;
}) {
  return service.runEducationDataQualitySweep({ ...args, scopeType: args.scopeType as NlisGeoScopeType });
}

export async function listPortalUsersForAssignmentsAsync() {
  return service.listPortalUsersForAssignments();
}

export async function assignPriorityQueueItemAsync(args: {
  user: { id: number; fullName: string };
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
  user: { id: number; fullName: string };
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
    scopeType: filters.scopeType as "district" | "school" | undefined,
    scopeId: filters.scopeId,
    status: filters.status as InterventionPlanRecord["status"],
    limit: filters.limit,
  });
}

export async function getInterventionPlanByIdAsync(planId: number) {
  return service.getInterventionPlanById(planId);
}

export async function upsertInterventionPlanAsync(args: {
  user: { id: number; fullName: string };
  plan: Partial<InterventionPlanRecord>;
  actions: any[];
}) {
  return service.upsertInterventionPlan({
    user: args.user,
    plan: args.plan as InterventionPlanRecord,
    actions: args.actions
  });
}

export async function addInterventionActionAsync(args: {
  user: { id: number; fullName: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
}) {
  return service.addInterventionAction(args);
}

export async function updateInterventionActionAsync(args: {
  user: { id: number; fullName: string };
  actionId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertPartnerScopeAllowed(args: any) {
  return service.assertPartnerScopeAllowed(args);
}

export async function authenticatePartnerApiKeyAsync(apiKeyHash: string) {
  return service.authenticatePartnerApiKey(apiKeyHash);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logPartnerExportAsync(args: any) {
  return service.logPartnerExport(args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildPartnerImpactCsv(data: any) {
  return service.buildPartnerImpactCsv(data);
}

export async function listNationalReportPacksAsync(filters: {
  scopeType?: string;
  scopeId?: string;
  [key: string]: unknown;
}) {
  return service.listNationalReportPacks(filters);
}

export async function generateNationalReportPackAsync(args: {
  user: { id: number; fullName: string };
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
  user: { id: number; fullName: string };
  input: {
    partnerName: string;
    allowedScopeType: string;
    allowedScopeIds: string[];
  };
}) {
  return service.createPartnerApiClient(args);
}

export async function setPartnerApiClientActiveAsync(args: {
  user: { id: number; fullName: string };
  clientId: number;
  active: boolean;
}) {
  return service.setPartnerApiClientActive(args);
}

export async function createInterventionPlanAsync(args: {
  user: { id: number; fullName: string };
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
  user: { id: number; fullName: string };
  item: {
    schoolId: number;
    schoolName: string;
    district: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metrics: any;
    recommendedIntervention: string;
  };
}) {
  return service.createInterventionPlanFromPriority(args);
}

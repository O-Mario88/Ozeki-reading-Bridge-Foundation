"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { PortalUser } from "@/lib/types";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";

type ScopeType =
  | "country"
  | "region"
  | "sub_region"
  | "district"
  | "sub_county"
  | "parish"
  | "school";

type UiTab =
  | "benchmarks"
  | "data_quality"
  | "insights"
  | "priority_queue"
  | "interventions"
  | "reports"
  | "partner_api";

interface PortalNationalIntelligenceManagerProps {
  currentUser: Pick<PortalUser, "id" | "role" | "isAdmin" | "isSuperAdmin" | "fullName">;
  defaultTab?: UiTab;
  defaultScopeType?: ScopeType;
  defaultScopeId?: string;
  defaultPeriodStart?: string;
  defaultPeriodEnd?: string;
}

interface BenchmarkProfile {
  benchmarkId: number;
  name: string;
  effectiveFromDate: string;
  effectiveToDate: string | null;
  notes: string | null;
  isActive: boolean;
  rulesCount: number;
}

interface BenchmarkRule {
  ruleId: number;
  benchmarkId: number;
  grade: string;
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
}

interface DataQualitySummary {
  scopeType: ScopeType;
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

interface DataQualityException {
  exceptionId: number;
  entityType: string;
  entityId: string;
  ruleCode: string;
  severity: "low" | "medium" | "high";
  message: string;
  status: "open" | "resolved" | "overridden";
  scopeType: ScopeType;
  scopeId: string;
  periodKey: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface PriorityQueueItem {
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

interface NationalInsights {
  scopeType: ScopeType;
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
  priorityQueue: PriorityQueueItem[];
}

interface InterventionPlan {
  planId: number;
  scopeType: "school" | "district";
  scopeId: string;
  schoolId: number | null;
  district: string | null;
  title: string;
  status: "planned" | "in_progress" | "completed" | "paused";
  createdByName: string;
  createdAt: string;
  totalActions: number;
  completedActions: number;
}

interface InterventionAction {
  actionId: number;
  planId: number;
  actionType: string;
  ownerUserId: number;
  ownerUserName: string;
  dueDate: string | null;
  status: "planned" | "in_progress" | "completed" | "paused";
  outcomeNotes: string | null;
}

interface ReportPack {
  reportId: number;
  reportCode: string;
  preset:
    | "National Quarterly Snapshot"
    | "District Literacy Brief"
    | "School Coaching Pack"
    | "Annual National Report";
  scopeType: ScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  generatedByName: string;
  pdfUrl: string | null;
}

interface PartnerClient {
  clientId: number;
  partnerName: string;
  allowedScopeType: ScopeType;
  allowedScopeIds: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface AssignableUser {
  id: number;
  fullName: string;
  role: string;
}

const tabLabels: Array<{ key: UiTab; label: string }> = [
  { key: "benchmarks", label: "Benchmarks" },
  { key: "data_quality", label: "Data Quality" },
  { key: "insights", label: "National Insights" },
  { key: "priority_queue", label: "Priority Queue" },
  { key: "interventions", label: "Interventions" },
  { key: "reports", label: "Report Packs" },
  { key: "partner_api", label: "Partner API" },
];

const scopeOptions: ScopeType[] = [
  "country",
  "region",
  "sub_region",
  "district",
  "sub_county",
  "parish",
  "school",
];

const gradeOptions = ["ALL", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const actionTypes = [
  "Remedial & Catch-up program",
  "Teacher coaching cycle",
  "Teacher catch-up training",
  "Leadership mentoring",
  "Assessment support",
  "1001 Story activation/publishing support",
] as const;

const reportPresets = [
  "National Quarterly Snapshot",
  "District Literacy Brief",
  "School Coaching Pack",
  "Annual National Report",
] as const;

function getDefaultPeriodStart() {
  return `${new Date().getUTCFullYear()}-01-01`;
}

function getDefaultPeriodEnd() {
  return new Date().toISOString().slice(0, 10);
}

export function PortalNationalIntelligenceManager({
  currentUser,
  defaultTab = "insights",
  defaultScopeType = "country",
  defaultScopeId = "Uganda",
  defaultPeriodStart,
  defaultPeriodEnd,
}: PortalNationalIntelligenceManagerProps) {
  const canManageSuperAdminOnly = currentUser.isSuperAdmin;
  const canManagePartnerClients = currentUser.isSuperAdmin || currentUser.isAdmin;

  const [activeTab, setActiveTab] = useState<UiTab>(defaultTab);
  const [scopeType, setScopeType] = useState<ScopeType>(defaultScopeType);
  const [scopeId, setScopeId] = useState(defaultScopeId);
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart ?? getDefaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd ?? getDefaultPeriodEnd());

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [profiles, setProfiles] = useState<BenchmarkProfile[]>([]);
  const [rulesByBenchmark, setRulesByBenchmark] = useState<Record<string, BenchmarkRule[]>>({});
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<number | null>(null);

  const [summaries, setSummaries] = useState<DataQualitySummary[]>([]);
  const [exceptions, setExceptions] = useState<DataQualityException[]>([]);

  const [insights, setInsights] = useState<NationalInsights | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  const [plans, setPlans] = useState<InterventionPlan[]>([]);
  const [actionsByPlan, setActionsByPlan] = useState<Record<string, InterventionAction[]>>({});

  const [reports, setReports] = useState<ReportPack[]>([]);
  const [clients, setClients] = useState<PartnerClient[]>([]);

  const [newProfileName, setNewProfileName] = useState("UG-RLv2");
  const [newProfileStart, setNewProfileStart] = useState(getDefaultPeriodEnd());
  const [newProfileNotes, setNewProfileNotes] = useState("");

  const [ruleGrade, setRuleGrade] = useState<(typeof gradeOptions)[number]>("ALL");
  const [ruleLanguage, setRuleLanguage] = useState("English");
  const [ruleEmergentMax, setRuleEmergentMax] = useState(19);
  const [ruleMinimumMax, setRuleMinimumMax] = useState(39);
  const [ruleCompetentMax, setRuleCompetentMax] = useState(59);
  const [ruleStrongMax, setRuleStrongMax] = useState(999);
  const [ruleCompType, setRuleCompType] = useState<"percent" | "count">("percent");
  const [ruleCompPercent, setRuleCompPercent] = useState(70);
  const [ruleCompCorrect, setRuleCompCorrect] = useState(4);
  const [ruleCompTotal, setRuleCompTotal] = useState(5);
  const [ruleAccuracyFloor, setRuleAccuracyFloor] = useState("90");

  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanScopeType, setNewPlanScopeType] = useState<"school" | "district">("school");
  const [newPlanScopeId, setNewPlanScopeId] = useState("Uganda");

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [newActionType, setNewActionType] = useState<(typeof actionTypes)[number]>(
    "Teacher coaching cycle",
  );
  const [newActionOwner, setNewActionOwner] = useState("");
  const [newActionDueDate, setNewActionDueDate] = useState(getDefaultPeriodEnd());

  const [newReportPreset, setNewReportPreset] = useState<(typeof reportPresets)[number]>(
    "National Quarterly Snapshot",
  );

  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerScopeType, setNewPartnerScopeType] = useState<ScopeType>("district");
  const [newPartnerScopeIds, setNewPartnerScopeIds] = useState("");
  const [createdPartnerApiKey, setCreatedPartnerApiKey] = useState<string | null>(null);

  const profileOptions = useMemo(
    () => profiles.map((profile) => ({ value: profile.benchmarkId, label: profile.name })),
    [profiles],
  );

  async function loadBenchmarks() {
    setLoading(true);
    setFeedback("Loading benchmark profiles...");
    try {
      const response = await fetch("/api/portal/national-intelligence/benchmarks?includeRules=true");
      const json = (await response.json()) as {
        profiles?: BenchmarkProfile[];
        rulesByBenchmark?: Record<string, BenchmarkRule[]>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load benchmark profiles.");
      }
      const loadedProfiles = json.profiles ?? [];
      setProfiles(loadedProfiles);
      setRulesByBenchmark(json.rulesByBenchmark ?? {});
      if (!selectedBenchmarkId && loadedProfiles.length > 0) {
        setSelectedBenchmarkId(Number(loadedProfiles[0].benchmarkId));
      }
      setFeedback("Benchmark profiles loaded.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load benchmark profiles.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDataQuality() {
    setLoading(true);
    setFeedback("Loading data quality dashboard...");
    try {
      const response = await fetch(
        `/api/portal/national-intelligence/data-quality?scopeType=${encodeURIComponent(scopeType)}&scopeId=${encodeURIComponent(scopeId)}&limit=400`,
      );
      const json = (await response.json()) as {
        summaries?: DataQualitySummary[];
        exceptions?: DataQualityException[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load data quality records.");
      }
      setSummaries(json.summaries ?? []);
      setExceptions(json.exceptions ?? []);
      setFeedback("Data quality records loaded.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load data quality records.");
    } finally {
      setLoading(false);
    }
  }

  async function runSweep() {
    setLoading(true);
    setFeedback("Running education data quality sweep...");
    try {
      const response = await fetch("/api/portal/national-intelligence/data-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType, scopeId }),
      });
      const json = (await response.json()) as {
        result?: { runId: string; exceptionCounts: { open: number; high: number } };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not run data quality sweep.");
      }
      setFeedback(
        `Sweep completed (${json.result?.runId ?? "run"}). Open exceptions: ${json.result?.exceptionCounts.open ?? 0}.`,
      );
      await loadDataQuality();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not run data quality sweep.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    setLoading(true);
    setFeedback("Loading national insights and priority queue...");
    try {
      const response = await fetch(
        `/api/portal/national-intelligence/insights?scopeType=${encodeURIComponent(scopeType)}&scopeId=${encodeURIComponent(scopeId)}&periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}&includeAssignableUsers=true`,
      );
      const json = (await response.json()) as {
        insights?: NationalInsights;
        assignableUsers?: AssignableUser[];
        error?: string;
      };
      if (!response.ok || !json.insights) {
        throw new Error(json.error ?? "Could not load national insights.");
      }
      setInsights(json.insights);
      setAssignableUsers(json.assignableUsers ?? []);
      setFeedback("National insights loaded.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load national insights.");
    } finally {
      setLoading(false);
    }
  }

  async function assignPriority(item: PriorityQueueItem, ownerUserId: number) {
    setLoading(true);
    setFeedback(`Assigning ${item.schoolName}...`);
    try {
      const response = await fetch("/api/portal/national-intelligence/priority-queue/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: item.schoolId,
          periodKey: item.periodKey,
          ownerUserId,
          notes: "Assigned from Priority Queue dashboard.",
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Could not assign priority item.");
      }
      setFeedback(`Assigned ${item.schoolName}.`);
      await loadInsights();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not assign priority item.");
    } finally {
      setLoading(false);
    }
  }

  async function createPlanFromPriority(item: PriorityQueueItem) {
    setLoading(true);
    setFeedback(`Creating intervention plan for ${item.schoolName}...`);
    try {
      const response = await fetch("/api/portal/national-intelligence/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "from_priority",
          schoolId: item.schoolId,
          schoolName: item.schoolName,
          district: item.district,
          metrics: item.metrics,
          recommendedIntervention: item.recommendedIntervention,
        }),
      });
      const json = (await response.json()) as { plan?: InterventionPlan; error?: string };
      if (!response.ok || !json.plan) {
        throw new Error(json.error ?? "Could not create intervention plan from priority queue.");
      }
      setFeedback(`Intervention plan created for ${item.schoolName}.`);
      await loadInterventions();
      setActiveTab("interventions");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not create intervention plan from priority queue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadInterventions() {
    setLoading(true);
    setFeedback("Loading intervention plans...");
    try {
      const response = await fetch("/api/portal/national-intelligence/interventions?limit=500");
      const json = (await response.json()) as { plans?: InterventionPlan[]; error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load intervention plans.");
      }
      const loadedPlans = json.plans ?? [];
      setPlans(loadedPlans);
      if (!selectedPlanId && loadedPlans.length > 0) {
        setSelectedPlanId(Number(loadedPlans[0].planId));
      }
      setFeedback("Intervention plans loaded.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load intervention plans.");
    } finally {
      setLoading(false);
    }
  }

  async function loadActions(planId: number) {
    try {
      const response = await fetch(
        `/api/portal/national-intelligence/interventions/${encodeURIComponent(String(planId))}/actions`,
      );
      const json = (await response.json()) as {
        actions?: InterventionAction[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load intervention actions.");
      }
      setActionsByPlan((prev) => ({ ...prev, [String(planId)]: json.actions ?? [] }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load intervention actions.");
    }
  }

  async function createManualPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback("Creating intervention plan...");
    try {
      const response = await fetch("/api/portal/national-intelligence/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          scopeType: newPlanScopeType,
          scopeId: newPlanScopeId,
          schoolId: newPlanScopeType === "school" ? Number(newPlanScopeId) || null : null,
          district: newPlanScopeType === "district" ? newPlanScopeId : undefined,
          title: newPlanTitle,
          targetMetrics: {
            target_non_readers_lt_pct: 20,
            target_at20plus_delta_gt_pct: 10,
          },
        }),
      });
      const json = (await response.json()) as { plan?: InterventionPlan; error?: string };
      if (!response.ok || !json.plan) {
        throw new Error(json.error ?? "Could not create intervention plan.");
      }
      setFeedback(`Intervention plan created: ${json.plan.title}`);
      setNewPlanTitle("");
      await loadInterventions();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not create intervention plan.");
    } finally {
      setLoading(false);
    }
  }

  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlanId) {
      setFeedback("Select a plan before adding actions.");
      return;
    }
    const ownerUserId = Number(newActionOwner);
    if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) {
      setFeedback("Select an owner for the intervention action.");
      return;
    }

    setLoading(true);
    setFeedback("Adding intervention action...");
    try {
      const response = await fetch(
        `/api/portal/national-intelligence/interventions/${encodeURIComponent(String(selectedPlanId))}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: newActionType,
            ownerUserId,
            dueDate: newActionDueDate,
            status: "planned",
          }),
        },
      );
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Could not add intervention action.");
      }
      setFeedback("Intervention action added.");
      await loadActions(selectedPlanId);
      await loadInterventions();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not add intervention action.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReports() {
    setLoading(true);
    setFeedback("Loading national report packs...");
    try {
      const response = await fetch("/api/portal/national-intelligence/reports?limit=120");
      const json = (await response.json()) as {
        reports?: ReportPack[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load report packs.");
      }
      setReports(json.reports ?? []);
      setFeedback("National report packs loaded.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load report packs.");
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback("Generating national report pack...");
    try {
      const response = await fetch("/api/portal/national-intelligence/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: newReportPreset,
          scopeType,
          scopeId,
          periodStart,
          periodEnd,
        }),
      });
      const json = (await response.json()) as {
        report?: ReportPack;
        error?: string;
      };
      if (!response.ok || !json.report) {
        throw new Error(json.error ?? "Could not generate report pack.");
      }
      setReports((prev) => [json.report as ReportPack, ...prev]);
      setFeedback(`Generated report ${json.report.reportCode}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not generate report pack.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPartnerClients() {
    setLoading(true);
    setFeedback("Loading partner API clients...");
    try {
      const response = await fetch("/api/portal/national-intelligence/partner-clients");
      const json = (await response.json()) as {
        clients?: PartnerClient[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load partner API clients.");
      }
      setClients(json.clients ?? []);
      setFeedback("Partner API clients loaded.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load partner API clients.");
    } finally {
      setLoading(false);
    }
  }

  async function createPartnerClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManagePartnerClients) {
      setFeedback("Only Admin/Super Admin can create partner API clients.");
      return;
    }

    const allowedScopeIds = newPartnerScopeIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowedScopeIds.length === 0) {
      setFeedback("Provide at least one allowed scope id.");
      return;
    }

    setLoading(true);
    setFeedback("Creating partner API client...");
    setCreatedPartnerApiKey(null);
    try {
      const response = await fetch("/api/portal/national-intelligence/partner-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName: newPartnerName,
          allowedScopeType: newPartnerScopeType,
          allowedScopeIds,
        }),
      });
      const json = (await response.json()) as {
        created?: { clientId: number; apiKey: string };
        error?: string;
      };
      if (!response.ok || !json.created) {
        throw new Error(json.error ?? "Could not create partner API client.");
      }

      setCreatedPartnerApiKey(json.created.apiKey);
      setFeedback(`Partner API client created (ID ${json.created.clientId}).`);
      setNewPartnerName("");
      setNewPartnerScopeIds("");
      await loadPartnerClients();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not create partner API client.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePartnerClient(clientId: number, active: boolean) {
    setLoading(true);
    setFeedback("Updating partner API client status...");
    try {
      const response = await fetch("/api/portal/national-intelligence/partner-clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, active }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Could not update partner API client.");
      }
      setFeedback(`Partner API client ${active ? "enabled" : "disabled"}.`);
      await loadPartnerClients();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not update partner API client.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveException(exception: DataQualityException, status: "resolved" | "overridden") {
    const notes = window.prompt(
      status === "overridden"
        ? "Provide override reason (required):"
        : "Provide resolution notes (required):",
      "",
    );
    if (!notes || !notes.trim()) {
      return;
    }

    setLoading(true);
    setFeedback(`Updating exception ${exception.exceptionId}...`);
    try {
      const response = await fetch(
        `/api/portal/national-intelligence/data-quality/exceptions/${encodeURIComponent(String(exception.exceptionId))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes }),
        },
      );
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Could not update audit exception.");
      }
      setFeedback(`Exception ${exception.exceptionId} marked as ${status}.`);
      await loadDataQuality();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not update audit exception.");
    } finally {
      setLoading(false);
    }
  }

  async function createBenchmarkProfileForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageSuperAdminOnly) {
      setFeedback("Only Super Admin can manage benchmark versions.");
      return;
    }
    setLoading(true);
    setFeedback("Creating benchmark profile...");
    try {
      const response = await fetch("/api/portal/national-intelligence/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProfileName,
          effectiveFromDate: newProfileStart,
          notes: newProfileNotes,
          isActive: true,
        }),
      });
      const json = (await response.json()) as { profile?: BenchmarkProfile; error?: string };
      if (!response.ok || !json.profile) {
        throw new Error(json.error ?? "Could not create benchmark profile.");
      }
      setFeedback(`Created benchmark profile ${json.profile.name}.`);
      setSelectedBenchmarkId(json.profile.benchmarkId);
      await loadBenchmarks();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not create benchmark profile.");
    } finally {
      setLoading(false);
    }
  }

  async function setProfileActive(benchmarkId: number) {
    if (!canManageSuperAdminOnly) {
      setFeedback("Only Super Admin can activate benchmark versions.");
      return;
    }

    setLoading(true);
    setFeedback("Activating benchmark profile...");
    try {
      const response = await fetch("/api/portal/national-intelligence/benchmarks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmarkId, isActive: true }),
      });
      const json = (await response.json()) as { profile?: BenchmarkProfile; error?: string };
      if (!response.ok || !json.profile) {
        throw new Error(json.error ?? "Could not activate benchmark profile.");
      }
      setFeedback(`Activated benchmark profile ${json.profile.name}.`);
      await loadBenchmarks();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not activate benchmark profile.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageSuperAdminOnly) {
      setFeedback("Only Super Admin can manage benchmark rules.");
      return;
    }
    if (!selectedBenchmarkId) {
      setFeedback("Select a benchmark profile first.");
      return;
    }

    setLoading(true);
    setFeedback("Saving benchmark rule...");
    try {
      const optionalAccuracyFloor = ruleAccuracyFloor.trim() ? Number(ruleAccuracyFloor) : null;

      const response = await fetch("/api/portal/national-intelligence/benchmarks/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benchmarkId: selectedBenchmarkId,
          grade: ruleGrade,
          language: ruleLanguage,
          cwpmBands: {
            non_reader: 0,
            emergent: [1, Number(ruleEmergentMax)],
            minimum: [Number(ruleEmergentMax) + 1, Number(ruleMinimumMax)],
            competent: [Number(ruleMinimumMax) + 1, Number(ruleCompetentMax)],
            strong: [Number(ruleCompetentMax) + 1, Number(ruleStrongMax)],
          },
          comprehensionProficientRule:
            ruleCompType === "percent"
              ? { type: "percent", threshold: Number(ruleCompPercent) }
              : {
                type: "count",
                correct: Number(ruleCompCorrect),
                total: Number(ruleCompTotal),
              },
          optionalAccuracyFloor,
          domainProficiencyThresholds: {
            decoding: 45,
            fluency: 40,
            comprehension: 70,
          },
        }),
      });
      const json = (await response.json()) as {
        rules?: BenchmarkRule[];
        error?: string;
      };
      if (!response.ok || !json.rules) {
        throw new Error(json.error ?? "Could not save benchmark rule.");
      }
      setRulesByBenchmark((prev) => ({
        ...prev,
        [String(selectedBenchmarkId)]: json.rules ?? [],
      }));
      setFeedback("Benchmark rule saved.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not save benchmark rule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "benchmarks") {
      void loadBenchmarks();
      return;
    }
    if (activeTab === "data_quality") {
      void loadDataQuality();
      return;
    }
    if (activeTab === "insights" || activeTab === "priority_queue") {
      void loadInsights();
      return;
    }
    if (activeTab === "interventions") {
      void loadInterventions();
      return;
    }
    if (activeTab === "reports") {
      void loadReports();
      return;
    }
    if (activeTab === "partner_api") {
      void loadPartnerClients();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedPlanId && !actionsByPlan[String(selectedPlanId)]) {
      void loadActions(selectedPlanId);
    }
  }, [selectedPlanId]);

  const selectedRules = selectedBenchmarkId
    ? rulesByBenchmark[String(selectedBenchmarkId)] ?? []
    : [];

  return (
    <section className="card" style={{ padding: "1rem" }}>
      <header style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        {tabLabels
          .filter((tab) => (tab.key !== "partner_api" ? true : canManagePartnerClients))
          .map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "button" : "button button-ghost"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
      </header>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.85rem" }}>
        <div className="card" style={{ padding: "0.75rem" }}>
          <strong>Uganda Geo Scope</strong>
          <div style={{ display: "grid", gap: "0.55rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: "0.5rem" }}>
            <label>
              <span>Scope Type</span>
              <select value={scopeType} onChange={(event) => setScopeType(event.target.value as ScopeType)}>
                {scopeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Scope Id / Name</span>
              <input value={scopeId} onChange={(event) => setScopeId(event.target.value)} />
            </label>
            <label>
              <span>Period Start</span>
              <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </label>
            <label>
              <span>Period End</span>
              <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </label>
          </div>
        </div>

        {feedback ? (
          <p className="portal-muted" style={{ margin: 0 }}>
            {loading ? "Working... " : ""}
            {feedback}
          </p>
        ) : null}

        {activeTab === "benchmarks" ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Benchmark Profiles (Versioned)</h3>
              <p className="portal-muted">
                Super Admin can create and activate benchmark versions. Assessment auto-calculation reads active rule by grade/language.
              </p>
              <div className="table-wrap">
                <DashboardListHeader template="minmax(0,1.6fr) minmax(0,1.4fr) 80px 100px 110px">
                  <span>Name</span>
                  <span>Effective</span>
                  <span>Rules</span>
                  <span>Status</span>
                  <span>Action</span>
                </DashboardListHeader>
                {profiles.length === 0 ? (
                  <div className="portal-muted py-3">No benchmark profiles found.</div>
                ) : (
                  profiles.map((profile) => (
                    <DashboardListRow
                      key={profile.benchmarkId}
                      template="minmax(0,1.6fr) minmax(0,1.4fr) 80px 100px 110px"
                    >
                      <span className="min-w-0">
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => setSelectedBenchmarkId(profile.benchmarkId)}
                        >
                          {profile.name}
                        </button>
                      </span>
                      <span>
                        {profile.effectiveFromDate}
                        {profile.effectiveToDate ? ` → ${profile.effectiveToDate}` : " → ongoing"}
                      </span>
                      <span>{profile.rulesCount}</span>
                      <span>{profile.isActive ? "Active" : "Inactive"}</span>
                      <span>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => setProfileActive(profile.benchmarkId)}
                          disabled={!canManageSuperAdminOnly}
                        >
                          Activate
                        </button>
                      </span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Create Benchmark Version</h3>
              <form onSubmit={createBenchmarkProfileForm} style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label>
                  <span>Name</span>
                  <input value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} />
                </label>
                <label>
                  <span>Effective From</span>
                  <input type="date" value={newProfileStart} onChange={(event) => setNewProfileStart(event.target.value)} />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Notes</span>
                  <textarea rows={2} value={newProfileNotes} onChange={(event) => setNewProfileNotes(event.target.value)} />
                </label>
                <div>
                  <button type="submit" className="button" disabled={!canManageSuperAdminOnly || loading}>
                    Create + Activate
                  </button>
                </div>
              </form>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Grade/Language Rule</h3>
              <p className="portal-muted">
                Selected benchmark: {selectedBenchmarkId ? selectedBenchmarkId : "None"}
              </p>

              <form onSubmit={saveRule} style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                <label>
                  <span>Benchmark Profile</span>
                  <select
                    value={selectedBenchmarkId ?? ""}
                    onChange={(event) =>
                      setSelectedBenchmarkId(
                        Number(event.target.value) || null,
                      )
                    }
                  >
                    <option value="">Select...</option>
                    {profileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Grade</span>
                  <select value={ruleGrade} onChange={(event) => setRuleGrade(event.target.value as (typeof gradeOptions)[number])}>
                    {gradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Language</span>
                  <input value={ruleLanguage} onChange={(event) => setRuleLanguage(event.target.value)} />
                </label>

                <label>
                  <span>Emergent max CWPM</span>
                  <input type="number" value={ruleEmergentMax} onChange={(event) => setRuleEmergentMax(Number(event.target.value))} />
                </label>
                <label>
                  <span>Minimum max CWPM</span>
                  <input type="number" value={ruleMinimumMax} onChange={(event) => setRuleMinimumMax(Number(event.target.value))} />
                </label>
                <label>
                  <span>Competent max CWPM</span>
                  <input type="number" value={ruleCompetentMax} onChange={(event) => setRuleCompetentMax(Number(event.target.value))} />
                </label>
                <label>
                  <span>Strong max CWPM</span>
                  <input type="number" value={ruleStrongMax} onChange={(event) => setRuleStrongMax(Number(event.target.value))} />
                </label>

                <label>
                  <span>Comprehension Rule</span>
                  <select value={ruleCompType} onChange={(event) => setRuleCompType(event.target.value as "percent" | "count") }>
                    <option value="percent">Percent</option>
                    <option value="count">Count Correct</option>
                  </select>
                </label>
                {ruleCompType === "percent" ? (
                  <label>
                    <span>Percent Threshold</span>
                    <input type="number" value={ruleCompPercent} onChange={(event) => setRuleCompPercent(Number(event.target.value))} />
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Correct Answers</span>
                      <input type="number" value={ruleCompCorrect} onChange={(event) => setRuleCompCorrect(Number(event.target.value))} />
                    </label>
                    <label>
                      <span>Total Items</span>
                      <input type="number" value={ruleCompTotal} onChange={(event) => setRuleCompTotal(Number(event.target.value))} />
                    </label>
                  </>
                )}
                <label>
                  <span>Accuracy Floor (optional)</span>
                  <input value={ruleAccuracyFloor} onChange={(event) => setRuleAccuracyFloor(event.target.value)} />
                </label>
                <div>
                  <button type="submit" className="button" disabled={!canManageSuperAdminOnly || loading}>
                    Save Rule
                  </button>
                </div>
              </form>

              <details style={{ marginTop: "0.75rem" }}>
                <summary>Current Rules</summary>
                <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
                  <DashboardListHeader template="80px minmax(0,1fr) minmax(0,2fr) minmax(0,1.4fr) 130px">
                    <span>Grade</span>
                    <span>Language</span>
                    <span>CWPM Bands</span>
                    <span>Comprehension Rule</span>
                    <span>Accuracy Floor</span>
                  </DashboardListHeader>
                  {selectedRules.length === 0 ? (
                    <div className="portal-muted py-3">No rules yet.</div>
                  ) : (
                    selectedRules.map((rule) => (
                      <DashboardListRow
                        key={rule.ruleId}
                        template="80px minmax(0,1fr) minmax(0,2fr) minmax(0,1.4fr) 130px"
                      >
                        <span>{rule.grade}</span>
                        <span className="truncate">{rule.language}</span>
                        <span className="truncate">
                          0, {rule.cwpmBands.emergent[0]}-{rule.cwpmBands.emergent[1]},
                          {" "}
                          {rule.cwpmBands.minimum[0]}-{rule.cwpmBands.minimum[1]},
                          {" "}
                          {rule.cwpmBands.competent[0]}-{rule.cwpmBands.competent[1]},
                          {" "}
                          {rule.cwpmBands.strong[0]}+
                        </span>
                        <span className="truncate">
                          {rule.comprehensionProficientRule.type === "percent"
                            ? `${rule.comprehensionProficientRule.threshold}%`
                            : `${rule.comprehensionProficientRule.correct}/${rule.comprehensionProficientRule.total}`}
                        </span>
                        <span>{rule.optionalAccuracyFloor ?? "none"}</span>
                      </DashboardListRow>
                    ))
                  )}
                </div>
              </details>
            </section>
          </div>
        ) : null}

        {activeTab === "data_quality" ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Education Data Quality Center</h3>
              <p className="portal-muted">
                Nightly/on-demand checks for missingness, validity, consistency, coverage, and outliers.
              </p>
              <button type="button" className="button" onClick={runSweep} disabled={loading}>
                Run Audit Sweep
              </button>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Summary</h3>
              <div className="table-wrap">
                <DashboardListHeader template="minmax(0,1.2fr) 130px 120px minmax(0,2fr) minmax(0,1.4fr) 160px">
                  <span>Scope</span>
                  <span>Period</span>
                  <span>Completeness</span>
                  <span>Coverage</span>
                  <span>Open Exceptions</span>
                  <span>Updated</span>
                </DashboardListHeader>
                {summaries.length === 0 ? (
                  <div className="portal-muted py-3">No data-quality summary rows.</div>
                ) : (
                  summaries.map((summary) => (
                    <DashboardListRow
                      key={`${summary.scopeType}-${summary.scopeId}-${summary.periodKey}`}
                      template="minmax(0,1.2fr) 130px 120px minmax(0,2fr) minmax(0,1.4fr) 160px"
                    >
                      <span className="truncate">{summary.scopeType}:{summary.scopeId}</span>
                      <span>{summary.periodKey}</span>
                      <span>{summary.completenessPct}%</span>
                      <span className="truncate">
                        Schools {summary.coverageIndicators.schoolsWithBaseline}/{summary.coverageIndicators.schoolsTotal};
                        missing endline {summary.coverageIndicators.schoolsMissingEndline};
                        low districts {summary.coverageIndicators.districtsLowCoverage}
                      </span>
                      <span>
                        {summary.exceptionCounts.open}
                        {" "}
                        (H:{summary.exceptionCounts.high} M:{summary.exceptionCounts.medium} L:{summary.exceptionCounts.low})
                      </span>
                      <span>{new Date(summary.lastUpdated).toLocaleString()}</span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Exception Queue</h3>
              <div className="table-wrap">
                <DashboardListHeader template="80px 100px 130px minmax(0,1fr) 100px minmax(0,1.6fr) 200px">
                  <span>ID</span>
                  <span>Severity</span>
                  <span>Rule</span>
                  <span>Entity</span>
                  <span>Status</span>
                  <span>Message</span>
                  <span>Action</span>
                </DashboardListHeader>
                {exceptions.length === 0 ? (
                  <div className="portal-muted py-3">No audit exceptions.</div>
                ) : (
                  exceptions.map((exception) => (
                    <DashboardListRow
                      key={exception.exceptionId}
                      template="80px 100px 130px minmax(0,1fr) 100px minmax(0,1.6fr) 200px"
                    >
                      <span>{exception.exceptionId}</span>
                      <span>{exception.severity}</span>
                      <span className="truncate">{exception.ruleCode}</span>
                      <span className="truncate">{exception.entityType}:{exception.entityId}</span>
                      <span>{exception.status}</span>
                      <span className="truncate">{exception.message}</span>
                      <span>
                        {exception.status === "open" ? (
                          <span className="action-row">
                            <button
                              type="button"
                              className="button button-ghost"
                              onClick={() => void resolveException(exception, "resolved")}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className="button button-ghost"
                              onClick={() => void resolveException(exception, "overridden")}
                              disabled={!currentUser.isSuperAdmin}
                            >
                              Override
                            </button>
                          </span>
                        ) : (
                          <span className="portal-muted">Closed</span>
                        )}
                      </span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "insights" ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>National Insights Layer</h3>
              <button type="button" className="button" onClick={() => void loadInsights()}>
                Refresh Insights
              </button>
              {insights ? (
                <>
                  <div style={{ display: "grid", gap: "0.55rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: "0.75rem" }}>
                    <div className="card" style={{ padding: "0.7rem" }}>
                      <small>Non-reader reduction</small>
                      <strong>{insights.movement.nonReaderReductionPct}%</strong>
                    </div>
                    <div className="card" style={{ padding: "0.7rem" }}>
                      <small>Moved to 20+</small>
                      <strong>{insights.movement.movedTo20PlusPct}%</strong>
                    </div>
                    <div className="card" style={{ padding: "0.7rem" }}>
                      <small>Moved to 40+</small>
                      <strong>{insights.movement.movedTo40PlusPct}%</strong>
                    </div>
                    <div className="card" style={{ padding: "0.7rem" }}>
                      <small>Moved to 60+</small>
                      <strong>{insights.movement.movedTo60PlusPct}%</strong>
                    </div>
                    <div className="card" style={{ padding: "0.7rem" }}>
                      <small>Comprehension proficient delta</small>
                      <strong>{insights.movement.comprehensionProficientDeltaPct}%</strong>
                    </div>
                    <div className="card" style={{ padding: "0.7rem" }}>
                      <small>Sample size</small>
                      <strong>{insights.movement.sampleSize}</strong>
                    </div>
                  </div>

                  <div className="card" style={{ padding: "0.7rem", marginTop: "0.7rem" }}>
                    <strong>Aligned Drivers</strong>
                    <p className="portal-muted" style={{ marginTop: "0.4rem" }}>
                      Coaching freq/school: {insights.alignedDrivers.coachingFrequencyPerSchool}; teaching latest:
                      {" "}
                      {insights.alignedDrivers.teachingQualityLatestPct}%; teaching delta:
                      {" "}
                      {insights.alignedDrivers.teachingQualityDeltaPct}%; materials coverage:
                      {" "}
                      {insights.alignedDrivers.materialsCoveragePct}%; story participation:
                      {" "}
                      {insights.alignedDrivers.storyParticipationPct}%.
                    </p>
                    <small>{insights.alignedDrivers.disclaimer}</small>
                  </div>
                </>
              ) : null}
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Cohort Tracking (Baseline → Latest)</h3>
              <div className="table-wrap">
                <DashboardListHeader template="minmax(0,2fr) 130px 130px 100px">
                  <span>School</span>
                  <span>Baseline 20+</span>
                  <span>Latest 20+</span>
                  <span>Delta</span>
                </DashboardListHeader>
                {!insights || insights.cohortTracking.length === 0 ? (
                  <div className="portal-muted py-3">No cohort tracking rows.</div>
                ) : (
                  insights.cohortTracking.slice(0, 80).map((item) => (
                    <DashboardListRow
                      key={item.schoolId}
                      template="minmax(0,2fr) 130px 130px 100px"
                    >
                      <span className="truncate">{item.schoolName}</span>
                      <span>{item.baselineAt20PlusPct}%</span>
                      <span>{item.latestAt20PlusPct}%</span>
                      <span>{item.deltaPct >= 0 ? "+" : ""}{item.deltaPct}%</span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "priority_queue" ? (
          <div className="card" style={{ padding: "0.9rem" }}>
            <h3 style={{ marginTop: 0 }}>National Priority Queue (Early Warning)</h3>
            <button type="button" className="button" onClick={() => void loadInsights()}>
              Refresh Queue
            </button>
            <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
              <DashboardListHeader template="minmax(0,1.4fr) minmax(0,1.4fr) 70px 100px minmax(0,1.6fr) minmax(0,1.4fr) minmax(0,1.4fr) 130px">
                <span>School</span>
                <span>Geo</span>
                <span>Risk</span>
                <span>Priority</span>
                <span>Recommended Intervention</span>
                <span>Evidence</span>
                <span>Assignment</span>
                <span>Actions</span>
              </DashboardListHeader>
              {!insights || insights.priorityQueue.length === 0 ? (
                <div className="portal-muted py-3">No priority items.</div>
              ) : (
                insights.priorityQueue.map((item) => (
                  <DashboardListRow
                    key={`${item.schoolId}-${item.periodKey}`}
                    template="minmax(0,1.4fr) minmax(0,1.4fr) 70px 100px minmax(0,1.6fr) minmax(0,1.4fr) minmax(0,1.4fr) 130px"
                  >
                    <span className="truncate">{item.schoolName}</span>
                    <span className="truncate">{item.district} / {item.subRegion} / {item.region}</span>
                    <span>{item.riskScore}</span>
                    <span>{item.priorityLevel}</span>
                    <span className="truncate">{item.recommendedIntervention}</span>
                    <span className="truncate">{item.evidenceSummary}</span>
                    <span className="min-w-0">
                      {item.assignedOwnerName ? (
                        <span>
                          {item.assignedOwnerName}
                          <small className="block">{item.assignedAt ? new Date(item.assignedAt).toLocaleString() : ""}</small>
                        </span>
                      ) : (
                        <select
                          aria-label="Assign owner"
                          value=""
                          onChange={(event) => {
                            const ownerUserId = Number(event.target.value);
                            if (ownerUserId > 0) {
                              void assignPriority(item, ownerUserId);
                            }
                          }}
                        >
                          <option value="">Assign...</option>
                          {assignableUsers.map((assignable) => (
                            <option key={assignable.id} value={assignable.id}>
                              {assignable.fullName} ({assignable.role})
                            </option>
                          ))}
                        </select>
                      )}
                    </span>
                    <span>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => void createPlanFromPriority(item)}
                      >
                        Create Plan
                      </button>
                    </span>
                  </DashboardListRow>
                ))
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "interventions" ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Create Intervention Plan</h3>
              <form onSubmit={createManualPlan} style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label>
                  <span>Plan Title</span>
                  <input value={newPlanTitle} onChange={(event) => setNewPlanTitle(event.target.value)} required />
                </label>
                <label>
                  <span>Scope Type</span>
                  <select value={newPlanScopeType} onChange={(event) => setNewPlanScopeType(event.target.value as "school" | "district") }>
                    <option value="school">school</option>
                    <option value="district">district</option>
                  </select>
                </label>
                <label>
                  <span>Scope ID</span>
                  <input value={newPlanScopeId} onChange={(event) => setNewPlanScopeId(event.target.value)} required />
                </label>
                <div>
                  <button type="submit" className="button" disabled={loading}>
                    Create Plan
                  </button>
                </div>
              </form>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Intervention Plans</h3>
              <div className="table-wrap">
                <DashboardListHeader template="100px minmax(0,1.6fr) minmax(0,1.2fr) 110px 110px minmax(0,1.4fr)">
                  <span>ID</span>
                  <span>Title</span>
                  <span>Scope</span>
                  <span>Status</span>
                  <span>Progress</span>
                  <span>Created</span>
                </DashboardListHeader>
                {plans.length === 0 ? (
                  <div className="portal-muted py-3">No intervention plans.</div>
                ) : (
                  plans.map((plan) => (
                    <DashboardListRow
                      key={plan.planId}
                      template="100px minmax(0,1.6fr) minmax(0,1.2fr) 110px 110px minmax(0,1.4fr)"
                    >
                      <span>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => {
                            setSelectedPlanId(plan.planId);
                            void loadActions(plan.planId);
                          }}
                        >
                          {plan.planId}
                        </button>
                      </span>
                      <span className="truncate">{plan.title}</span>
                      <span className="truncate">{plan.scopeType}:{plan.scopeId}</span>
                      <span>{plan.status}</span>
                      <span>
                        {plan.completedActions}/{plan.totalActions}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{plan.createdByName}</span>
                        <small className="block truncate">{new Date(plan.createdAt).toLocaleString()}</small>
                      </span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Plan Actions</h3>
              <p className="portal-muted">
                Selected plan: {selectedPlanId ?? "none"}
              </p>

              <form onSubmit={createAction} style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label>
                  <span>Action Type</span>
                  <select value={newActionType} onChange={(event) => setNewActionType(event.target.value as (typeof actionTypes)[number])}>
                    {actionTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Owner</span>
                  <select value={newActionOwner} onChange={(event) => setNewActionOwner(event.target.value)}>
                    <option value="">Select...</option>
                    {assignableUsers.map((assignable) => (
                      <option key={assignable.id} value={assignable.id}>
                        {assignable.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Due Date</span>
                  <input type="date" value={newActionDueDate} onChange={(event) => setNewActionDueDate(event.target.value)} />
                </label>
                <div>
                  <button type="submit" className="button" disabled={loading || !selectedPlanId}>
                    Add Action
                  </button>
                </div>
              </form>

              <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
                <DashboardListHeader template="80px minmax(0,1.4fr) minmax(0,1fr) 110px 130px minmax(0,1.4fr)">
                  <span>ID</span>
                  <span>Action</span>
                  <span>Owner</span>
                  <span>Status</span>
                  <span>Due</span>
                  <span>Notes</span>
                </DashboardListHeader>
                {!selectedPlanId || !(actionsByPlan[String(selectedPlanId)]?.length) ? (
                  <div className="portal-muted py-3">No actions yet.</div>
                ) : (
                  actionsByPlan[String(selectedPlanId)]?.map((action) => (
                    <DashboardListRow
                      key={action.actionId}
                      template="80px minmax(0,1.4fr) minmax(0,1fr) 110px 130px minmax(0,1.4fr)"
                    >
                      <span>{action.actionId}</span>
                      <span className="truncate">{action.actionType}</span>
                      <span className="truncate">{action.ownerUserName}</span>
                      <span>{action.status}</span>
                      <span>{action.dueDate ?? "-"}</span>
                      <span className="truncate">{action.outcomeNotes ?? "-"}</span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "reports" ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Generate Government-Grade Report Pack</h3>
              <form onSubmit={generateReport} style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label>
                  <span>Preset</span>
                  <select value={newReportPreset} onChange={(event) => setNewReportPreset(event.target.value as (typeof reportPresets)[number])}>
                    {reportPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Scope Type</span>
                  <select value={scopeType} onChange={(event) => setScopeType(event.target.value as ScopeType)}>
                    {scopeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Scope ID</span>
                  <input value={scopeId} onChange={(event) => setScopeId(event.target.value)} />
                </label>
                <label>
                  <span>Period Start</span>
                  <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                </label>
                <label>
                  <span>Period End</span>
                  <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                </label>
                <div>
                  <button type="submit" className="button" disabled={loading}>
                    Generate Report
                  </button>
                </div>
              </form>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Report Packs</h3>
              <div className="table-wrap">
                <DashboardListHeader template="160px minmax(0,1.2fr) minmax(0,1.2fr) 200px minmax(0,1.4fr) 110px">
                  <span>Code</span>
                  <span>Preset</span>
                  <span>Scope</span>
                  <span>Period</span>
                  <span>Generated</span>
                  <span>Actions</span>
                </DashboardListHeader>
                {reports.length === 0 ? (
                  <div className="portal-muted py-3">No report packs generated yet.</div>
                ) : (
                  reports.map((report) => (
                    <DashboardListRow
                      key={report.reportCode}
                      template="160px minmax(0,1.2fr) minmax(0,1.2fr) 200px minmax(0,1.4fr) 110px"
                    >
                      <span className="truncate">{report.reportCode}</span>
                      <span className="truncate">{report.preset}</span>
                      <span className="truncate">{report.scopeType}:{report.scopeId}</span>
                      <span>{report.periodStart} to {report.periodEnd}</span>
                      <span className="min-w-0">
                        <span className="block truncate">{report.generatedByName}</span>
                        <small className="block truncate">{new Date(report.generatedAt).toLocaleString()}</small>
                      </span>
                      <span>
                        {report.pdfUrl ? (
                          <a className="button button-ghost" href={report.pdfUrl}>
                            PDF
                          </a>
                        ) : (
                          <span className="portal-muted">No PDF</span>
                        )}
                      </span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "partner_api" ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Create Partner API Client</h3>
              <p className="portal-muted">
                Partner endpoints are aggregated only and enforced by scope-type + scope-id whitelist.
              </p>
              <form onSubmit={createPartnerClient} style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label>
                  <span>Partner Name</span>
                  <input value={newPartnerName} onChange={(event) => setNewPartnerName(event.target.value)} required />
                </label>
                <label>
                  <span>Allowed Scope Type</span>
                  <select
                    value={newPartnerScopeType}
                    onChange={(event) => setNewPartnerScopeType(event.target.value as ScopeType)}
                  >
                    {scopeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Allowed Scope IDs (comma-separated)</span>
                  <input
                    value={newPartnerScopeIds}
                    onChange={(event) => setNewPartnerScopeIds(event.target.value)}
                    placeholder="Example: Arua, Gulu"
                    required
                  />
                </label>
                <div>
                  <button type="submit" className="button" disabled={!canManagePartnerClients || loading}>
                    Create API Client
                  </button>
                </div>
              </form>
              {createdPartnerApiKey ? (
                <div className="card" style={{ marginTop: "0.75rem", padding: "0.75rem", border: "1px solid #f59e0b" }}>
                  <strong>Generated API Key (copy now)</strong>
                  <pre style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap" }}>{createdPartnerApiKey}</pre>
                </div>
              ) : null}
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Partner Clients</h3>
              <div className="table-wrap">
                <DashboardListHeader template="80px minmax(0,1.4fr) minmax(0,1.6fr) 100px 160px 160px 100px">
                  <span>ID</span>
                  <span>Partner</span>
                  <span>Scope</span>
                  <span>Status</span>
                  <span>Created</span>
                  <span>Last Used</span>
                  <span>Action</span>
                </DashboardListHeader>
                {clients.length === 0 ? (
                  <div className="portal-muted py-3">No partner API clients.</div>
                ) : (
                  clients.map((client) => (
                    <DashboardListRow
                      key={client.clientId}
                      template="80px minmax(0,1.4fr) minmax(0,1.6fr) 100px 160px 160px 100px"
                    >
                      <span>{client.clientId}</span>
                      <span className="truncate">{client.partnerName}</span>
                      <span className="truncate">{client.allowedScopeType}: {client.allowedScopeIds.join(", ")}</span>
                      <span>{client.active ? "Active" : "Disabled"}</span>
                      <span>{new Date(client.createdAt).toLocaleString()}</span>
                      <span>{client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : "Never"}</span>
                      <span>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => void togglePartnerClient(client.clientId, !client.active)}
                          disabled={!canManagePartnerClients}
                        >
                          {client.active ? "Disable" : "Enable"}
                        </button>
                      </span>
                    </DashboardListRow>
                  ))
                )}
              </div>
            </section>

            <section className="card" style={{ padding: "0.9rem" }}>
              <h3 style={{ marginTop: 0 }}>Partner Endpoints</h3>
              <ul>
                <li><code>GET /api/partner/impact?scopeType=&amp;scopeId=</code></li>
                <li><code>GET /api/partner/reports?scopeType=&amp;scopeId=</code></li>
                <li><code>GET /api/partner/export/impact.csv?scopeType=&amp;scopeId=</code></li>
                <li><code>GET /api/partner/reports/&lt;reportCode&gt;/pdf</code></li>
              </ul>
              <small>
                Authenticate using <code>x-partner-key</code> or <code>Authorization: Bearer &lt;key&gt;</code>.
              </small>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}

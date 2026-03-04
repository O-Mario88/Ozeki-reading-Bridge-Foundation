import { getApplicableRecommendations } from "@/lib/recommendations";
import type {
  DomainGainData,
  PublicImpactAggregate,
} from "@/lib/types";

type SupportRequestUrgency = "this_term" | "next_term" | "high" | "medium" | "low";

export interface DataTrustSnapshot {
  completenessLabel: "Complete" | "Partial" | "Data not available";
  schoolsSupported: number | null;
  schoolsWithBaseline: number | null;
  schoolsWithEndlineOrLatest: number | null;
  sampleSize: number | null;
  toolVersion: string;
  lastUpdated: string | null;
}

export interface PriorityActionItem {
  id: string;
  priorityLabel: "High" | "Medium" | "Low";
  recTitle: string;
  why: string;
  actions: string[];
  successMetric: string;
  isFallback?: boolean;
}

type PrioritySignals = {
  fidelityScore: number | null;
  domainGains: Array<{ domain: string; change: number | null }>;
  schoolsMissingBaseline: number | null;
  schoolsMissingEndline: number | null;
  outlierCount: number | null;
  observationCoverage: number | null;
};

function toPriorityLabel(value: "high" | "medium" | "low"): "High" | "Medium" | "Low" {
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Low";
}

function hasUsableSignals(signals: PrioritySignals) {
  const hasFidelity = typeof signals.fidelityScore === "number";
  const hasDomain = signals.domainGains.some((item) => typeof item.change === "number");
  const hasCoverage =
    typeof signals.schoolsMissingBaseline === "number" ||
    typeof signals.schoolsMissingEndline === "number";
  return hasFidelity || hasDomain || hasCoverage;
}

function strongestDomainNeed(domainGains: Array<{ domain: string; change: number | null }>) {
  const ranked = domainGains
    .filter((item) => typeof item.change === "number")
    .sort((left, right) => (left.change as number) - (right.change as number));
  return ranked[0] ?? null;
}

function explainWhy(rec: {
  conditions: {
    fidelityBelow?: number;
    fidelityAbove?: number;
    domainGainBelow?: number;
    missingBaseline?: boolean;
    missingEndline?: boolean;
    lowObservation?: boolean;
    highOutliers?: boolean;
  };
}, signals: PrioritySignals) {
  const notes: string[] = [];

  if (
    typeof rec.conditions.fidelityBelow === "number" &&
    typeof signals.fidelityScore === "number"
  ) {
    notes.push(
      `Fidelity score (${signals.fidelityScore.toFixed(1)}%) is below the ${rec.conditions.fidelityBelow}% threshold.`,
    );
  }

  if (
    typeof rec.conditions.fidelityAbove === "number" &&
    typeof signals.fidelityScore === "number"
  ) {
    notes.push(
      `Fidelity score (${signals.fidelityScore.toFixed(1)}%) meets the positive threshold (${rec.conditions.fidelityAbove}%).`,
    );
  }

  if (rec.conditions.missingBaseline && typeof signals.schoolsMissingBaseline === "number") {
    notes.push(
      `${signals.schoolsMissingBaseline.toLocaleString()} schools are missing baseline coverage in this scope.`,
    );
  }

  if (rec.conditions.missingEndline && typeof signals.schoolsMissingEndline === "number") {
    notes.push(
      `${signals.schoolsMissingEndline.toLocaleString()} schools are missing endline/latest coverage in this scope.`,
    );
  }

  if (rec.conditions.highOutliers && typeof signals.outlierCount === "number") {
    notes.push(
      `${signals.outlierCount.toLocaleString()} outlier flags were detected in recent submissions.`,
    );
  }

  if (
    rec.conditions.lowObservation &&
    typeof signals.observationCoverage === "number"
  ) {
    notes.push(
      `Observation/coaching coverage is ${signals.observationCoverage.toFixed(1)}%, below the desired level.`,
    );
  }

  if (typeof rec.conditions.domainGainBelow === "number") {
    const need = strongestDomainNeed(signals.domainGains);
    if (need && typeof need.change === "number") {
      notes.push(
        `${need.domain} shows the weakest gain (${need.change >= 0 ? "+" : ""}${need.change.toFixed(1)}pp).`,
      );
    }
  }

  if (notes.length === 0) {
    return "Data-backed signal indicates this action should be prioritized now.";
  }

  return notes.join(" ");
}

function successMetricForCategory(category: string) {
  if (category === "coaching") {
    return "Coaching coverage and fidelity score improve in the next cycle.";
  }
  if (category === "assessment" || category === "data_quality") {
    return "Assessment completeness improves and missing baseline/endline counts decrease.";
  }
  if (category === "training") {
    return "Teacher implementation quality and routine adoption rise in follow-up observations.";
  }
  if (category === "intervention") {
    return "Reading-level movement and domain gains improve in the next assessment window.";
  }
  return "Target indicator shows a positive shift in the next reporting period.";
}

function fallbackActions(): PriorityActionItem[] {
  return [
    {
      id: "GEN-SAFE-001",
      priorityLabel: "Medium",
      recTitle: "Data not available",
      why: "Data not available for this scope and period.",
      actions: [
        "Confirm baseline and latest assessments are submitted for all active schools.",
        "Run one focused coaching cycle on core literacy routines this week.",
        "Review data completeness with district and school leads before next reporting cut-off.",
      ],
      successMetric: "Completeness status shifts to Complete and sample size increases.",
      isFallback: true,
    },
  ];
}

export function buildDataTrustSnapshot(payload: PublicImpactAggregate | null): DataTrustSnapshot {
  if (!payload) {
    return {
      completenessLabel: "Data not available",
      schoolsSupported: null,
      schoolsWithBaseline: null,
      schoolsWithEndlineOrLatest: null,
      sampleSize: null,
      toolVersion: "Data not available",
      lastUpdated: null,
    };
  }

  const toolVersion =
    payload.readingLevels?.definition_version || "RLv1.0";

  return {
    completenessLabel: payload.meta.dataCompleteness,
    schoolsSupported: payload.kpis.schoolsSupported,
    schoolsWithBaseline: payload.funnel.baselineAssessed,
    schoolsWithEndlineOrLatest: payload.funnel.endlineAssessed,
    sampleSize: payload.meta.sampleSize,
    toolVersion,
    lastUpdated: payload.meta.lastUpdated,
  };
}

export function buildPriorityActionsFromSignals(
  signals: PrioritySignals,
  max = 3,
): PriorityActionItem[] {
  if (!hasUsableSignals(signals)) {
    return fallbackActions();
  }

  const recommendations = getApplicableRecommendations({
    fidelityScore: signals.fidelityScore ?? 0,
    domainGains: signals.domainGains,
    schoolsMissingBaseline: Math.max(0, signals.schoolsMissingBaseline ?? 0),
    schoolsMissingEndline: Math.max(0, signals.schoolsMissingEndline ?? 0),
    outlierCount: Math.max(0, signals.outlierCount ?? 0),
    observationCoverage: signals.observationCoverage ?? 0,
  });

  if (recommendations.length === 0) {
    return fallbackActions();
  }

  return recommendations.slice(0, Math.max(1, Math.min(3, max))).map((rec) => ({
    id: rec.id,
    priorityLabel: toPriorityLabel(rec.priority),
    recTitle: rec.title,
    why: explainWhy(rec, signals),
    actions: rec.actions.slice(0, 4),
    successMetric: successMetricForCategory(rec.category),
  }));
}

export function buildPriorityActionsFromPublicAggregate(
  payload: PublicImpactAggregate | null,
  max = 3,
): PriorityActionItem[] {
  if (!payload) {
    return fallbackActions();
  }

  const safeOutcomes = (payload.outcomes ?? {}) as Record<
    string,
    { baseline: number | null; latest: number | null; endline?: number | null } | undefined
  >;
  const domainMap: Array<{ key: string; label: string }> = [
    { key: "letterNames", label: "Letter Names" },
    { key: "letterSounds", label: "Letter Sounds" },
    { key: "realWords", label: "Real Words" },
    { key: "madeUpWords", label: "Made Up Words" },
    { key: "storyReading", label: "Story Reading" },
    { key: "comprehension", label: "Comprehension" },
  ];
  const domainGains: Array<{ domain: string; change: number | null }> = domainMap.map(({ key, label }) => {
    const outcome = safeOutcomes[key];
    const baseline = outcome?.baseline ?? null;
    const latest = outcome?.latest ?? outcome?.endline ?? null;
    return {
      domain: label,
      change:
        latest !== null && baseline !== null
          ? Number((latest - baseline).toFixed(1))
          : null,
    };
  });

  const observationCoverage =
    payload.fidelity.drivers.find((item) => item.key === "coaching_coverage")?.score ?? null;

  const schoolsMissingBaseline = Math.max(
    0,
    (payload.kpis.schoolsSupported ?? 0) - (payload.funnel.baselineAssessed ?? 0),
  );
  const schoolsMissingEndline = Math.max(
    0,
    (payload.kpis.schoolsSupported ?? 0) - (payload.funnel.endlineAssessed ?? 0),
  );

  return buildPriorityActionsFromSignals(
    {
      fidelityScore: payload.fidelity.score,
      domainGains,
      schoolsMissingBaseline,
      schoolsMissingEndline,
      outlierCount: null,
      observationCoverage,
    },
    max,
  );
}

export function normalizeSupportUrgency(value: string): SupportRequestUrgency {
  const normalized = value.trim().toLowerCase();
  if (normalized === "this_term") return "this_term";
  if (normalized === "next_term") return "next_term";
  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  return "medium";
}

export function supportUrgencyLabel(value: SupportRequestUrgency) {
  if (value === "this_term") return "This term";
  if (value === "next_term") return "Next term";
  if (value === "high") return "High";
  if (value === "low") return "Low";
  return "Medium";
}

export function toDomainGainPairs(domains: DomainGainData[]) {
  return domains.map((domain) => ({
    domain: domain.domain,
    change: domain.change,
  }));
}

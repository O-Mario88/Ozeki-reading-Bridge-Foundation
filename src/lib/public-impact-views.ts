import type { PublicImpactAggregate } from "@/lib/types";

export interface AggregateFidelityView {
  scopeType: string;
  scopeId: string;
  totalScore: number;
  band: PublicImpactAggregate["fidelity"]["band"];
  drivers: Array<{
    driver: string;
    label: string;
    score: number;
    weight: number;
    detail: string;
  }>;
  sampleSize: number;
  period: string;
  lastUpdated: string;
}

export interface AggregateLearningDomainView {
  domain: string;
  baselineAvg: number | null;
  endlineAvg: number | null;
  change: number | null;
  sampleSize: number;
  belowBenchmarkPct: number | null;
  approachingPct: number | null;
  atBenchmarkPct: number | null;
}

export interface AggregateLearningGainsView {
  scopeType: string;
  scopeId: string;
  period: string;
  domains: AggregateLearningDomainView[];
  schoolImprovementIndex: number | null;
  readingLevels: PublicImpactAggregate["readingLevels"] | null;
  lastUpdated: string;
}

export interface AggregateQualitySummaryView {
  scopeType: string;
  scopeId: string;
  completenessScore: number;
  schoolsMissingBaseline: number;
  schoolsMissingEndline: number;
  outlierCount: number;
  duplicateLearnersDetected: number;
  lastChecked: string;
}

export function buildFidelityFromAggregate(
  aggregate: PublicImpactAggregate,
  scopeType: string,
  scopeId: string,
): AggregateFidelityView {
  return {
    scopeType,
    scopeId,
    totalScore: aggregate.fidelity.score,
    band: aggregate.fidelity.band,
    drivers: aggregate.fidelity.drivers.map((driver, index) => ({
      driver: driver.key,
      label: driver.label,
      score: driver.score,
      weight: 1 / Math.max(aggregate.fidelity.drivers.length, 1),
      detail: `Driver ${index + 1}`,
    })),
    sampleSize: aggregate.meta.sampleSize,
    period: aggregate.period.label,
    lastUpdated: aggregate.meta.lastUpdated,
  };
}

export function buildLearningGainsFromAggregate(
  aggregate: PublicImpactAggregate,
  scopeType: string,
  scopeId: string,
): AggregateLearningGainsView {
  const domainPairs: Array<{
    domain: string;
    values: PublicImpactAggregate["outcomes"][keyof PublicImpactAggregate["outcomes"]];
  }> = [
    { domain: "Letter Names", values: aggregate.outcomes.letterNames },
    { domain: "Letter Sounds", values: aggregate.outcomes.letterSounds },
    { domain: "Real Words", values: aggregate.outcomes.realWords },
    { domain: "Made Up Words", values: aggregate.outcomes.madeUpWords },
    { domain: "Story Reading", values: aggregate.outcomes.storyReading },
    { domain: "Comprehension", values: aggregate.outcomes.comprehension },
  ];

  const domains: AggregateLearningDomainView[] = domainPairs.map(({ domain, values }) => ({
    domain,
    baselineAvg: values.baseline,
    endlineAvg: values.latest ?? values.endline,
    change:
      typeof values.baseline === "number" &&
      typeof (values.latest ?? values.endline) === "number"
        ? Number(((values.latest ?? values.endline ?? 0) - values.baseline).toFixed(1))
        : null,
    sampleSize: values.n,
    belowBenchmarkPct:
      typeof values.benchmarkPct === "number"
        ? Math.max(0, Number((100 - values.benchmarkPct).toFixed(1)))
        : null,
    approachingPct: null,
    atBenchmarkPct: values.benchmarkPct ?? null,
  }));

  return {
    scopeType,
    scopeId,
    period: aggregate.period.label,
    domains,
    schoolImprovementIndex:
      aggregate.teachingLearningAlignment?.summary?.teachingDelta ?? null,
    readingLevels: aggregate.readingLevels ?? null,
    lastUpdated: aggregate.meta.lastUpdated,
  };
}

export function buildQualitySummaryFromAggregate(
  aggregate: PublicImpactAggregate,
  scopeType: string,
  scopeId: string,
): AggregateQualitySummaryView {
  return {
    scopeType,
    scopeId,
    completenessScore:
      aggregate.meta.dataCompleteness === "Complete"
        ? 100
        : Math.round(aggregate.kpis.assessmentCycleCompletionPct),
    schoolsMissingBaseline: Math.max(
      aggregate.kpis.schoolsSupported - aggregate.kpis.assessmentsBaselineCount,
      0,
    ),
    schoolsMissingEndline: Math.max(
      aggregate.kpis.schoolsSupported - aggregate.kpis.assessmentsEndlineCount,
      0,
    ),
    outlierCount: 0,
    duplicateLearnersDetected: 0,
    lastChecked: aggregate.meta.lastUpdated,
  };
}

export function buildImpactKpisFromAggregate(aggregate: PublicImpactAggregate) {
  return {
    schoolsSupported: aggregate.kpis.schoolsSupported,
    teachersSupported:
      aggregate.kpis.teachersSupportedMale + aggregate.kpis.teachersSupportedFemale,
    learnersAssessed: aggregate.kpis.learnersAssessedUnique,
    improvementIndex:
      aggregate.teachingLearningAlignment?.summary?.teachingDelta ?? null,
  };
}

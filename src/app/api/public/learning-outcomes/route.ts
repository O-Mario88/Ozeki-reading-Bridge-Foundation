import { NextResponse } from "next/server";
import {
  getDataCompletenessKpi,
  getDataQualityBreakdown,
  getDomainPerformance,
  getFilterOptions,
  getGenderParityOutcomes,
  getGeographyComparison,
  getLearnersAssessedKpi,
  getLearningOutcomesTrend,
  getLessonStructureAdherence,
  getMovedUpKpi,
  getReadingProgressionTrend,
  getObservationDomainBreakdown,
  getPrioritySupportAreas,
  getReadingLevelsDistribution,
  getReadingProficiencyKpi,
  getRubricCriteriaBreakdown,
  getTeachingQualityIndexKpi,
  getTopPerformingGeographies,
  MIN_PUBLIC_SAMPLE_SIZE,
  type PublicOutcomesFilters,
} from "@/lib/server/postgres/repositories/public-learning-outcomes";

export const runtime = "nodejs";
export const revalidate = 600;

function parseFilters(searchParams: URLSearchParams): PublicOutcomesFilters {
  const opt = (k: string) => searchParams.get(k)?.trim() || undefined;
  return {
    period: opt("period"),
    region: opt("region"),
    subRegion: opt("subRegion"),
    district: opt("district"),
    subCounty: opt("subCounty"),
    parish: opt("parish"),
    programme: opt("programme"),
  };
}

function buildKeyInsights(input: {
  proficiency: { current: number; deltaPp: number };
  movedUp: { rate: number };
  domainPerformance: { label: string; pct: number }[];
  prioritySupportAreas: { label: string; pct: number }[];
  learnersAtAbove: number;
}): string[] {
  const insights: string[] = [];
  if (input.proficiency.deltaPp !== 0) {
    insights.push(
      `${Math.abs(input.proficiency.deltaPp)} percentage point ${input.proficiency.deltaPp > 0 ? "increase" : "decrease"} in learners at/above benchmark vs last period.`,
    );
  }
  if (input.learnersAtAbove > 0) {
    insights.push(`${input.learnersAtAbove.toLocaleString()} learners are now reading at/above benchmark.`);
  }
  const sorted = [...input.domainPerformance].sort((a, b) => b.pct - a.pct);
  if (sorted.length >= 2 && sorted[0]!.pct > 0) {
    insights.push(`${sorted[0]!.label} and ${sorted[1]!.label} are the strongest domains.`);
  }
  if (input.prioritySupportAreas.length >= 2) {
    insights.push(`Focus support on ${input.prioritySupportAreas[0]!.label} and ${input.prioritySupportAreas[1]!.label} for greatest impact.`);
  } else if (input.prioritySupportAreas.length === 1) {
    insights.push(`Focus support on ${input.prioritySupportAreas[0]!.label} for greatest impact.`);
  }
  if (insights.length === 0) {
    insights.push("Awaiting first sync of public learning outcomes for this period.");
  }
  return insights;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseFilters(url.searchParams);
    const generatedAt = new Date().toISOString();

    const [
      learnersAssessed,
      proficiency,
      teachingQuality,
      movedUp,
      dataCompleteness,
      dataQuality,
      readingLevels,
      trend,
      progressionTrend,
      observationDomains,
      domainPerformance,
      geographyComparison,
      genderParity,
      topGeographies,
      prioritySupport,
      filterOptions,
      lessonStructureAdherence,
      rubric,
    ] = await Promise.all([
      getLearnersAssessedKpi(filters),
      getReadingProficiencyKpi(filters),
      getTeachingQualityIndexKpi(),
      getMovedUpKpi(filters),
      getDataCompletenessKpi(),
      getDataQualityBreakdown(),
      getReadingLevelsDistribution(filters),
      getLearningOutcomesTrend(filters, 12),
      getReadingProgressionTrend(filters, 12),
      getObservationDomainBreakdown(),
      getDomainPerformance(filters),
      getGeographyComparison(),
      getGenderParityOutcomes(),
      getTopPerformingGeographies(),
      getPrioritySupportAreas(),
      getFilterOptions(),
      getLessonStructureAdherence(),
      getRubricCriteriaBreakdown(),
    ]);

    // Learners At/Above Benchmark figure (count, not %)
    const learnersAtAbove = readingLevels.bands
      .filter((b) => b.label === "Fluent" || b.label === "Developing")
      .reduce((sum, b) => sum + b.count, 0);

    const keyInsights = buildKeyInsights({
      proficiency,
      movedUp: { rate: movedUp.rate },
      domainPerformance,
      prioritySupportAreas: prioritySupport,
      learnersAtAbove,
    });

    return NextResponse.json({
      meta: {
        generatedAt,
        filters,
        minimumSampleThreshold: MIN_PUBLIC_SAMPLE_SIZE,
        privacyNotice:
          "Public, aggregated, and privacy-protected. No school or individual learner data is shown.",
      },
      kpis: {
        learnersAssessed,
        readingProficiency: proficiency,
        teachingQualityIndex: teachingQuality,
        learnersAtAbove: { count: learnersAtAbove, deltaPct: proficiency.deltaPp },
        movedUp,
        dataCompleteness,
      },
      dataQuality,
      readingLevelsDistribution: readingLevels,
      learningOutcomesTrend: trend,
      readingProgressionTrend: progressionTrend,
      teachingQualityDomains: observationDomains,
      lessonStructureAdherence,
      rubricCriteria: rubric,
      domainPerformance,
      geographyComparison,
      genderParity,
      topPerformingGeographies: topGeographies,
      prioritySupportAreas: prioritySupport,
      keyInsights,
      filterOptions,
      sampleSize: learnersAssessed.current,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 500 },
    );
  }
}

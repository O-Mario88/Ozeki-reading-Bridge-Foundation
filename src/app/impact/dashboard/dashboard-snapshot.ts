import {
  getPublicReachFootprint,
  getPublicCoachingCompletionRate,
  getPublicReadingStageShift,
  getPublicTeacherImpactSnapshot,
  getPublicStoryCollectionGrowth,
  type CoachingCompletionRate,
  type PublicReachFootprint,
  type ReadingStageShift,
  type TeacherImpactSnapshot,
  type StoryCollectionGrowth,
} from "@/lib/server/postgres/repositories/public-metrics";
import {
  getCostPerBeneficiarySummary,
  type CostPerBeneficiarySummary,
} from "@/lib/server/postgres/repositories/cost-per-beneficiary";
import {
  getPublicAssessmentTypeCountsPostgres,
  getPublicLearnerFunnelPostgres,
  getPublicGenderParityPostgres,
  getPublicReadingImprovementByGradeBandPostgres,
  getPublicLearningOutcomesByDomainPostgres,
  getPublicAssessmentCompletionRatePostgres,
  getPublicNonReaderReductionPostgres,
  type AssessmentTypeCounts,
  type LearnerFunnel,
  type GenderParity,
  type GradeBandImprovement,
  type DomainMastery,
  type AssessmentCompletion,
  type NonReaderReduction,
} from "@/lib/server/postgres/repositories/dashboard-public-metrics";
import { getPublicObservationFidelityStatsPostgres } from "@/lib/server/postgres/repositories/phonics-observations";

export type ObservationFidelity = Awaited<ReturnType<typeof getPublicObservationFidelityStatsPostgres>>;

/**
 * Single snapshot of every live metric the public dashboard renders.
 * Every query is fired in parallel; failures fall back to safe defaults
 * so the page always renders even when one repo is unhealthy.
 */
export type DashboardSnapshot = {
  generatedAt: string;
  reach: PublicReachFootprint | null;
  cost: CostPerBeneficiarySummary;
  coaching: CoachingCompletionRate | null;
  stageShift: ReadingStageShift | null;
  teacherImpact: TeacherImpactSnapshot | null;
  stories: StoryCollectionGrowth | null;
  observation: ObservationFidelity;
  assessmentCounts: AssessmentTypeCounts;
  funnel: LearnerFunnel;
  parity: GenderParity;
  gradeBandImprovement: GradeBandImprovement[];
  domainMastery: DomainMastery[];
  assessmentCompletion: AssessmentCompletion;
  nonReaderReduction: NonReaderReduction;
};

const EMPTY_OBSERVATION: ObservationFidelity = {
  totalSubmitted: 0, fidelityCount: 0, partialCount: 0, lowCount: 0, fidelityPct: 0, monthlyTrend: [],
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [
    reach,
    cost,
    coaching,
    stageShift,
    teacherImpact,
    stories,
    observation,
    assessmentCounts,
    funnel,
    parity,
    gradeBandImprovement,
    domainMastery,
    assessmentCompletion,
    nonReaderReduction,
  ] = await Promise.all([
    getPublicReachFootprint().catch(() => null),
    getCostPerBeneficiarySummary().catch(() => ({
      generatedAt: new Date().toISOString(),
      ugxPerUsd: 3800,
      programmeSpendUgx: 0,
      learnersReached: 0,
      learnersImproved: 0,
      teachersTrained: 0,
      figures: {
        learnersReached: { metricKey: "cost_per_learner_reached", totalProgrammeSpendUgx: 0, beneficiaryCount: 0, costPerUnitUgx: null, costPerUnitUsd: null },
        learnersImproved: { metricKey: "cost_per_learner_improved", totalProgrammeSpendUgx: 0, beneficiaryCount: 0, costPerUnitUgx: null, costPerUnitUsd: null },
        teachersTrained: { metricKey: "cost_per_teacher_trained", totalProgrammeSpendUgx: 0, beneficiaryCount: 0, costPerUnitUgx: null, costPerUnitUsd: null },
      },
    } as CostPerBeneficiarySummary)),
    getPublicCoachingCompletionRate().catch(() => null),
    getPublicReadingStageShift().catch(() => null),
    getPublicTeacherImpactSnapshot().catch(() => null),
    getPublicStoryCollectionGrowth().catch(() => null),
    getPublicObservationFidelityStatsPostgres().catch(() => EMPTY_OBSERVATION),
    getPublicAssessmentTypeCountsPostgres(),
    getPublicLearnerFunnelPostgres(),
    getPublicGenderParityPostgres(),
    getPublicReadingImprovementByGradeBandPostgres(),
    getPublicLearningOutcomesByDomainPostgres(),
    getPublicAssessmentCompletionRatePostgres(),
    getPublicNonReaderReductionPostgres(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    reach,
    cost,
    coaching,
    stageShift,
    teacherImpact,
    stories,
    observation,
    assessmentCounts,
    funnel,
    parity,
    gradeBandImprovement,
    domainMastery,
    assessmentCompletion,
    nonReaderReduction,
  };
}

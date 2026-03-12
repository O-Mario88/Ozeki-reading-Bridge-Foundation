import { NextResponse } from "next/server";
import { PublicImpactAggregate } from "@/lib/types";

export function parsePeriod(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("period") ?? "FY";
}

export function toPublicImpactResponse(payload: PublicImpactAggregate) {
  return {
    ...payload,
    kpis: {
      ...payload.kpis,
      schools_supported: payload.kpis.schoolsSupported,
      teachers_supported_male: payload.kpis.teachersSupportedMale,
      teachers_supported_female: payload.kpis.teachersSupportedFemale,
      online_live_sessions_covered: payload.kpis.onlineLiveSessionsCovered,
      online_teachers_supported: payload.kpis.onlineTeachersSupported,
      learners_directly_impacted: payload.kpis.learnersDirectlyImpacted,
      enrollment_total: payload.kpis.enrollmentEstimatedReach,
      learners_assessed_unique: payload.kpis.learnersAssessedUnique,
      visits_total: payload.kpis.coachingVisitsCompleted,
      assessments_baseline_count: payload.kpis.assessmentsBaselineCount,
      assessments_progress_count: payload.kpis.assessmentsProgressCount,
      assessments_endline_count: payload.kpis.assessmentsEndlineCount,
    },
    outcomes: {
      ...payload.outcomes,
      letter_names: payload.outcomes.letterNames,
      letter_sounds: payload.outcomes.letterSounds,
      real_words: payload.outcomes.realWords,
      made_up_words: payload.outcomes.madeUpWords,
      story_reading: payload.outcomes.storyReading,
      comprehension: payload.outcomes.comprehension,
    },
    mastery_domains: payload.masteryDomains ?? null,
    reading_stage_distribution: payload.readingStageDistribution ?? null,
    benchmark_status: payload.benchmarkStatus ?? null,
    traffic_light_explanations: payload.publicExplanation ?? null,
    funnel: {
      ...payload.funnel,
      baseline_assessed: payload.funnel.baselineAssessed,
      endline_assessed: payload.funnel.endlineAssessed,
    },
    teaching_quality: payload.teachingQuality ?? null,
    teaching_learning_alignment: payload.teachingLearningAlignment ?? null,
    meta: {
      ...payload.meta,
      last_updated: payload.meta.lastUpdated,
      data_completeness: payload.meta.dataCompleteness,
    },
    reading_levels: payload.readingLevels ?? null,
  };
}

export function cachedImpactJson(payload: PublicImpactAggregate) {
  return NextResponse.json(toPublicImpactResponse(payload), {
    headers: {
      "Cache-Control": "public, max-age=600, stale-while-revalidate=900",
    },
  });
}

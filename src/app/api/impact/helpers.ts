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
      enrollment_total: payload.kpis.enrollmentEstimatedReach,
      learners_assessed_unique: payload.kpis.learnersAssessedUnique,
      visits_total: payload.kpis.coachingVisitsCompleted,
      assessments_baseline_count: payload.kpis.assessmentsBaselineCount,
      assessments_progress_count: payload.kpis.assessmentsProgressCount,
      assessments_endline_count: payload.kpis.assessmentsEndlineCount,
    },
    outcomes: {
      ...payload.outcomes,
      sounds: payload.outcomes.letterSounds,
      decoding: payload.outcomes.decoding,
      fluency: payload.outcomes.fluency,
      comprehension: payload.outcomes.comprehension,
    },
    funnel: {
      ...payload.funnel,
      baseline_assessed: payload.funnel.baselineAssessed,
      endline_assessed: payload.funnel.endlineAssessed,
    },
    meta: {
      ...payload.meta,
      last_updated: payload.meta.lastUpdated,
      data_completeness: payload.meta.dataCompleteness,
    },
  };
}

export function cachedImpactJson(payload: PublicImpactAggregate) {
  return NextResponse.json(toPublicImpactResponse(payload), {
    headers: {
      "Cache-Control": "public, max-age=600, stale-while-revalidate=900",
    },
  });
}

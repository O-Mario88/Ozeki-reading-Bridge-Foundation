import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

type ChoroplethMetric =
  | "learnersAssessed"
  | "teachersSupported"
  | "coachingVisits"
  | "trainingCoverage"
  | "trainingGapDays"
  | "compositeScore";

const VALID_METRICS = new Set<ChoroplethMetric>([
  "learnersAssessed",
  "teachersSupported",
  "coachingVisits",
  "trainingCoverage",
  "trainingGapDays",
  "compositeScore",
]);

function buildSql(metric: ChoroplethMetric): string {
  switch (metric) {
    case "learnersAssessed":
      return `
        SELECT s.district AS district,
               COUNT(DISTINCT ar.learner_uid)::int AS value
        FROM schools_directory s
        LEFT JOIN assessment_records ar ON ar.school_id = s.id
        WHERE s.district IS NOT NULL AND s.district <> ''
        GROUP BY s.district`;
    case "teachersSupported":
      return `
        SELECT s.district AS district,
               COUNT(DISTINCT tr.teacher_uid)::int AS value
        FROM schools_directory s
        LEFT JOIN teacher_roster tr ON tr.school_id = s.id
        WHERE s.district IS NOT NULL AND s.district <> ''
        GROUP BY s.district`;
    case "coachingVisits":
      return `
        SELECT s.district AS district,
               COUNT(cv.id)::int AS value
        FROM schools_directory s
        LEFT JOIN coaching_visits cv ON cv.school_id = s.id
        WHERE s.district IS NOT NULL AND s.district <> ''
        GROUP BY s.district`;
    case "trainingCoverage":
      return `
        SELECT s.district AS district,
               COUNT(DISTINCT pta.school_id)::int AS value
        FROM schools_directory s
        LEFT JOIN portal_training_attendance pta ON pta.school_id = s.id
        WHERE s.district IS NOT NULL AND s.district <> ''
        GROUP BY s.district`;
    case "trainingGapDays":
      return `
        SELECT s.district AS district,
               MAX(GREATEST(0, CURRENT_DATE - pr.date))::int AS value
        FROM schools_directory s
        LEFT JOIN portal_records pr ON pr.school_id = s.id AND pr.module = 'training'
        WHERE s.district IS NOT NULL AND s.district <> ''
        GROUP BY s.district`;
    case "compositeScore":
      return `
        SELECT s.district AS district,
               ROUND(AVG(
                 COALESCE(ar.letter_identification_score, 0) +
                 COALESCE(ar.sound_identification_score, 0) +
                 COALESCE(ar.decodable_words_score, 0) +
                 COALESCE(ar.made_up_words_score, 0) +
                 COALESCE(ar.story_reading_score, 0) +
                 COALESCE(ar.reading_comprehension_score, 0)
               ) / 6.0, 2)::numeric AS value
        FROM schools_directory s
        LEFT JOIN assessment_records ar ON ar.school_id = s.id
          AND ar.assessment_type = 'endline'
        WHERE s.district IS NOT NULL AND s.district <> ''
        GROUP BY s.district`;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = (searchParams.get("metric") || "learnersAssessed") as ChoroplethMetric;

    if (!VALID_METRICS.has(metric)) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    const result = await queryPostgres(buildSql(metric));
    const values: Record<string, number> = {};
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const row of result.rows) {
      const district = String(row.district);
      const value = Number(row.value ?? 0);
      values[district] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 0;

    return NextResponse.json(
      { metric, values, min, max, count: result.rows.length, lastUpdated: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=1800" } },
    );
  } catch (error) {
    console.error("[api/impact/choropleth] Error:", error);
    return NextResponse.json({ error: "Choropleth unavailable" }, { status: 500 });
  }
}

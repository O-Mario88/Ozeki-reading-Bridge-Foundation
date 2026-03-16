import { queryPostgres } from "../client";

export interface SchoolFactPack {
  schoolName: string;
  periodStart: string;
  periodEnd: string;
  
  // Literacy Metrics
  assessments: {
    totalLearners: number;
    avgStoryScore: number;
    avgComprehensionScore: number;
    levelsDistribution: Record<string, number>;
  };
  
  // Operational Metrics
  visits: {
    total: number;
    lastVisitDate: string | null;
    commonVisitTopics: string[];
  };
  
  // Teacher Support
  evaluations: {
    total: number;
    avgLevel: string;
    topStrengthAreas: string[];
    topNeedsAreas: string[];
  };
}

/**
 * Extracts a multidimensional "Fact Pack" for a specific school and period.
 * This data is used by the AI to generate governed narratives.
 */
export async function getSchoolFactPack(schoolId: number, start: string, end: string): Promise<SchoolFactPack> {
  const [schoolRes, assessmentRes, visitRes, evaluationRes] = await Promise.all([
    queryPostgres("SELECT name FROM schools_directory WHERE id = $1", [schoolId]),
    
    // Literacy Metrics
    queryPostgres(`
      SELECT 
        COUNT(*)::int AS total,
        AVG(story_reading_score) AS avg_story,
        AVG(reading_comprehension_score) AS avg_comp,
        jsonb_object_agg(computed_level_band, count_per_level) AS distribution
      FROM (
        SELECT computed_level_band, COUNT(*)::int AS count_per_level
        FROM assessment_records
        WHERE school_id = $1 AND assessment_date BETWEEN $2 AND $3
        GROUP BY computed_level_band
      ) d
    `, [schoolId, start, end]),
    
    // Operational Metrics
    queryPostgres(`
      SELECT 
        COUNT(*)::int AS total,
        MAX(visit_date)::text AS last_visit
      FROM coaching_visits 
      WHERE school_id = $1 AND visit_date BETWEEN $2 AND $3
    `, [schoolId, start, end]),
    
    // Teacher Support
    queryPostgres(`
      SELECT 
        COUNT(*)::int AS total,
        AVG(score_overall) AS avg_score
      FROM lesson_evaluations
      WHERE school_id = $1 AND lesson_date BETWEEN $2 AND $3 AND status != 'void'
    `, [schoolId, start, end])
  ]);

  return {
    schoolName: schoolRes.rows[0]?.name || "Unknown School",
    periodStart: start,
    periodEnd: end,
    assessments: {
      totalLearners: Number(assessmentRes.rows[0]?.total || 0),
      avgStoryScore: Number(assessmentRes.rows[0]?.avg_story || 0),
      avgComprehensionScore: Number(assessmentRes.rows[0]?.avg_comp || 0),
      levelsDistribution: assessmentRes.rows[0]?.distribution || {}
    },
    visits: {
      total: Number(visitRes.rows[0]?.total || 0),
      lastVisitDate: visitRes.rows[0]?.last_visit || null,
      commonVisitTopics: [] // To be enriched
    },
    evaluations: {
      total: Number(evaluationRes.rows[0]?.total || 0),
      avgLevel: String(evaluationRes.rows[0]?.avg_score || "N/A"),
      topStrengthAreas: [],
      topNeedsAreas: []
    }
  };
}

/**
 * Persists a draft report.
 */
export async function saveSchoolReportDraft(data: {
  schoolId: number;
  periodStart: string;
  periodEnd: string;
  factPack: any;
  userId: number;
}) {
  const sql = `
    INSERT INTO school_performance_reports (school_id, period_start, period_end, fact_pack_json, generated_by_user_id, status)
    VALUES ($1, $2, $3, $4, $5, 'draft')
    RETURNING id
  `;
  const res = await queryPostgres(sql, [
    data.schoolId,
    data.periodStart,
    data.periodEnd,
    JSON.stringify(data.factPack),
    data.userId
  ]);
  return res.rows[0].id;
}

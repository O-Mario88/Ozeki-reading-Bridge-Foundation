import { queryPostgres } from "../client";

export interface PublicImpactMetrics {
  totalSchools: number;
  totalLearners: number;
  totalTeachers: number;
  averageReadingScore: number;
  averageCompScore: number;
  levelsDistribution: Record<string, number>;
  regionalBreakdown: Array<{
    regionName: string;
    learnerCount: number;
    scoreAvg: number;
  }>;
}

/**
 * Fetches privacy-safe, aggregated impact metrics for public consumption.
 * Aggregates scores at the higher levels (Country/Region/District).
 */
export async function getPublicImpactMetrics(filters: { 
  regionId?: number; 
  districtId?: number; 
  asOf?: string; 
} = {}): Promise<PublicImpactMetrics> {
  const asOf = filters.asOf || new Date().toISOString().split("T")[0];
  
  const [totalsRes, levelsRes, regionalRes] = await Promise.all([
    queryPostgres(`
      SELECT 
        COUNT(DISTINCT school_id)::int AS schools,
        COUNT(DISTINCT learner_uid)::int AS learners,
        AVG(story_reading_score) AS avg_story,
        AVG(reading_comprehension_score) AS avg_comp
      FROM assessment_records
      WHERE assessment_date <= $1
    `, [asOf]),
    
    queryPostgres(`
      SELECT computed_level_band, COUNT(*)::int AS total
      FROM assessment_records
      WHERE assessment_date <= $1
      GROUP BY computed_level_band
    `, [asOf]),
    
    queryPostgres(`
      SELECT 
        l.region_name,
        COUNT(DISTINCT a.learner_uid)::int AS learners,
        AVG(a.story_reading_score) AS avg_score
      FROM assessment_records a
      JOIN v_school_hierarchy l ON a.school_id = l.school_id
      WHERE a.assessment_date <= $1
      GROUP BY l.region_name
      ORDER BY avg_score DESC
    `, [asOf])
  ]);

  return {
    totalSchools: totalsRes.rows[0]?.schools || 0,
    totalLearners: totalsRes.rows[0]?.learners || 0,
    totalTeachers: 0, // Enriched from CRM or staff tables
    averageReadingScore: Number(totalsRes.rows[0]?.avg_story || 0),
    averageCompScore: Number(totalsRes.rows[0]?.avg_comp || 0),
    levelsDistribution: levelsRes.rows.reduce((acc: any, r: any) => {
      acc[r.computed_level_band] = r.total;
      return acc;
    }, {}),
    regionalBreakdown: regionalRes.rows.map((r: any) => ({
      regionName: r.region_name,
      learnerCount: r.learners,
      scoreAvg: Number(r.avg_score || 0)
    }))
  };
}

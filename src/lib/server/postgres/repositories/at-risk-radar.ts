import { queryPostgres } from "@/lib/server/postgres/client";

export type AtRiskRadarEntry = {
  schoolId: number;
  schoolName: string;
  district: string;
  region: string;
  healthScore: number | null;
  compositeDelta: number | null;
  redMasteryRatio: number | null;
  daysSinceLastVisit: number | null;
  daysSinceLastTraining: number | null;
  trajectoryBand: string | null;
  atRiskFlag: boolean;
  priorityScore: number;
  reasons: string[];
};

/**
 * Uses the materialised school_kpi_snapshot table (refreshed by triggers)
 * and ranks schools by a composite priority score combining multiple signals.
 */
export async function getAtRiskRadarPostgres(options: { limit?: number; district?: string } = {}): Promise<AtRiskRadarEntry[]> {
  const limit = options.limit ?? 10;
  const params: unknown[] = [];
  const filters: string[] = [];
  if (options.district) {
    params.push(options.district);
    filters.push(`district = $${params.length}`);
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const res = await queryPostgres(
      `SELECT sks.*, sd.name AS school_name
       FROM school_kpi_snapshot sks
       JOIN schools_directory sd ON sd.id = sks.school_id
       ${where}
       ORDER BY sks.health_score ASC NULLS FIRST
       LIMIT $${params.length + 1}`,
      [...params, limit * 3],
    );

    const entries: AtRiskRadarEntry[] = res.rows.map((r) => {
      const reasons: string[] = [];
      let priorityScore = 0;

      const health = r.health_score !== null && r.health_score !== undefined ? Number(r.health_score) : null;
      const delta = r.composite_delta !== null && r.composite_delta !== undefined ? Number(r.composite_delta) : null;
      const red = r.red_mastery_ratio !== null && r.red_mastery_ratio !== undefined ? Number(r.red_mastery_ratio) : null;
      const daysVisit = r.days_since_last_visit !== null && r.days_since_last_visit !== undefined ? Number(r.days_since_last_visit) : null;
      const daysTrain = r.days_since_last_training !== null && r.days_since_last_training !== undefined ? Number(r.days_since_last_training) : null;

      if (health !== null && health < 40) { reasons.push(`Low health score (${health}/100)`); priorityScore += (50 - health) * 2; }
      else if (health !== null && health < 60) { reasons.push(`Moderate health score (${health}/100)`); priorityScore += (70 - health); }
      if (delta !== null && delta < 0) { reasons.push(`Regressing (Δ ${delta.toFixed(2)})`); priorityScore += Math.abs(delta) * 10; }
      if (red !== null && red >= 0.3) { reasons.push(`${Math.round(red * 100)}% red-mastery learners`); priorityScore += red * 50; }
      if (daysVisit !== null && daysVisit > 90) { reasons.push(`${daysVisit}d since last coaching visit`); priorityScore += Math.min(30, daysVisit / 10); }
      if (daysVisit === null) { reasons.push(`No coaching visit on record`); priorityScore += 40; }
      if (daysTrain !== null && daysTrain > 180) { reasons.push(`${daysTrain}d since last training`); priorityScore += Math.min(20, daysTrain / 15); }
      if (r.at_risk_flag) { reasons.push(`Auto-flagged at-risk`); priorityScore += 20; }

      return {
        schoolId: Number(r.school_id),
        schoolName: String(r.school_name ?? ""),
        district: r.district ? String(r.district) : "",
        region: r.region ? String(r.region) : "",
        healthScore: health,
        compositeDelta: delta,
        redMasteryRatio: red,
        daysSinceLastVisit: daysVisit,
        daysSinceLastTraining: daysTrain,
        trajectoryBand: r.trajectory_band ? String(r.trajectory_band) : null,
        atRiskFlag: Boolean(r.at_risk_flag),
        priorityScore: Math.round(priorityScore),
        reasons,
      };
    });

    return entries
      .filter((e) => e.reasons.length > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export type TrajectoryProjection = {
  scope: string;
  periodsObserved: number;
  currentValue: number;
  projectedValue6mo: number | null;
  projectedValue12mo: number | null;
  confidenceBand: "high" | "medium" | "low" | "insufficient";
  trend: "improving" | "declining" | "stable";
  projectionNote: string;
};

/**
 * Simple linear trend projection over the last N periods.
 * Not a forecast — just "if the current trajectory holds."
 */
export async function getCompositeProjectionPostgres(): Promise<TrajectoryProjection | null> {
  try {
    const res = await queryPostgres(
      `SELECT DATE_TRUNC('quarter', assessment_date) AS period,
              AVG((
                COALESCE(letter_identification_score, 0) +
                COALESCE(sound_identification_score, 0) +
                COALESCE(decodable_words_score, 0) +
                COALESCE(made_up_words_score, 0) +
                COALESCE(story_reading_score, 0) +
                COALESCE(reading_comprehension_score, 0)
              ) / 6.0)::numeric AS composite,
              COUNT(*) AS n
       FROM assessment_records
       WHERE assessment_date >= CURRENT_DATE - INTERVAL '2 years'
       GROUP BY period
       ORDER BY period ASC`,
    );
    const rows = res.rows.map((r) => ({
      x: new Date(String(r.period)).getTime(),
      y: Number(r.composite),
      n: Number(r.n),
    })).filter((p) => !isNaN(p.y));

    if (rows.length < 2) {
      return {
        scope: "national",
        periodsObserved: rows.length,
        currentValue: rows[0]?.y ?? 0,
        projectedValue6mo: null,
        projectedValue12mo: null,
        confidenceBand: "insufficient",
        trend: "stable",
        projectionNote: "Need at least 2 quarterly data points for a projection.",
      };
    }

    // Simple linear regression: y = mx + b
    const n = rows.length;
    const meanX = rows.reduce((a, b) => a + b.x, 0) / n;
    const meanY = rows.reduce((a, b) => a + b.y, 0) / n;
    const num = rows.reduce((a, b) => a + (b.x - meanX) * (b.y - meanY), 0);
    const den = rows.reduce((a, b) => a + (b.x - meanX) ** 2, 0);
    const m = den === 0 ? 0 : num / den;
    const b = meanY - m * meanX;

    const now = Date.now();
    const sixMo = now + 180 * 86400000;
    const twelveMo = now + 365 * 86400000;
    const projected6mo = Number((m * sixMo + b).toFixed(2));
    const projected12mo = Number((m * twelveMo + b).toFixed(2));
    const current = rows[rows.length - 1].y;

    const totalN = rows.reduce((a, b) => a + b.n, 0);
    const confidence: TrajectoryProjection["confidenceBand"] =
      totalN >= 1000 && n >= 4 ? "high" : totalN >= 300 && n >= 3 ? "medium" : "low";
    const trend: TrajectoryProjection["trend"] =
      projected12mo - current > 0.3 ? "improving" : current - projected12mo > 0.3 ? "declining" : "stable";

    return {
      scope: "national",
      periodsObserved: n,
      currentValue: Number(current.toFixed(2)),
      projectedValue6mo: projected6mo,
      projectedValue12mo: projected12mo,
      confidenceBand: confidence,
      trend,
      projectionNote:
        confidence === "high"
          ? `Based on ${n} quarters of data covering ${totalN.toLocaleString()} assessments, the national reading composite is projected to reach ${projected12mo.toFixed(2)} in 12 months if the current trajectory holds.`
          : `Projection based on ${n} periods — ${confidence} confidence. More assessment data will sharpen this estimate.`,
    };
  } catch { return null; }
}

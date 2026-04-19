import { queryPostgres } from "@/lib/server/postgres/client";

export type SchoolKpiSnapshot = {
  schoolId: number;
  district: string | null;
  region: string | null;
  lastAssessmentDate: string | null;
  lastCoachingVisitDate: string | null;
  lastTrainingDate: string | null;
  daysSinceLastVisit: number | null;
  daysSinceLastTraining: number | null;
  totalAssessments: number;
  totalLearnersAssessed: number;
  totalVisits: number;
  totalObservations: number;
  totalTrainings: number;
  avgCompositeBaseline: number | null;
  avgCompositeEndline: number | null;
  compositeDelta: number | null;
  redMasteryRatio: number | null;
  healthScore: number | null;
  atRiskFlag: boolean;
  trajectoryBand: string | null;
  updatedAt: string;
};

export type DistrictKpiSnapshot = {
  district: string;
  region: string | null;
  schoolsCount: number;
  atRiskSchools: number;
  totalLearnersAssessed: number;
  totalVisits: number;
  avgCompositeEndline: number | null;
  avgCompositeDelta: number | null;
  avgHealthScore: number | null;
  coveragePct: number | null;
  updatedAt: string;
};

export type NationalKpiSnapshot = {
  schoolsCount: number;
  districtsCount: number;
  atRiskSchools: number;
  totalLearnersAssessed: number;
  totalTeachersSupported: number;
  totalVisits: number;
  totalObservations: number;
  totalTrainings: number;
  totalCertificatesIssued: number;
  avgCompositeEndline: number | null;
  avgCompositeDelta: number | null;
  updatedAt: string;
};

export async function getSchoolKpiSnapshotPostgres(schoolId: number): Promise<SchoolKpiSnapshot | null> {
  try {
    const res = await queryPostgres(
      `SELECT * FROM school_kpi_snapshot WHERE school_id = $1`,
      [schoolId],
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return mapSchool(r);
  } catch { return null; }
}

export async function listSchoolKpiSnapshotsPostgres(options: { atRisk?: boolean; district?: string; limit?: number }): Promise<SchoolKpiSnapshot[]> {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (options.atRisk !== undefined) {
    params.push(options.atRisk);
    filters.push(`at_risk_flag = $${params.length}`);
  }
  if (options.district) {
    params.push(options.district);
    filters.push(`district = $${params.length}`);
  }
  params.push(options.limit ?? 200);
  const limitIdx = params.length;
  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  try {
    const res = await queryPostgres(
      `SELECT * FROM school_kpi_snapshot ${where}
       ORDER BY health_score ASC NULLS LAST LIMIT $${limitIdx}`,
      params,
    );
    return res.rows.map(mapSchool);
  } catch { return []; }
}

export async function getNationalKpiSnapshotPostgres(): Promise<NationalKpiSnapshot | null> {
  try {
    const res = await queryPostgres(`SELECT * FROM national_kpi_snapshot WHERE id = 1`);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      schoolsCount: Number(r.schools_count ?? 0),
      districtsCount: Number(r.districts_count ?? 0),
      atRiskSchools: Number(r.at_risk_schools ?? 0),
      totalLearnersAssessed: Number(r.total_learners_assessed ?? 0),
      totalTeachersSupported: Number(r.total_teachers_supported ?? 0),
      totalVisits: Number(r.total_visits ?? 0),
      totalObservations: Number(r.total_observations ?? 0),
      totalTrainings: Number(r.total_trainings ?? 0),
      totalCertificatesIssued: Number(r.total_certificates_issued ?? 0),
      avgCompositeEndline: r.avg_composite_endline !== null && r.avg_composite_endline !== undefined ? Number(r.avg_composite_endline) : null,
      avgCompositeDelta: r.avg_composite_delta !== null && r.avg_composite_delta !== undefined ? Number(r.avg_composite_delta) : null,
      updatedAt: String(r.updated_at),
    };
  } catch { return null; }
}

export async function listDistrictKpiSnapshotsPostgres(): Promise<DistrictKpiSnapshot[]> {
  try {
    const res = await queryPostgres(
      `SELECT * FROM district_kpi_snapshot ORDER BY avg_health_score ASC NULLS LAST`,
    );
    return res.rows.map((r) => ({
      district: String(r.district),
      region: r.region ? String(r.region) : null,
      schoolsCount: Number(r.schools_count ?? 0),
      atRiskSchools: Number(r.at_risk_schools ?? 0),
      totalLearnersAssessed: Number(r.total_learners_assessed ?? 0),
      totalVisits: Number(r.total_visits ?? 0),
      avgCompositeEndline: r.avg_composite_endline !== null && r.avg_composite_endline !== undefined ? Number(r.avg_composite_endline) : null,
      avgCompositeDelta: r.avg_composite_delta !== null && r.avg_composite_delta !== undefined ? Number(r.avg_composite_delta) : null,
      avgHealthScore: r.avg_health_score !== null && r.avg_health_score !== undefined ? Number(r.avg_health_score) : null,
      coveragePct: r.coverage_pct !== null && r.coverage_pct !== undefined ? Number(r.coverage_pct) : null,
      updatedAt: String(r.updated_at),
    }));
  } catch { return []; }
}

export async function refreshAllKpiSnapshotsPostgres(options: {
  maxSchools?: number;
  staleOnly?: boolean;
} = {}): Promise<{ schools: number; districts: number; national: boolean }> {
  let schools = 0;
  const maxSchools = options.maxSchools ?? 500;
  try {
    // Prioritise schools with no snapshot or whose snapshot is most stale. Triggers
    // keep hot rows fresh already; this cron is a safety-net for orphans only.
    const staleFilter = options.staleOnly
      ? `AND (sks.updated_at IS NULL OR sks.updated_at < NOW() - INTERVAL '24 hours')`
      : "";
    const idsRes = await queryPostgres(
      `SELECT s.id FROM schools_directory s
       LEFT JOIN school_kpi_snapshot sks ON sks.school_id = s.id
       WHERE s.program_status = 'active' ${staleFilter}
       ORDER BY sks.updated_at ASC NULLS FIRST
       LIMIT $1`,
      [maxSchools],
    );
    for (const row of idsRes.rows) {
      try {
        await queryPostgres(`SELECT refresh_school_kpi_snapshot($1)`, [Number(row.id)]);
        schools++;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  let districts = 0;
  try {
    await queryPostgres(`SELECT refresh_district_kpi_snapshots()`);
    const r = await queryPostgres(`SELECT COUNT(*)::int AS n FROM district_kpi_snapshot`);
    districts = Number(r.rows[0]?.n ?? 0);
  } catch { /* ignore */ }
  let national = false;
  try {
    await queryPostgres(`SELECT refresh_national_kpi_snapshot()`);
    national = true;
  } catch { /* ignore */ }
  return { schools, districts, national };
}

function mapSchool(r: Record<string, unknown>): SchoolKpiSnapshot {
  return {
    schoolId: Number(r.school_id),
    district: r.district ? String(r.district) : null,
    region: r.region ? String(r.region) : null,
    lastAssessmentDate: r.last_assessment_date ? String(r.last_assessment_date).slice(0, 10) : null,
    lastCoachingVisitDate: r.last_coaching_visit_date ? String(r.last_coaching_visit_date).slice(0, 10) : null,
    lastTrainingDate: r.last_training_date ? String(r.last_training_date).slice(0, 10) : null,
    daysSinceLastVisit: r.days_since_last_visit !== null && r.days_since_last_visit !== undefined ? Number(r.days_since_last_visit) : null,
    daysSinceLastTraining: r.days_since_last_training !== null && r.days_since_last_training !== undefined ? Number(r.days_since_last_training) : null,
    totalAssessments: Number(r.total_assessments ?? 0),
    totalLearnersAssessed: Number(r.total_learners_assessed ?? 0),
    totalVisits: Number(r.total_visits ?? 0),
    totalObservations: Number(r.total_observations ?? 0),
    totalTrainings: Number(r.total_trainings ?? 0),
    avgCompositeBaseline: r.avg_composite_baseline !== null && r.avg_composite_baseline !== undefined ? Number(r.avg_composite_baseline) : null,
    avgCompositeEndline: r.avg_composite_endline !== null && r.avg_composite_endline !== undefined ? Number(r.avg_composite_endline) : null,
    compositeDelta: r.composite_delta !== null && r.composite_delta !== undefined ? Number(r.composite_delta) : null,
    redMasteryRatio: r.red_mastery_ratio !== null && r.red_mastery_ratio !== undefined ? Number(r.red_mastery_ratio) : null,
    healthScore: r.health_score !== null && r.health_score !== undefined ? Number(r.health_score) : null,
    atRiskFlag: Boolean(r.at_risk_flag),
    trajectoryBand: r.trajectory_band ? String(r.trajectory_band) : null,
    updatedAt: String(r.updated_at),
  };
}

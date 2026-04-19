import { queryPostgres } from "@/lib/server/postgres/client";

export type SessionEffectiveness = {
  sessionId: number;
  sessionTitle: string;
  sessionEndedAt: string | null;
  schoolsRepresented: number;
  teachersAttended: number;
  followupVisitsCount: number;
  observationsAfter: {
    total: number;
    fidelityCount: number;
    fidelityPct: number;
  };
  outcomeDelta: {
    comprehensionBefore: number | null;
    comprehensionAfter: number | null;
    comprehensionDeltaPp: number | null;
    fluencyBefore: number | null;
    fluencyAfter: number | null;
    fluencyDeltaPp: number | null;
    sampleSize: number;
  };
  schoolsList: Array<{
    schoolId: number;
    schoolName: string;
    district: string;
    teachersAttended: number;
    followupVisits: number;
    fidelityObservations: number;
    comprehensionDeltaPp: number | null;
  }>;
};

/**
 * Compute session effectiveness by joining attendance to subsequent
 * coaching visits, observations, and assessment deltas.
 *
 * Methodology:
 *  - "Before" window: 90 days prior to session start
 *  - "After" window: 180 days after session end
 *  - Only counts schools where at least one teacher attended
 */
export async function getSessionEffectivenessPostgres(sessionId: number): Promise<SessionEffectiveness | null> {
  const sessionRes = await queryPostgres(
    `SELECT id, title, start_time::text AS start_time, end_time::text AS end_time, status
     FROM online_training_sessions WHERE id = $1`,
    [sessionId],
  );
  const session = sessionRes.rows[0];
  if (!session) return null;

  const endTime = session.status === "completed" ? String(session.end_time) : String(session.end_time);

  // Schools represented in this session via attending teachers
  const schoolsRes = await queryPostgres(
    `SELECT DISTINCT otp.school_id
     FROM online_training_participants otp
     WHERE otp.session_id = $1
       AND otp.attendance_status IN ('attended', 'joined', 'left')
       AND otp.school_id IS NOT NULL`,
    [sessionId],
  );
  const schoolIds = schoolsRes.rows.map((r) => Number(r.school_id));
  const schoolsRepresented = schoolIds.length;

  const teachersRes = await queryPostgres(
    `SELECT COUNT(DISTINCT teacher_user_id)::int AS n
     FROM online_training_participants
     WHERE session_id = $1
       AND attendance_status IN ('attended', 'joined', 'left')
       AND teacher_user_id IS NOT NULL`,
    [sessionId],
  );
  const teachersAttended = Number(teachersRes.rows[0]?.n ?? 0);

  if (schoolIds.length === 0) {
    return {
      sessionId: Number(session.id),
      sessionTitle: String(session.title),
      sessionEndedAt: endTime,
      schoolsRepresented: 0,
      teachersAttended,
      followupVisitsCount: 0,
      observationsAfter: { total: 0, fidelityCount: 0, fidelityPct: 0 },
      outcomeDelta: {
        comprehensionBefore: null, comprehensionAfter: null, comprehensionDeltaPp: null,
        fluencyBefore: null, fluencyAfter: null, fluencyDeltaPp: null,
        sampleSize: 0,
      },
      schoolsList: [],
    };
  }

  const [visitsRes, obsRes, outcomeRes, schoolDetailRes] = await Promise.all([
    // Follow-up coaching visits after session end
    queryPostgres(
      `SELECT COUNT(*)::int AS n
       FROM portal_records
       WHERE module = 'visit'
         AND school_id = ANY($1::int[])
         AND date >= $2::timestamptz`,
      [schoolIds, endTime],
    ),
    // Observations submitted after session
    queryPostgres(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity')::int AS fidelity_count
       FROM teacher_lesson_observations
       WHERE school_id = ANY($1::int[])
         AND status = 'submitted'
         AND observation_date >= $2::date`,
      [schoolIds, endTime],
    ),
    // Assessment deltas: 90d before vs 180d after
    queryPostgres(
      `SELECT
         AVG(reading_comprehension_score) FILTER (WHERE assessment_date < $2::timestamptz AND assessment_date >= ($2::timestamptz - INTERVAL '90 days')) AS comp_before,
         AVG(reading_comprehension_score) FILTER (WHERE assessment_date >= $2::timestamptz AND assessment_date <= ($2::timestamptz + INTERVAL '180 days')) AS comp_after,
         AVG(fluency_accuracy_score)      FILTER (WHERE assessment_date < $2::timestamptz AND assessment_date >= ($2::timestamptz - INTERVAL '90 days')) AS flu_before,
         AVG(fluency_accuracy_score)      FILTER (WHERE assessment_date >= $2::timestamptz AND assessment_date <= ($2::timestamptz + INTERVAL '180 days')) AS flu_after,
         COUNT(*) FILTER (WHERE assessment_date >= $2::timestamptz AND assessment_date <= ($2::timestamptz + INTERVAL '180 days'))::int AS n_after
       FROM assessment_records
       WHERE school_id = ANY($1::int[])`,
      [schoolIds, endTime],
    ),
    // Per-school breakdown
    queryPostgres(
      `SELECT s.id AS school_id, s.name AS school_name, s.district,
        (SELECT COUNT(DISTINCT otp.teacher_user_id)::int
           FROM online_training_participants otp
           WHERE otp.session_id = $1 AND otp.school_id = s.id
             AND otp.attendance_status IN ('attended','joined','left')
             AND otp.teacher_user_id IS NOT NULL) AS teachers_attended,
        (SELECT COUNT(*)::int FROM portal_records pr
           WHERE pr.school_id = s.id AND pr.module = 'visit' AND pr.date >= $2::timestamptz) AS followup_visits,
        (SELECT COUNT(*)::int FROM teacher_lesson_observations tlo
           WHERE tlo.school_id = s.id AND tlo.status = 'submitted'
             AND tlo.observation_date >= $2::date
             AND tlo.overall_post_observation_rating = 'fidelity') AS fidelity_obs,
        (SELECT (AVG(reading_comprehension_score) FILTER (WHERE assessment_date >= $2::timestamptz))
              - (AVG(reading_comprehension_score) FILTER (WHERE assessment_date <  $2::timestamptz))
           FROM assessment_records ar
           WHERE ar.school_id = s.id) AS comp_delta
       FROM schools_directory s
       WHERE s.id = ANY($3::int[])
       ORDER BY s.name ASC`,
      [sessionId, endTime, schoolIds],
    ),
  ]);

  const obsRow = obsRes.rows[0];
  const obsTotal = Number(obsRow?.total ?? 0);
  const fidelity = Number(obsRow?.fidelity_count ?? 0);

  const o = outcomeRes.rows[0];
  const compBefore = o?.comp_before != null ? Number(o.comp_before) : null;
  const compAfter = o?.comp_after != null ? Number(o.comp_after) : null;
  const fluBefore = o?.flu_before != null ? Number(o.flu_before) : null;
  const fluAfter = o?.flu_after != null ? Number(o.flu_after) : null;

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    sessionId: Number(session.id),
    sessionTitle: String(session.title),
    sessionEndedAt: endTime,
    schoolsRepresented,
    teachersAttended,
    followupVisitsCount: Number(visitsRes.rows[0]?.n ?? 0),
    observationsAfter: {
      total: obsTotal,
      fidelityCount: fidelity,
      fidelityPct: obsTotal > 0 ? Math.round((fidelity / obsTotal) * 100) : 0,
    },
    outcomeDelta: {
      comprehensionBefore: compBefore != null ? round1(compBefore) : null,
      comprehensionAfter: compAfter != null ? round1(compAfter) : null,
      comprehensionDeltaPp: compBefore != null && compAfter != null ? round1(compAfter - compBefore) : null,
      fluencyBefore: fluBefore != null ? round1(fluBefore) : null,
      fluencyAfter: fluAfter != null ? round1(fluAfter) : null,
      fluencyDeltaPp: fluBefore != null && fluAfter != null ? round1(fluAfter - fluBefore) : null,
      sampleSize: Number(o?.n_after ?? 0),
    },
    schoolsList: schoolDetailRes.rows.map((r) => ({
      schoolId: Number(r.school_id),
      schoolName: String(r.school_name),
      district: String(r.district ?? ""),
      teachersAttended: Number(r.teachers_attended ?? 0),
      followupVisits: Number(r.followup_visits ?? 0),
      fidelityObservations: Number(r.fidelity_obs ?? 0),
      comprehensionDeltaPp: r.comp_delta != null ? round1(Number(r.comp_delta)) : null,
    })),
  };
}

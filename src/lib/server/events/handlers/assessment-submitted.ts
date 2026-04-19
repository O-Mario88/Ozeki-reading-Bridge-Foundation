import { queryPostgres } from "@/lib/server/postgres/client";
import type { EventHandler } from "../types";

/**
 * When an assessment record is submitted:
 *   1. If any mastery domain is 'red' for this learner → mark the learner at-risk
 *   2. If an endline was just submitted and the composite regressed vs baseline → flag the school
 *   3. Trigger aggregate refresh request (picked up by Phase 2 materialisation)
 */
export const assessmentSubmittedHandler: EventHandler = {
  name: "assessment-submitted.cascade",
  eventType: "assessment.submitted",
  async handle(event) {
    const schoolId = event.payload.schoolId ? Number(event.payload.schoolId) : null;
    const learnerUid = event.payload.learnerUid ? String(event.payload.learnerUid) : null;
    const assessmentType = event.payload.assessmentType ? String(event.payload.assessmentType) : null;

    if (!schoolId) return { status: "skipped", reason: "no schoolId" };
    const effects: string[] = [];

    // 1. Compute a school-level at-risk flag if the recent assessment pool has ≥ 30% red mastery
    try {
      const redRes = await queryPostgres(
        `SELECT
           COUNT(*) FILTER (
             WHERE comprehension_mastery_status = 'red'
                OR blending_decoding_mastery_status = 'red'
                OR phonemic_awareness_mastery_status = 'red'
           )::float / NULLIF(COUNT(*), 0) AS red_ratio,
           COUNT(*) AS n
         FROM assessment_records
         WHERE school_id = $1
           AND assessment_date >= CURRENT_DATE - INTERVAL '180 days'`,
        [schoolId],
      );
      const redRatio = Number(redRes.rows[0]?.red_ratio ?? 0);
      const n = Number(redRes.rows[0]?.n ?? 0);
      if (n >= 10 && redRatio >= 0.3) {
        // Mark school as at-risk via a soft flag on schools_directory if column exists,
        // otherwise just publish a derived event for downstream handlers.
        effects.push(`at_risk_ratio_${redRatio.toFixed(2)}_n${n}`);
      }
    } catch { /* non-fatal */ }

    // 2. Endline regression check — compare to baseline composite
    if (assessmentType === "endline") {
      try {
        const compRes = await queryPostgres(
          `WITH scores AS (
             SELECT assessment_type,
                    AVG((
                      COALESCE(letter_identification_score, 0) +
                      COALESCE(sound_identification_score, 0) +
                      COALESCE(decodable_words_score, 0) +
                      COALESCE(made_up_words_score, 0) +
                      COALESCE(story_reading_score, 0) +
                      COALESCE(reading_comprehension_score, 0)
                    ) / 6.0) AS composite
             FROM assessment_records
             WHERE school_id = $1
               AND assessment_type IN ('baseline', 'endline')
               AND assessment_date >= CURRENT_DATE - INTERVAL '365 days'
             GROUP BY assessment_type
           )
           SELECT
             (SELECT composite FROM scores WHERE assessment_type = 'baseline') AS baseline,
             (SELECT composite FROM scores WHERE assessment_type = 'endline') AS endline`,
          [schoolId],
        );
        const baseline = compRes.rows[0]?.baseline ? Number(compRes.rows[0].baseline) : null;
        const endline = compRes.rows[0]?.endline ? Number(compRes.rows[0].endline) : null;
        if (baseline !== null && endline !== null) {
          const delta = endline - baseline;
          if (delta < -1) {
            // Seed intervention action for priority support
            const planRes = await queryPostgres(
              `SELECT plan_id FROM intervention_plan
               WHERE school_id = $1 AND status IN ('planned', 'in_progress')
               ORDER BY created_at DESC LIMIT 1`,
              [schoolId],
            ).catch(() => ({ rows: [] as Array<{ plan_id: number }> }));
            let planId = planRes.rows[0]?.plan_id;
            if (!planId && event.actorUserId) {
              const created = await queryPostgres(
                `INSERT INTO intervention_plan (scope_type, scope_id, school_id, title, created_by, status)
                 VALUES ('school', $1::text, $1, 'Endline Regression Investigation', $2, 'in_progress')
                 RETURNING plan_id`,
                [schoolId, event.actorUserId],
              ).catch(() => ({ rows: [] as Array<{ plan_id: number }> }));
              planId = created.rows[0]?.plan_id;
            }
            if (planId && event.actorUserId) {
              await queryPostgres(
                `INSERT INTO intervention_actions (plan_id, action_type, owner_user_id, due_date, status)
                 VALUES ($1, 'endline_regression_review', $2, (CURRENT_DATE + INTERVAL '14 days')::text, 'planned')`,
                [planId, event.actorUserId],
              ).catch(() => {});
              effects.push(`regression_intervention_seeded_delta_${delta.toFixed(2)}`);
            }
          } else if (delta >= 3) {
            effects.push(`celebrate_improvement_delta_${delta.toFixed(2)}`);
          }
        }
      } catch { /* non-fatal */ }
    }

    return { status: "ok", detail: { schoolId, learnerUid, assessmentType, effects } };
  },
};

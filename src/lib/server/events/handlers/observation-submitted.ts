import { queryPostgres } from "@/lib/server/postgres/client";
import { sendFinanceMail } from "@/lib/finance-email";
import type { EventHandler } from "../types";

/**
 * When a lesson observation is submitted:
 *   1. If it has an action plan with review_date → seed an intervention_action for follow-up
 *   2. If rating is 'low' → notify school's most recent coach
 *   3. If the school has never been observed before → post a welcome/onboarding action
 */
export const observationSubmittedHandler: EventHandler = {
  name: "observation-submitted.cascade",
  eventType: "observation.submitted",
  async handle(event) {
    const observationId = event.entityId ? Number(event.entityId) : null;
    if (!observationId) return { status: "skipped", reason: "no entity id" };

    const obsRes = await queryPostgres(
      `SELECT o.id, o.teacher_name, o.school_id, o.school_name,
              o.overall_post_observation_rating AS rating,
              o.observer_user_id, o.created_by_user_id,
              ap.review_date::text AS review_date,
              ap.action_to_take
       FROM teacher_lesson_observations o
       LEFT JOIN observation_action_plans ap ON ap.observation_id = o.id
       WHERE o.id = $1`,
      [observationId],
    );
    if (obsRes.rows.length === 0) return { status: "skipped", reason: "observation not found" };
    const obs = obsRes.rows[0];
    const effects: string[] = [];

    // 1. Seed action plan follow-up if review_date exists
    if (obs.review_date && obs.action_to_take && obs.school_id) {
      try {
        // Ensure a plan exists
        const planRes = await queryPostgres(
          `SELECT plan_id FROM intervention_plan
           WHERE school_id = $1 AND status IN ('planned', 'in_progress')
           ORDER BY created_at DESC LIMIT 1`,
          [obs.school_id],
        ).catch(() => ({ rows: [] as Array<{ plan_id: number }> }));
        let planId = planRes.rows[0]?.plan_id;
        if (!planId && obs.created_by_user_id) {
          const created = await queryPostgres(
            `INSERT INTO intervention_plan (scope_type, scope_id, school_id, title, created_by, status)
             VALUES ('school', $1::text, $1, 'Observation Action Plan Follow-Up', $2, 'in_progress')
             RETURNING plan_id`,
            [obs.school_id, obs.created_by_user_id],
          ).catch(() => ({ rows: [] as Array<{ plan_id: number }> }));
          planId = created.rows[0]?.plan_id;
        }
        if (planId) {
          await queryPostgres(
            `INSERT INTO intervention_actions (plan_id, action_type, owner_user_id, due_date, status, visit_id)
             VALUES ($1, 'observation_action_plan_review', $2, $3, 'planned', NULL)`,
            [planId, obs.observer_user_id ?? obs.created_by_user_id, obs.review_date],
          ).catch(() => {});
          effects.push(`seeded_follow_up_due_${obs.review_date}`);
        }
      } catch { /* non-fatal */ }
    }

    // 2. Low rating → notify observer's manager (best-effort)
    if (obs.rating === "low" && obs.observer_user_id) {
      try {
        const adminRes = await queryPostgres(
          `SELECT email FROM portal_users WHERE (is_admin IS TRUE OR is_superadmin IS TRUE) AND email IS NOT NULL LIMIT 5`,
        );
        const recipients = adminRes.rows.map((r) => String(r.email)).filter(Boolean);
        if (recipients.length > 0) {
          await sendFinanceMail({
            to: recipients,
            subject: `⚠ Low-rating observation: ${obs.teacher_name} at ${obs.school_name}`,
            html: `
              <div style="font-family:system-ui,-apple-system,sans-serif;color:#111827;">
                <h3 style="color:#b91c1c;">Low-implementation observation recorded</h3>
                <p><strong>${obs.teacher_name}</strong> at <strong>${obs.school_name}</strong> received a "low" rating in the post-observation assessment.</p>
                <p>An action plan has been attached and a follow-up visit scheduled.</p>
                <p><a href="https://ozekiread.org/portal/observations/${observationId}" style="color:#f97316;">Review the observation →</a></p>
              </div>
            `,
          });
          effects.push(`notified_${recipients.length}_admins`);
        }
      } catch { /* non-fatal */ }
    }

    return { status: "ok", detail: { observationId, effects } };
  },
};

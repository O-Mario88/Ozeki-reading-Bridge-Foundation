import { queryPostgres } from "@/lib/server/postgres/client";
import { getUgxPerUsdPostgres, getSettingPostgres } from "@/lib/server/postgres/repositories/settings";

/**
 * Powers the three "Featured Programs" cards on the homepage.
 * Every number is pulled live from the DB with a safe zero-fallback when the
 * underlying table is missing or empty.
 *
 *   - Phonics card:        total amount received from partners (finance_receipts)
 *                          converted UGX → USD, vs a goal from system_settings.
 *   - In-school coaching:  completed coaching visits (portal_records module=visit)
 *                          vs a goal from system_settings.
 *   - 1001 Story project:  teachers trained on the story programme
 *                          (portal_training_attendance) vs a goal from system_settings.
 */
export type HomepageProgrammeCardMetric = {
  current: number;
  goal: number;
  percent: number;
  /** Raw label-ready strings; page can still format as $ or percent as it wishes. */
  currentLabel: string;
  goalLabel: string;
};

export type HomepageProgrammeCards = {
  phonics: HomepageProgrammeCardMetric;
  coaching: HomepageProgrammeCardMetric;
  storyProject: HomepageProgrammeCardMetric;
};

const DEFAULT_PHONICS_GOAL_USD = 10_000;
const DEFAULT_COACHING_GOAL = 1_000;
const DEFAULT_STORY_GOAL = 1_001;

function pct(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

export async function getHomepageProgrammeCardsPostgres(): Promise<HomepageProgrammeCards> {
  // Pull settings + raw data in parallel. Every branch has a safe fallback so
  // the homepage always renders, even against a partially-migrated DB.
  const [
    phonicsGoalUsd,
    coachingGoal,
    storyGoal,
    receipts,
    visits,
    storyTeachers,
    rate,
  ] = await Promise.all([
    getSettingPostgres<number>("homepage.phonics_goal_usd", DEFAULT_PHONICS_GOAL_USD),
    getSettingPostgres<number>("homepage.coaching_goal", DEFAULT_COACHING_GOAL),
    getSettingPostgres<number>("homepage.story_goal", DEFAULT_STORY_GOAL),
    queryPostgres(
      `SELECT COALESCE(SUM(amount_received), 0)::numeric AS total
       FROM finance_receipts
       WHERE status IN ('issued', 'paid')`,
    ).catch(() => ({ rows: [{ total: 0 }] })),
    queryPostgres(
      `SELECT COUNT(*)::int AS n
       FROM portal_records
       WHERE module = 'visit'`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
    queryPostgres(
      `SELECT COUNT(DISTINCT pta.teacher_uid)::int AS n
       FROM portal_training_attendance pta
       JOIN portal_records pr ON pr.id = pta.portal_record_id
       WHERE pta.attended IS TRUE
         AND pta.teacher_uid IS NOT NULL
         AND (
           LOWER(COALESCE(pr.program_type, '')) LIKE '%story%'
           OR LOWER(COALESCE(pr.program_type, '')) LIKE '%1001%'
         )`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
    getUgxPerUsdPostgres(),
  ]);

  // Phonics — sum of all receipts converted to USD
  const totalUgx = Number((receipts.rows[0] as { total?: number | string })?.total ?? 0);
  const raisedUsd = rate > 0 ? Math.round(totalUgx / rate) : 0;
  const phonicsPct = pct(raisedUsd, phonicsGoalUsd);

  // Coaching — visits completed
  const visitsDone = Number((visits.rows[0] as { n?: number })?.n ?? 0);
  const coachingPct = pct(visitsDone, coachingGoal);

  // Story — unique teachers trained on story-flagged training sessions
  const teachersTrained = Number((storyTeachers.rows[0] as { n?: number })?.n ?? 0);
  const storyPct = pct(teachersTrained, storyGoal);

  return {
    phonics: {
      current: raisedUsd,
      goal: phonicsGoalUsd,
      percent: phonicsPct,
      currentLabel: `$${raisedUsd.toLocaleString()}`,
      goalLabel: `$${phonicsGoalUsd.toLocaleString()}`,
    },
    coaching: {
      current: visitsDone,
      goal: coachingGoal,
      percent: coachingPct,
      currentLabel: visitsDone.toLocaleString(),
      goalLabel: coachingGoal.toLocaleString(),
    },
    storyProject: {
      current: teachersTrained,
      goal: storyGoal,
      percent: storyPct,
      currentLabel: teachersTrained.toLocaleString(),
      goalLabel: storyGoal.toLocaleString(),
    },
  };
}

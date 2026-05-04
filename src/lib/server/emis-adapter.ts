import { queryPostgres } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";

/**
 * Uganda EMIS adapter. Real EMIS API endpoints + auth token are
 * environment-driven so this is safe to deploy without credentials —
 * it falls into "mock" mode and records a row in emis_sync_runs so the
 * status UI shows what *would* have happened.
 *
 * Mock-mode behaviour:
 *   * pull: pretends to pull every schools_directory row as an "EMIS school".
 *   * push: counts assessments that would have been pushed and records 0
 *           sent.
 *
 * When EMIS_API_BASE_URL + EMIS_API_TOKEN are configured, the real
 * implementation slots in here. Wire-format is left to the integration
 * partner — TODO when the MoU lands.
 */

export type EmisRunResult = {
  status: "success" | "partial" | "failed" | "mock";
  schoolsIn: number;
  teachersIn: number;
  outcomesOut: number;
  errors: number;
  summary: string;
  runId: number;
};

function getEmisCredentials() {
  const baseUrl = process.env.EMIS_API_BASE_URL?.trim() ?? "";
  const token = process.env.EMIS_API_TOKEN?.trim() ?? "";
  return { baseUrl, token, configured: Boolean(baseUrl && token) };
}

async function recordRun(input: {
  direction: "pull" | "push" | "reconcile";
  trigger: "manual" | "cron" | "startup";
  status: EmisRunResult["status"];
  schoolsIn: number;
  teachersIn: number;
  outcomesOut: number;
  errors: number;
  summary: string;
  payload?: Record<string, unknown>;
}): Promise<number> {
  const result = await queryPostgres<{ id: number }>(
    `INSERT INTO emis_sync_runs (
       direction, trigger, status, finished_at,
       schools_in, teachers_in, outcomes_out, errors, summary, payload_summary
     ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.direction,
      input.trigger,
      input.status,
      input.schoolsIn,
      input.teachersIn,
      input.outcomesOut,
      input.errors,
      input.summary,
      input.payload ? JSON.stringify(input.payload) : null,
    ],
  );
  await queryPostgres(
    `UPDATE emis_config
     SET last_pull_at = CASE WHEN $1 = 'pull' THEN NOW() ELSE last_pull_at END,
         last_push_at = CASE WHEN $1 = 'push' THEN NOW() ELSE last_push_at END,
         last_run_status = $2,
         updated_at = NOW()
     WHERE id = 1`,
    [input.direction, input.status],
  );
  return Number(result.rows[0]?.id ?? 0);
}

export async function pullEmisRoster(trigger: "manual" | "cron" | "startup"): Promise<EmisRunResult> {
  const creds = getEmisCredentials();
  if (!creds.configured) {
    const schools = await queryPostgres<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM schools_directory`,
    );
    const summary = "EMIS_API_BASE_URL or EMIS_API_TOKEN not set — pull ran in mock mode.";
    const id = await recordRun({
      direction: "pull",
      trigger,
      status: "mock",
      schoolsIn: Number(schools.rows[0]?.n ?? 0),
      teachersIn: 0,
      outcomesOut: 0,
      errors: 0,
      summary,
      payload: { mode: "mock" },
    });
    logger.info("[emis] pull dry-run (no credentials)");
    return { status: "mock", schoolsIn: Number(schools.rows[0]?.n ?? 0), teachersIn: 0, outcomesOut: 0, errors: 0, summary, runId: id };
  }

  // Real-mode TODO — handshake left as a stub to keep deploy unblocked.
  // Wire-format and auth are both pending the EMIS MoU.
  const summary = "Real-mode EMIS pull is not yet implemented. Set EMIS_API_BASE_URL + EMIS_API_TOKEN AND wire src/lib/server/emis-adapter.ts when the MoU + spec are confirmed.";
  const id = await recordRun({
    direction: "pull",
    trigger,
    status: "failed",
    schoolsIn: 0,
    teachersIn: 0,
    outcomesOut: 0,
    errors: 1,
    summary,
  });
  return { status: "failed", schoolsIn: 0, teachersIn: 0, outcomesOut: 0, errors: 1, summary, runId: id };
}

export async function pushOutcomesToEmis(trigger: "manual" | "cron" | "startup"): Promise<EmisRunResult> {
  const creds = getEmisCredentials();
  const candidates = await queryPostgres<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM assessment_records WHERE assessment_date > NOW() - INTERVAL '90 days'`,
  );
  const candidateCount = Number(candidates.rows[0]?.n ?? 0);
  if (!creds.configured) {
    const summary = `EMIS credentials missing — would have pushed ${candidateCount} learning-outcome records (mock).`;
    const id = await recordRun({
      direction: "push",
      trigger,
      status: "mock",
      schoolsIn: 0,
      teachersIn: 0,
      outcomesOut: 0,
      errors: 0,
      summary,
      payload: { mode: "mock", candidateCount },
    });
    return { status: "mock", schoolsIn: 0, teachersIn: 0, outcomesOut: 0, errors: 0, summary, runId: id };
  }
  const summary = "Real-mode EMIS push not yet implemented.";
  const id = await recordRun({
    direction: "push",
    trigger,
    status: "failed",
    schoolsIn: 0,
    teachersIn: 0,
    outcomesOut: 0,
    errors: 1,
    summary,
  });
  return { status: "failed", schoolsIn: 0, teachersIn: 0, outcomesOut: 0, errors: 1, summary, runId: id };
}

export async function listRecentEmisRuns(limit = 20): Promise<{
  id: number; direction: string; trigger: string; status: string;
  startedAt: string; finishedAt: string | null;
  schoolsIn: number; teachersIn: number; outcomesOut: number; errors: number;
  summary: string | null;
}[]> {
  const result = await queryPostgres(
    `SELECT id, direction, trigger, status,
            started_at AS "startedAt", finished_at AS "finishedAt",
            schools_in AS "schoolsIn", teachers_in AS "teachersIn",
            outcomes_out AS "outcomesOut", errors, summary
     FROM emis_sync_runs ORDER BY started_at DESC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 200)],
  );
  return result.rows as Awaited<ReturnType<typeof listRecentEmisRuns>>;
}

export async function getEmisStatus(): Promise<{
  enabled: boolean;
  configured: boolean;
  pullFrequencyMinutes: number;
  lastPullAt: string | null;
  lastPushAt: string | null;
  lastRunStatus: string | null;
  schoolsLinked: number;
}> {
  const [config, links] = await Promise.all([
    queryPostgres<{
      enabled: boolean;
      pull_frequency_minutes: number;
      last_pull_at: string | null;
      last_push_at: string | null;
      last_run_status: string | null;
    }>(
      `SELECT enabled, pull_frequency_minutes, last_pull_at, last_push_at, last_run_status
       FROM emis_config WHERE id = 1`,
    ),
    queryPostgres<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM emis_school_links WHERE ozeki_school_id IS NOT NULL`,
    ),
  ]);
  const row = config.rows[0];
  const creds = getEmisCredentials();
  return {
    enabled: Boolean(row?.enabled),
    configured: creds.configured,
    pullFrequencyMinutes: Number(row?.pull_frequency_minutes ?? 1440),
    lastPullAt: row?.last_pull_at ?? null,
    lastPushAt: row?.last_push_at ?? null,
    lastRunStatus: row?.last_run_status ?? null,
    schoolsLinked: Number(links.rows[0]?.n ?? 0),
  };
}

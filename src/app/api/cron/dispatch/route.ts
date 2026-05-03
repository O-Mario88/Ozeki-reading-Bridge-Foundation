import { NextResponse } from "next/server";
import { requireCronToken } from "@/lib/server/http/cron-auth";

export const runtime = "nodejs";

/**
 * Central cron dispatcher. Invoke from a single scheduled job and this fans
 * out to the right jobs based on the current hour/day-of-week. Avoids having
 * to register 6 separate schedules.
 *
 * Expected cron cadence: hourly.
 */
export async function GET(request: Request) {
  const authError = requireCronToken(request);
  if (authError) return authError;
  // Re-resolve here so child fetches can forward the same token.
  const expected = process.env.CRON_SECRET_TOKEN ?? process.env.CRON_SECRET ?? "";

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const force = url.searchParams.get("force");
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  const results: Record<string, unknown> = { at: now.toISOString(), hour, day, jobs: [] as unknown[] };
  const jobs = results.jobs as Array<Record<string, unknown>>;

  async function run(path: string, label: string, queryExtra: Record<string, string> = {}, timeoutMs = 25_000): Promise<Record<string, unknown>> {
    const params = new URLSearchParams(queryExtra).toString();
    const fullUrl = `${origin}${path}${params ? `?${params}` : ""}`;
    const start = Date.now();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(fullUrl, {
        headers: { authorization: `Bearer ${expected}` },
        signal: controller.signal,
      });
      const body = await r.json().catch(() => ({}));
      return { job: label, status: r.status, ms: Date.now() - start, body };
    } catch (err) {
      return { job: label, status: "error", ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
    } finally {
      clearTimeout(t);
    }
  }

  // Build the job list for this tick, then fan out in parallel so the whole
  // dispatch fits inside a single Lambda invocation (<30s). Each sub-Lambda
  // has its own 30s budget.
  const tasks: Array<Promise<Record<string, unknown>>> = [];

  // Always-on
  tasks.push(run("/api/cron/process-events", "process-events", { limit: "50" }));
  tasks.push(run("/api/cron/sync-recordings", "sync-recordings"));

  if (force === "kpis" || hour % 3 === 0) {
    tasks.push(run("/api/cron/refresh-kpis", "refresh-kpis"));
  }
  if (force === "daily" || hour === 6) {
    tasks.push(run("/api/cron/digest", "digest-daily", { hours: "24" }));
    tasks.push(run("/api/cron/auto-issue-certificates", "auto-issue-certificates"));
  }
  if (force === "weekly" || (day === 1 && hour === 6)) {
    tasks.push(run("/api/cron/digest", "digest-weekly", { hours: "168" }));
  }

  const settled = await Promise.allSettled(tasks);
  for (const s of settled) {
    jobs.push(s.status === "fulfilled" ? s.value : { status: "rejected", error: String(s.reason) });
  }

  return NextResponse.json(results);
}

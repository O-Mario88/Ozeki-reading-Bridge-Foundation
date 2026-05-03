import { NextResponse } from "next/server";
import { runGscDailySync } from "@/lib/server/seo/gsc";
import { logger } from "@/lib/logger";
import { requireCronToken } from "@/lib/server/http/cron-auth";

export const runtime = "nodejs";

/**
 * Daily GSC sync — pings the sitemap and pulls the 28-day search analytics
 * window. Standardised on `Authorization: Bearer <CRON_SECRET_TOKEN>`.
 *
 * Returns { ok, summary } where summary has topQueries, topPages, and the
 * exact dates queried; the caller (or an external cron runner) can persist
 * this into kpi_snapshots if desired.
 */
export async function GET(request: Request) {
  const authError = requireCronToken(request);
  if (authError) return authError;

  try {
    const summary = await runGscDailySync();
    logger.info("[cron/gsc-sync] completed", {
      siteUrl: summary.siteUrl,
      window: summary.window,
      topQueryCount: summary.topQueries.length,
      topPageCount: summary.topPages.length,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    logger.error("[cron/gsc-sync] failed", { error: String(err) });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

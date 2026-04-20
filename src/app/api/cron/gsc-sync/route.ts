import { NextResponse } from "next/server";
import { runGscDailySync } from "@/lib/server/seo/gsc";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Daily GSC sync — pings the sitemap and pulls the 28-day search analytics
 * window. Protected by CRON_SECRET_TOKEN (either Bearer header or ?token=).
 *
 * Returns { ok, summary } where summary has topQueries, topPages, and the
 * exact dates queried; the caller (or an external cron runner) can persist
 * this into kpi_snapshots if desired.
 */
export async function GET(request: Request) {
  const expected = (process.env.CRON_SECRET_TOKEN || "").trim();
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured." }, { status: 500 });
  }
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const query = url.searchParams.get("token") || "";
  if (bearer !== expected && query !== expected) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

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

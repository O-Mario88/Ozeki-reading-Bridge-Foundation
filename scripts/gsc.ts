/**
 * Google Search Console CLI.
 *
 * Usage:
 *   tsx scripts/gsc.ts ping                         # submit sitemap.xml
 *   tsx scripts/gsc.ts list                         # list sitemaps + status
 *   tsx scripts/gsc.ts inspect <url>                # URL Inspection API
 *   tsx scripts/gsc.ts analytics [days]             # search analytics (default 28d)
 *   tsx scripts/gsc.ts sync                         # daily composite (ping + analytics)
 *
 * Requires:
 *   GSC_SITE_URL                       (e.g. "https://www.ozekiread.org/")
 *   GSC_SERVICE_ACCOUNT_JSON        (or _B64 or _FILE) with Search Console "Owner" role
 */

import {
  inspectUrl,
  listSitemaps,
  querySearchAnalytics,
  runGscDailySync,
  submitSitemap,
  loadGscConfig,
} from "../src/lib/server/seo/gsc";

function printTable(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    console.log("(no rows)");
    return;
  }
  console.table(rows);
}

async function cmdPing() {
  const cfg = await loadGscConfig();
  const sitemapUrl = `${cfg.siteUrl.replace(/\/$/, "")}/sitemap.xml`;
  const result = await submitSitemap(sitemapUrl);
  console.log("Submitted:", result);
}

async function cmdList() {
  const sitemaps = await listSitemaps();
  printTable(
    sitemaps.map((s) => ({
      path: s.path,
      lastSubmitted: s.lastSubmitted,
      lastDownloaded: s.lastDownloaded,
      isPending: s.isPending,
      errors: s.errors,
      warnings: s.warnings,
      contents: (s.contents ?? []).map((c) => `${c.type}:${c.submitted}/${c.indexed}`).join(" "),
    })),
  );
}

async function cmdInspect(url: string) {
  if (!url) {
    console.error("Usage: tsx scripts/gsc.ts inspect <full-url>");
    process.exit(1);
  }
  const result = await inspectUrl(url);
  console.log(JSON.stringify(result, null, 2));
}

async function cmdAnalytics(daysArg?: string) {
  const days = Math.max(1, Math.min(90, Number(daysArg ?? 28) || 28));
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const queries = await querySearchAnalytics({
    startDate: fmt(start),
    endDate: fmt(end),
    dimensions: ["query"],
    rowLimit: 25,
  });
  console.log(`Top queries ${fmt(start)} → ${fmt(end)}:`);
  printTable(
    queries.map((r) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Number((r.ctr * 100).toFixed(2)),
      position: Number(r.position.toFixed(1)),
    })),
  );

  const pages = await querySearchAnalytics({
    startDate: fmt(start),
    endDate: fmt(end),
    dimensions: ["page"],
    rowLimit: 25,
  });
  console.log(`\nTop pages ${fmt(start)} → ${fmt(end)}:`);
  printTable(
    pages.map((r) => ({
      page: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Number((r.ctr * 100).toFixed(2)),
      position: Number(r.position.toFixed(1)),
    })),
  );
}

async function cmdSync() {
  const result = await runGscDailySync();
  console.log(
    JSON.stringify(
      {
        siteUrl: result.siteUrl,
        sitemapUrl: result.sitemapUrl,
        window: result.window,
        topQueries: result.topQueries.slice(0, 10),
        topPages: result.topPages.slice(0, 10),
        lastRunAt: result.lastRunAt,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  switch (cmd) {
    case "ping":       return cmdPing();
    case "list":       return cmdList();
    case "inspect":    return cmdInspect(rest[0]);
    case "analytics":  return cmdAnalytics(rest[0]);
    case "sync":       return cmdSync();
    default:
      console.error(
        "Usage: tsx scripts/gsc.ts <ping|list|inspect <url>|analytics [days]|sync>",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("GSC command failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

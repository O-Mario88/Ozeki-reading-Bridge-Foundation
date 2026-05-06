import fs from "node:fs/promises";
import { google, type searchconsole_v1 } from "googleapis";

/**
 * Google Search Console (Webmasters) API client.
 *
 * Auth: service account with the "Owner" role on the target Search Console
 * property. Credentials come from one of these env vars (first wins):
 *   1. GSC_SERVICE_ACCOUNT_JSON       — inline JSON string
 *   2. GSC_SERVICE_ACCOUNT_JSON_B64   — base64-encoded JSON (recommended for Railway service variables)
 *   3. GSC_SERVICE_ACCOUNT_FILE       — absolute path to the JSON key on disk
 *
 * The target property is GSC_SITE_URL, e.g. "https://www.ozekiread.org/".
 */

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters";

export type GscConfig = {
  siteUrl: string;
  credentials: { client_email: string; private_key: string };
};

async function readCredentialsFromFile(path: string) {
  const buf = await fs.readFile(path, "utf8");
  return JSON.parse(buf) as { client_email: string; private_key: string };
}

export async function loadGscConfig(): Promise<GscConfig> {
  const siteUrl = (process.env.GSC_SITE_URL || "").trim();
  if (!siteUrl) {
    throw new Error("GSC_SITE_URL is not set (e.g. 'https://www.ozekiread.org/').");
  }

  const inline = (process.env.GSC_SERVICE_ACCOUNT_JSON || "").trim();
  const b64 = (process.env.GSC_SERVICE_ACCOUNT_JSON_B64 || "").trim();
  const file = (process.env.GSC_SERVICE_ACCOUNT_FILE || "").trim();

  let credentials: { client_email: string; private_key: string } | null = null;
  if (inline) {
    credentials = JSON.parse(inline);
  } else if (b64) {
    credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } else if (file) {
    credentials = await readCredentialsFromFile(file);
  }

  if (!credentials || !credentials.client_email || !credentials.private_key) {
    throw new Error(
      "No GSC service-account credentials found. Set GSC_SERVICE_ACCOUNT_JSON / _B64 / _FILE.",
    );
  }
  return { siteUrl, credentials };
}

export async function getSearchConsoleClient(): Promise<{
  client: searchconsole_v1.Searchconsole;
  siteUrl: string;
}> {
  const cfg = await loadGscConfig();
  const auth = new google.auth.JWT({
    email: cfg.credentials.client_email,
    key: cfg.credentials.private_key,
    scopes: [GSC_SCOPE],
  });
  await auth.authorize();
  const client = google.searchconsole({ version: "v1", auth });
  return { client, siteUrl: cfg.siteUrl };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Sitemaps                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export async function submitSitemap(sitemapUrl: string) {
  const { client, siteUrl } = await getSearchConsoleClient();
  await client.sitemaps.submit({ siteUrl, feedpath: sitemapUrl });
  return { ok: true, siteUrl, sitemapUrl };
}

export async function listSitemaps() {
  const { client, siteUrl } = await getSearchConsoleClient();
  const res = await client.sitemaps.list({ siteUrl });
  return res.data.sitemap ?? [];
}

/* ────────────────────────────────────────────────────────────────────────── */
/* URL Inspection                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

export type UrlInspectionResult = {
  url: string;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  referringUrls: string[];
  sitemapsInGsc: string[];
};

export async function inspectUrl(url: string): Promise<UrlInspectionResult> {
  const { client, siteUrl } = await getSearchConsoleClient();
  const res = await client.urlInspection.index.inspect({
    requestBody: { inspectionUrl: url, siteUrl, languageCode: "en-US" },
  });
  const r = res.data.inspectionResult ?? {};
  const idx = r.indexStatusResult ?? {};
  return {
    url,
    verdict: idx.verdict ?? null,
    coverageState: idx.coverageState ?? null,
    indexingState: idx.indexingState ?? null,
    lastCrawlTime: idx.lastCrawlTime ?? null,
    pageFetchState: idx.pageFetchState ?? null,
    robotsTxtState: idx.robotsTxtState ?? null,
    googleCanonical: idx.googleCanonical ?? null,
    userCanonical: idx.userCanonical ?? null,
    referringUrls: idx.referringUrls ?? [],
    sitemapsInGsc: idx.sitemap ?? [],
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Search analytics                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type SearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function querySearchAnalytics(opts: {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions?: Array<"query" | "page" | "country" | "device" | "date">;
  rowLimit?: number;
}): Promise<SearchAnalyticsRow[]> {
  const { client, siteUrl } = await getSearchConsoleClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions ?? ["query"],
      rowLimit: Math.min(25000, Math.max(1, opts.rowLimit ?? 1000)),
    },
  });
  return (res.data.rows ?? []).map((row) => ({
    keys: row.keys ?? [],
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Composite routine — the daily sync                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export async function runGscDailySync() {
  const { siteUrl } = await loadGscConfig();
  const sitemapUrl = `${siteUrl.replace(/\/$/, "")}/sitemap.xml`;
  await submitSitemap(sitemapUrl);

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const topQueries = await querySearchAnalytics({
    startDate: fmt(start),
    endDate: fmt(end),
    dimensions: ["query"],
    rowLimit: 50,
  });
  const topPages = await querySearchAnalytics({
    startDate: fmt(start),
    endDate: fmt(end),
    dimensions: ["page"],
    rowLimit: 50,
  });

  return {
    siteUrl,
    sitemapUrl,
    lastRunAt: new Date().toISOString(),
    window: { startDate: fmt(start), endDate: fmt(end) },
    topQueries,
    topPages,
  };
}

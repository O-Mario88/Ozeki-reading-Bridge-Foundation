/**
 * Read API for the /portal/stories dashboard.
 *
 * Aggregates from existing tables — no new schema:
 *   story_library              (publish_status, language, school_id, view_count)
 *   story_activities           (date, session_type, learners_count)
 *   story_anthologies          (publish_status)
 *   schools_directory          (joined for school names + counts)
 *
 * Each function returns null/[] on miss so the page can fall through
 * to its FALLBACK constant. Postgres errors bubble up; the page's
 * safeFetch wrapper catches them and falls back too.
 */

import { queryPostgres } from "@/lib/server/postgres/client";

export type StoriesKpis = {
  storiesCollected: number;
  publishedStories: number;
  pendingReview: number;
  activeStorytellers: number;
  schoolsContributing: number;
  learnersReached: number;
  anthologiesCreated: number;
};

export type StoryStatusSegment = { label: string; value: number; pct: number };
export type StoryLanguageRow = { label: string; pct: number };
export type StoryGenreRow = { label: string; pct: number };
export type StoryTrendPoint = { month: string; submissions: number };
export type EngagementPoint = { month: string; reads: number; completionPct: number };

export type TopSchoolRow = {
  school: string; district: string;
  submitted: number; published: number; reads: number; status: string;
};

export type CurationRow = {
  title: string; school: string; language: string;
  reviewerStatus: string; urgency: string;
};

export type RecentSubmissionRow = {
  date: string; title: string; school: string; storyteller: string; status: string;
};

export type FeaturedRow = {
  title: string; genre: string; reads: string; likes: number; swatch: string;
};

export type SessionRow = {
  activity: string; school: string; whenIso: string;
};

function isoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function isoDay(v: unknown): string | null {
  const s = isoDate(v);
  return s ? s.slice(0, 10) : null;
}

/* ── KPIs ──────────────────────────────────────────────────────────── */

export async function getStoriesKpis(): Promise<StoriesKpis | null> {
  const res = await queryPostgres<{
    collected: string; published: string; pending: string;
    storytellers: string; schools: string;
    learners: string; anthologies: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM story_library) AS collected,
       (SELECT COUNT(*)::int FROM story_library
          WHERE publish_status = 'published') AS published,
       (SELECT COUNT(*)::int FROM story_library
          WHERE publish_status = 'review') AS pending,
       (SELECT COUNT(DISTINCT learner_uid)::int FROM story_library
          WHERE learner_uid IS NOT NULL) AS storytellers,
       (SELECT COUNT(DISTINCT school_id)::int FROM story_library) AS schools,
       (SELECT COALESCE(SUM(learners_count), 0)::int FROM story_activities) AS learners,
       (SELECT COUNT(*)::int FROM story_anthologies) AS anthologies`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const collected = Number(r.collected) || 0;
  if (collected === 0) return null;
  return {
    storiesCollected:    collected,
    publishedStories:    Number(r.published) || 0,
    pendingReview:       Number(r.pending) || 0,
    activeStorytellers:  Number(r.storytellers) || 0,
    schoolsContributing: Number(r.schools) || 0,
    learnersReached:     Number(r.learners) || 0,
    anthologiesCreated:  Number(r.anthologies) || 0,
  };
}

/* ── Status breakdown donut ────────────────────────────────────────── */

export async function getStoryStatusBreakdown(): Promise<{ total: number; segments: StoryStatusSegment[] } | null> {
  const res = await queryPostgres<{ status: string; count: string }>(
    `SELECT publish_status AS status, COUNT(*)::int AS count
       FROM story_library
      GROUP BY publish_status`,
  );
  const counts = new Map<string, number>(
    res.rows.map((r) => [r.status, Number(r.count) || 0]),
  );
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return null;
  const segments: StoryStatusSegment[] = [
    { label: "Published",    value: counts.get("published") ?? 0, pct: 0 },
    { label: "Under Review", value: counts.get("review")    ?? 0, pct: 0 },
    { label: "Draft",        value: counts.get("draft")     ?? 0, pct: 0 },
    { label: "Rejected",     value: counts.get("rejected")  ?? 0, pct: 0 },
  ];
  for (const s of segments) s.pct = Math.round((s.value / total) * 100);
  return { total, segments };
}

/* ── Language mix ──────────────────────────────────────────────────── */

export async function getStoryLanguageMix(): Promise<StoryLanguageRow[]> {
  const res = await queryPostgres<{ language: string; count: string }>(
    `SELECT language, COUNT(*)::int AS count
       FROM story_library
      WHERE publish_status = 'published'
      GROUP BY language
      ORDER BY count DESC
      LIMIT 6`,
  );
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return [];
  return res.rows.map((r) => ({
    label: r.language,
    pct: Math.round(((Number(r.count) || 0) / total) * 100),
  }));
}

/* ── Genre mix (from `tags` JSON column — first tag treated as genre) ── */

export async function getStoryGenreMix(): Promise<StoryGenreRow[]> {
  const res = await queryPostgres<{ tag: string; count: string }>(
    `WITH tag_rows AS (
       SELECT json_array_elements_text(tags::json) AS tag
         FROM story_library
        WHERE publish_status = 'published'
          AND tags IS NOT NULL AND tags <> '' AND tags <> '[]'
     )
     SELECT INITCAP(tag) AS tag, COUNT(*)::int AS count
       FROM tag_rows
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 4`,
  );
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return [];
  return res.rows.map((r) => ({
    label: r.tag,
    pct: Math.round(((Number(r.count) || 0) / total) * 100),
  }));
}

/* ── Submission trend (last N months) ──────────────────────────────── */

export async function getStorySubmissionTrend(months = 6): Promise<StoryTrendPoint[]> {
  const res = await queryPostgres<{ month: string; count: string }>(
    `WITH window AS (
       SELECT generate_series(
         date_trunc('month', NOW()) - (($1 - 1) || ' months')::interval,
         date_trunc('month', NOW()),
         '1 month'
       )::date AS month_start
     )
     SELECT TO_CHAR(w.month_start, 'Mon') AS month,
            COUNT(s.id)::int AS count
       FROM window w
       LEFT JOIN story_library s
         ON date_trunc('month', s.created_at) = w.month_start
      GROUP BY w.month_start
      ORDER BY w.month_start`,
    [months],
  );
  return res.rows.map((r) => ({ month: r.month, submissions: Number(r.count) || 0 }));
}

/* ── Reading reach + completion (proxy via view_count + published rate) ── */

export async function getStoryEngagementTrend(months = 6): Promise<EngagementPoint[]> {
  const res = await queryPostgres<{ month: string; reads: string | null; completion: string | null }>(
    `WITH window AS (
       SELECT generate_series(
         date_trunc('month', NOW()) - (($1 - 1) || ' months')::interval,
         date_trunc('month', NOW()),
         '1 month'
       )::date AS month_start
     )
     SELECT TO_CHAR(w.month_start, 'Mon') AS month,
            COALESCE(SUM(s.view_count), 0)::int AS reads,
            CASE WHEN COUNT(s.id) > 0
                 THEN ROUND(100.0 * SUM(CASE WHEN s.publish_status = 'published' THEN 1 ELSE 0 END) / COUNT(s.id))
                 ELSE NULL END AS completion
       FROM window w
       LEFT JOIN story_library s
         ON s.created_at <= (w.month_start + INTERVAL '1 month')
      GROUP BY w.month_start
      ORDER BY w.month_start`,
    [months],
  );
  return res.rows
    .filter((r) => r.completion !== null)
    .map((r) => ({
      month: r.month,
      reads: Number(r.reads) || 0,
      completionPct: Number(r.completion) || 0,
    }));
}

/* ── Top performing schools ────────────────────────────────────────── */

export async function listTopPerformingSchools(limit = 5): Promise<TopSchoolRow[]> {
  const res = await queryPostgres<{
    name: string; district: string;
    submitted: string; published: string; reads: string;
  }>(
    `SELECT sd.name, sd.district,
            COUNT(s.id)::int AS submitted,
            SUM(CASE WHEN s.publish_status = 'published' THEN 1 ELSE 0 END)::int AS published,
            COALESCE(SUM(s.view_count), 0)::int AS reads
       FROM schools_directory sd
       JOIN story_library s ON s.school_id = sd.id
      GROUP BY sd.id, sd.name, sd.district
      ORDER BY published DESC, submitted DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => {
    const published = Number(r.published) || 0;
    const submitted = Number(r.submitted) || 0;
    const ratio = submitted > 0 ? published / submitted : 0;
    const status = ratio >= 0.7 ? "Excellent" : ratio >= 0.5 ? "Very Good" : "Good";
    return {
      school: r.name,
      district: r.district || "—",
      submitted, published,
      reads: Number(r.reads) || 0,
      status,
    };
  });
}

/* ── Curation queue (stories awaiting review) ──────────────────────── */

export async function listCurationQueue(limit = 5): Promise<CurationRow[]> {
  const res = await queryPostgres<{
    title: string; school: string; language: string; created_at: string;
  }>(
    `SELECT s.title, sd.name AS school, s.language, s.created_at
       FROM story_library s
       JOIN schools_directory sd ON sd.id = s.school_id
      WHERE s.publish_status = 'review'
      ORDER BY s.created_at
      LIMIT $1`,
    [limit],
  );
  const now = Date.now();
  return res.rows.map((r) => {
    const ageDays = Math.max(0, (now - new Date(r.created_at).getTime()) / 86400000);
    const urgency = ageDays > 14 ? "High" : ageDays > 7 ? "Medium" : "Low";
    return {
      title: r.title,
      school: r.school,
      language: r.language || "English",
      reviewerStatus: "Unassigned",
      urgency,
    };
  });
}

/* ── Recent submissions ────────────────────────────────────────────── */

export async function listRecentStorySubmissions(limit = 5): Promise<RecentSubmissionRow[]> {
  const res = await queryPostgres<{
    title: string; school: string; storyteller: string | null;
    status: string; created_at: string;
  }>(
    `SELECT s.title,
            sd.name AS school,
            COALESCE(s.public_author_display, s.author_about, '—') AS storyteller,
            s.publish_status AS status,
            s.created_at
       FROM story_library s
       JOIN schools_directory sd ON sd.id = s.school_id
      ORDER BY s.created_at DESC
      LIMIT $1`,
    [limit],
  );
  const map: Record<string, string> = {
    draft: "Draft", review: "Under Review", published: "Submitted",
  };
  return res.rows.map((r) => ({
    date: isoDay(r.created_at) ?? "",
    title: r.title,
    school: r.school,
    storyteller: r.storyteller ?? "—",
    status: map[r.status] ?? r.status,
  }));
}

/* ── Featured stories (top by view_count) ──────────────────────────── */

const swatches = ["#fde68a", "#bfdbfe", "#fecaca", "#bbf7d0", "#ddd6fe"];

export async function listFeaturedStories(limit = 5): Promise<FeaturedRow[]> {
  const res = await queryPostgres<{
    title: string; tags: string; views: string;
  }>(
    `SELECT title, tags, view_count AS views
       FROM story_library
      WHERE publish_status = 'published'
      ORDER BY view_count DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r, i) => {
    let genre = "Story";
    try {
      const arr = JSON.parse(r.tags || "[]") as string[];
      if (arr[0]) genre = arr[0].charAt(0).toUpperCase() + arr[0].slice(1);
    } catch { /* ignore */ }
    const reads = Number(r.views) || 0;
    const readsLabel = reads >= 1000 ? `${(reads / 1000).toFixed(1)}K` : String(reads);
    // Likes proxy = ~13% of reads (no separate likes table yet)
    const likes = Math.round(reads * 0.13);
    return {
      title: r.title,
      genre,
      reads: readsLabel,
      likes,
      swatch: swatches[i % swatches.length],
    };
  });
}

/* ── Story sessions & read-alouds ──────────────────────────────────── */

export async function listStorySessions(limit = 5): Promise<SessionRow[]> {
  const res = await queryPostgres<{
    session_type: string; school: string; date: string;
  }>(
    `SELECT a.session_type, sd.name AS school, a.date
       FROM story_activities a
       JOIN schools_directory sd ON sd.id = a.school_id
      ORDER BY a.date DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    activity: r.session_type,
    school: r.school,
    whenIso: isoDay(r.date) ?? "",
  }));
}

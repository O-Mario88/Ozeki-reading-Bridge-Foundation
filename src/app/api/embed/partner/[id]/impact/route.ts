import { NextResponse } from "next/server";
import { findExternalUserByRefCodePostgres } from "@/lib/server/postgres/repositories/external-users";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getPublicReachFootprint } from "@/lib/server/postgres/repositories/public-metrics";

export const runtime = "nodejs";
export const revalidate = 600;

const NUMBER = new Intl.NumberFormat("en-US");

async function recordView(partnerUserId: number) {
  void queryPostgres(
    `INSERT INTO partner_embed_widgets (partner_user_id, ref_code, view_count, last_viewed_at)
     VALUES ($1, encode(gen_random_bytes(8), 'hex'), 1, NOW())
     ON CONFLICT DO NOTHING`,
    [partnerUserId],
  ).catch(() => {});
  void queryPostgres(
    `UPDATE partner_embed_widgets
     SET view_count = view_count + 1, last_viewed_at = NOW()
     WHERE partner_user_id = $1`,
    [partnerUserId],
  ).catch(() => {});
}

async function getQuickStats() {
  const [reach, learners, teachers] = await Promise.all([
    getPublicReachFootprint(),
    queryPostgres<{ n: number }>(`SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records`),
    queryPostgres<{ n: number }>(
      `SELECT COUNT(DISTINCT teacher_uid)::int AS n FROM (
        SELECT teacher_uid FROM training_participants WHERE teacher_uid IS NOT NULL
        UNION
        SELECT teacher_uid FROM portal_training_attendance WHERE teacher_uid IS NOT NULL AND attended IS TRUE
      ) all_training`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
  ]);
  return {
    schoolsReached: reach?.schoolsReached ?? 0,
    districtsReached: reach?.districtsReached ?? 0,
    regionsReached: reach?.regionsReached ?? 0,
    learnersReached: Number(learners.rows[0]?.n ?? 0),
    teachersTrained: Number(teachers.rows[0]?.n ?? 0),
  };
}

function buildHtml(args: {
  partnerName: string;
  brandColor: string;
  customHeading: string | null;
  showLearners: boolean;
  showTeachers: boolean;
  showDistricts: boolean;
  stats: Awaited<ReturnType<typeof getQuickStats>>;
}) {
  const { partnerName, brandColor, customHeading, showLearners, showTeachers, showDistricts, stats } = args;
  const heading = customHeading ?? `Impact powered together with ${partnerName}`;
  const cards: { label: string; value: string }[] = [];
  if (showDistricts) cards.push({ label: "Districts", value: NUMBER.format(stats.districtsReached) });
  cards.push({ label: "Schools", value: NUMBER.format(stats.schoolsReached) });
  if (showLearners) cards.push({ label: "Learners reached", value: NUMBER.format(stats.learnersReached) });
  if (showTeachers) cards.push({ label: "Teachers trained", value: NUMBER.format(stats.teachersTrained) });

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Ozeki Reading Bridge · Impact</title>
<style>
  :root { --brand: ${brandColor}; }
  * { box-sizing: border-box; }
  body { margin:0; padding:16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background:#fff; color:#111827; }
  .wrap { max-width:720px; margin:0 auto; }
  .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .title { font-size:14px; font-weight:700; color:#111827; }
  .meta { font-size:11px; color:#6b7280; }
  .badge { font-size:10px; font-weight:700; color:#fff; background:var(--brand); padding:4px 10px; border-radius:999px; letter-spacing:0.5px; text-transform:uppercase; }
  .grid { display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
  .card { border:1px solid #e5e7eb; border-radius:12px; padding:14px; background:#fafafa; }
  .label { font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px; }
  .value { font-size:22px; font-weight:800; color:#111827; margin-top:4px; }
  .foot { margin-top:14px; font-size:10px; color:#9ca3af; }
  .foot a { color:var(--brand); text-decoration:none; }
</style></head>
<body>
  <div class="wrap">
    <div class="head">
      <div>
        <div class="title">${heading}</div>
        <div class="meta">Live data from Ozeki Reading Bridge · refreshed every 10 minutes</div>
      </div>
      <div class="badge">Live</div>
    </div>
    <div class="grid">
      ${cards.map((c) => `<div class="card"><div class="label">${c.label}</div><div class="value">${c.value}</div></div>`).join("")}
    </div>
    <div class="foot">
      Powered by <a href="https://www.ozekiread.org" target="_blank" rel="noopener">Ozeki Reading Bridge Foundation</a>
    </div>
  </div>
</body></html>`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const partner = await findExternalUserByRefCodePostgres(id);
  if (!partner || partner.role !== "partner" || partner.status !== "active") {
    return new NextResponse("Widget not available.", { status: 404 });
  }

  const widgetRow = await queryPostgres<{
    brand_color: string;
    show_learners: boolean;
    show_teachers: boolean;
    show_districts: boolean;
    custom_heading: string | null;
  }>(
    `SELECT brand_color, show_learners, show_teachers, show_districts, custom_heading
     FROM partner_embed_widgets WHERE partner_user_id = $1
     ORDER BY id DESC LIMIT 1`,
    [partner.id],
  );

  const widget = widgetRow.rows[0];
  const stats = await getQuickStats();

  const html = buildHtml({
    partnerName: partner.organization || partner.fullName,
    brandColor: widget?.brand_color ?? "#066a67",
    customHeading: widget?.custom_heading ?? null,
    showLearners: widget?.show_learners ?? true,
    showTeachers: widget?.show_teachers ?? true,
    showDistricts: widget?.show_districts ?? true,
    stats,
  });

  await recordView(partner.id);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      // Allow framing — this widget is purpose-built for iframe embedding.
      "Content-Security-Policy": "frame-ancestors *",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}

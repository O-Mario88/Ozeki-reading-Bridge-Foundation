import Link from "next/link";
import {
  BookOpen, BookOpenCheck, Clock, Users, School as SchoolIcon, UsersRound, Layers,
  Download, Plus, ChevronDown, ChevronRight, ShieldCheck, TrendingUp, TrendingDown,
  Star, Flag, BookMarked, ImageIcon, Lightbulb, Info, Heart, Mic, BookOpenText,
  GraduationCap, Sparkles, CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import {
  DashboardListCard, DashboardListHeader, DashboardListRow,
  StatusPill, pillToneFor,
} from "@/components/portal/DashboardList";
import { requirePortalStaffUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getStoriesKpis, getStoryStatusBreakdown, getStoryLanguageMix,
  getStoryGenreMix, getStorySubmissionTrend, getStoryEngagementTrend,
  listTopPerformingSchools, listCurationQueue, listRecentStorySubmissions,
  listFeaturedStories, listStorySessions,
} from "@/lib/server/postgres/repositories/stories-dashboard";

async function safeFetch<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); }
  catch (err) {
    logger.warn(`[stories] ${label} failed; falling back to mock`, { error: String(err) });
    return null;
  }
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch { return iso; }
}

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "numeric", minute: "2-digit",
    }).replace(",", "");
  } catch { return iso; }
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "1001 Story Overview | Ozeki Portal",
  description:
    "Track story collection, review, publishing, reading reach, and engagement across the network.",
};

/* ────────────────────────────────────────────────────────────────────
   Reference data — frozen from the supplied screenshot. The dashboard
   renders these exact numbers per the pixel-faithful spec.
   ──────────────────────────────────────────────────────────────────── */
const FALLBACK = {
  kpis: {
    storiesCollected: 12486, storiesCollectedDelta: 18,
    publishedStories: 8214, publishedStoriesDelta: 15,
    pendingReview: 1172, pendingReviewDelta: -6,
    activeStorytellers: 426, activeStorytellersDelta: 12,
    schoolsContributing: 172, schoolsContributingDelta: 8,
    learnersReached: 32600, learnersReachedDelta: 21,
    anthologiesCreated: 148, anthologiesCreatedDelta: 9,
  },
  trend: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    submissions: [1700, 1900, 2200, 2600, 2500, 2600],
    delta: 18,
  },
  status: {
    total: 12486,
    segments: [
      { label: "Published",    value: 8214, pct: 66, color: "#10b981" },
      { label: "Under Review", value: 1172, pct: 9,  color: "#f97316" },
      { label: "Draft",        value: 2642, pct: 21, color: "#2563eb" },
      { label: "Rejected",     value: 458,  pct: 4,  color: "#ef4444" },
    ],
  },
  language: [
    { label: "English",  pct: 61, color: "#10b981" },
    { label: "Luo",      pct: 18, color: "#2563eb" },
    { label: "Luganda",  pct: 12, color: "#8b5cf6" },
    { label: "Ateso",    pct: 9,  color: "#f97316" },
  ],
  genre: [
    { label: "Folktale",        pct: 42, color: "#10b981" },
    { label: "Personal Story",  pct: 28, color: "#2563eb" },
    { label: "Poem",            pct: 16, color: "#8b5cf6" },
    { label: "Classroom Story", pct: 14, color: "#f97316" },
  ],
  engagement: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    reads:        [10000, 14000, 19000, 26000, 31000, 34200],
    completion:   [45,    48,    52,    55,    58,    62],
    readsLabel: "3.2x", completionLabel: "62%",
  },
  topSchools: [
    { school: "Kawanda Hills Academy", district: "Kampala", submitted: 842, published: 612, reads: 3421, status: "Excellent" },
    { school: "St. Jude Primary School", district: "Gulu", submitted: 721, published: 498, reads: 2987, status: "Excellent" },
    { school: "Acoli Model Primary", district: "Gulu", submitted: 619, published: 412, reads: 2341, status: "Very Good" },
    { school: "Bright Future Academy", district: "Mukono", submitted: 543, published: 361, reads: 1982, status: "Very Good" },
    { school: "Hope Primary School", district: "Mbale", submitted: 487, published: 305, reads: 1754, status: "Good" },
  ],
  funnel: [
    { label: "Submitted",            value: 12486, pct: 100  },
    { label: "Reviewed",             value: 9812,  pct: 78.6 },
    { label: "Approved",             value: 8972,  pct: 72.0 },
    { label: "Published",            value: 8214,  pct: 65.8 },
    { label: "Included in Anthology", value: 1326, pct: 10.6 },
  ],
  curation: [
    { title: "The Clever Tortoise",     school: "Lira Primary School",      language: "Luo",     status: "Unassigned",          statusTone: "muted",  urgency: "High",   icon: BookOpen },
    { title: "My Village Festival",     school: "Acoli Model Primary",      language: "English", status: "Assigned to C. Auma", statusTone: "blue",   urgency: "Medium", icon: BookOpen },
    { title: "Journey to the Market",   school: "St. Jude Primary School",  language: "Luganda", status: "Awaiting Review",     statusTone: "orange", urgency: "Medium", icon: BookOpen },
    { title: "The Talking Drum",        school: "Pader Primary School",     language: "Ateso",   status: "Assigned to J. Okello", statusTone: "blue", urgency: "Low",    icon: BookOpen },
    { title: "Rain Brings Life",        school: "Bright Future Academy",    language: "English", status: "Unassigned",          statusTone: "muted",  urgency: "Low",    icon: BookOpen },
  ],
  recent: [
    { date: "Jun 8, 2024",  title: "The Mango Tree",  school: "Lira PS",        storyteller: "Akor Mary",      status: "Draft" },
    { date: "Jun 7, 2024",  title: "A Day at School", school: "St. Jude PS",    storyteller: "Otieno James",   status: "Under Review" },
    { date: "Jun 7, 2024",  title: "The Brave Girl",  school: "Acoli Model PS", storyteller: "Anyango Sarah",  status: "Submitted" },
    { date: "Jun 6, 2024",  title: "My Grandmother",  school: "Kawanda Hills",  storyteller: "Nambiru Faith",  status: "Draft" },
    { date: "Jun 6, 2024",  title: "Fishing with Dad", school: "Pader PS",      storyteller: "Okello Daniel",  status: "Submitted" },
  ],
  featured: [
    { title: "The Boy Who Found Light", genre: "Folktale",        reads: "2.4K", likes: 312, swatch: "#fde68a" },
    { title: "A Letter to My Teacher",  genre: "Personal Story",  reads: "1.9K", likes: 245, swatch: "#bfdbfe" },
    { title: "The Drumming Festival",   genre: "Poem",            reads: "1.7K", likes: 198, swatch: "#fecaca" },
    { title: "Lesson Under the Tree",   genre: "Classroom Story", reads: "1.5K", likes: 176, swatch: "#bbf7d0" },
    { title: "The Old Well",            genre: "Folktale",        reads: "1.2K", likes: 140, swatch: "#ddd6fe" },
  ],
  sessions: [
    { activity: "Read-Aloud: Folktales",     school: "Hope Primary School",       when: "Jun 10, 2024  10:00 AM", icon: Mic,            tone: "amber" },
    { activity: "Story Circle Session",       school: "Kawanda Hills Academy",     when: "Jun 11, 2024  2:00 PM",  icon: BookOpenText,   tone: "emerald" },
    { activity: "Classroom Reading Hour",     school: "Acoli Model Primary",       when: "Jun 12, 2024  9:00 AM",  icon: Clock,          tone: "blue" },
    { activity: "Author Visit: Storytelling", school: "St. Jude Primary School",   when: "Jun 13, 2024  11:00 AM", icon: GraduationCap,  tone: "violet" },
    { activity: "Community Story Night",      school: "Pader Primary School",      when: "Jun 14, 2024  6:00 PM",  icon: Sparkles,       tone: "pink" },
  ],
  quality: {
    rating:        { value: "4.6 / 5",   delta: "0.3 vs last 30 days",    direction: "up" as const },
    flagged:       { value: "23",        delta: "-12 vs last 30 days",    direction: "down" as const },
    readability:   { value: "71 / 100",  delta: "5 pts vs last 30 days",  direction: "up" as const },
    illustration:  { value: "58%",       delta: "6% vs last 30 days",     direction: "up" as const },
  },
  insight: {
    text: "Community storytelling is accelerating — published story volume is up 18%, with the strongest contribution from Central and Acholi regions.",
    updated: "Jun 10, 2024  •  9:15 AM",
  },
};

/* Calibri-first font stack applied to the entire page wrapper */
const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function PortalStoryOverviewPage() {
  const user = await requirePortalStaffUser();

  const [
    liveKpis, liveStatus, liveLang, liveGenre, liveTrend, liveEngagement,
    liveTopSchools, liveCuration, liveRecent, liveFeatured, liveSessions,
  ] = await Promise.all([
    safeFetch("kpis",        () => getStoriesKpis()),
    safeFetch("status",      () => getStoryStatusBreakdown()),
    safeFetch("language",    () => getStoryLanguageMix()),
    safeFetch("genre",       () => getStoryGenreMix()),
    safeFetch("trend",       () => getStorySubmissionTrend(6)),
    safeFetch("engagement",  () => getStoryEngagementTrend(6)),
    safeFetch("topSchools",  () => listTopPerformingSchools(5)),
    safeFetch("curation",    () => listCurationQueue(5)),
    safeFetch("recent",      () => listRecentStorySubmissions(5)),
    safeFetch("featured",    () => listFeaturedStories(5)),
    safeFetch("sessions",    () => listStorySessions(5)),
  ]);

  /* Overlay live data onto FALLBACK; null/[] keeps the screenshot value. */
  const DATA = {
    ...FALLBACK,
    kpis: liveKpis ? {
      storiesCollected: liveKpis.storiesCollected,
      storiesCollectedDelta: FALLBACK.kpis.storiesCollectedDelta,
      publishedStories: liveKpis.publishedStories,
      publishedStoriesDelta: FALLBACK.kpis.publishedStoriesDelta,
      pendingReview: liveKpis.pendingReview,
      pendingReviewDelta: FALLBACK.kpis.pendingReviewDelta,
      activeStorytellers: liveKpis.activeStorytellers,
      activeStorytellersDelta: FALLBACK.kpis.activeStorytellersDelta,
      schoolsContributing: liveKpis.schoolsContributing,
      schoolsContributingDelta: FALLBACK.kpis.schoolsContributingDelta,
      learnersReached: liveKpis.learnersReached,
      learnersReachedDelta: FALLBACK.kpis.learnersReachedDelta,
      anthologiesCreated: liveKpis.anthologiesCreated,
      anthologiesCreatedDelta: FALLBACK.kpis.anthologiesCreatedDelta,
    } : FALLBACK.kpis,
    trend: liveTrend && liveTrend.length > 0
      ? {
          months: liveTrend.map((p) => p.month),
          submissions: liveTrend.map((p) => p.submissions),
          delta: FALLBACK.trend.delta,
        }
      : FALLBACK.trend,
    status: liveStatus
      ? {
          total: liveStatus.total,
          segments: liveStatus.segments.map((s, i) => ({
            ...s,
            color: FALLBACK.status.segments[i]?.color ?? "#10b981",
          })),
        }
      : FALLBACK.status,
    language: liveLang && liveLang.length > 0
      ? liveLang.map((l, i) => ({ ...l, color: FALLBACK.language[i]?.color ?? "#10b981" }))
      : FALLBACK.language,
    genre: liveGenre && liveGenre.length > 0
      ? liveGenre.map((g, i) => ({ ...g, color: FALLBACK.genre[i]?.color ?? "#10b981" }))
      : FALLBACK.genre,
    engagement: liveEngagement && liveEngagement.length > 0
      ? {
          months: liveEngagement.map((p) => p.month),
          reads: liveEngagement.map((p) => p.reads),
          completion: liveEngagement.map((p) => p.completionPct),
          readsLabel: FALLBACK.engagement.readsLabel,
          completionLabel: `${liveEngagement[liveEngagement.length - 1]?.completionPct ?? 0}%`,
        }
      : FALLBACK.engagement,
    topSchools: liveTopSchools && liveTopSchools.length > 0 ? liveTopSchools : FALLBACK.topSchools,
    curation: liveCuration && liveCuration.length > 0
      ? liveCuration.map((c) => {
          const fb = FALLBACK.curation[0];
          return {
            title: c.title,
            school: c.school,
            language: c.language,
            status: c.reviewerStatus,
            statusTone: "muted",
            urgency: c.urgency,
            icon: fb.icon,
          };
        })
      : FALLBACK.curation,
    recent: liveRecent && liveRecent.length > 0
      ? liveRecent.map((r) => ({
          date: fmtDate(r.date),
          title: r.title,
          school: r.school,
          storyteller: r.storyteller,
          status: r.status,
        }))
      : FALLBACK.recent,
    featured: liveFeatured && liveFeatured.length > 0 ? liveFeatured : FALLBACK.featured,
    sessions: liveSessions && liveSessions.length > 0
      ? liveSessions.map((s, i) => {
          const fb = FALLBACK.sessions[i] ?? FALLBACK.sessions[0];
          return {
            activity: s.activity,
            school: s.school,
            when: fmtDateTime(s.whenIso),
            icon: fb.icon,
            tone: fb.tone,
          };
        })
      : FALLBACK.sessions,
  };

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/stories"
      greeting={`Welcome back, ${user.fullName ?? "Ozeki Team"} 👋`}
      subtitle="Here's what's happening across your story collection network today."
      hideFrame
    >
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#f8fafc" }}
        className="px-4 sm:px-6 lg:px-8 py-6 space-y-4 max-w-[1700px] mx-auto"
      >
        {/* ─── Title row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] md:text-[28px] font-extrabold tracking-tight text-[#102033] leading-tight">
                1001 Story Overview
              </h1>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
              </span>
            </div>
            <p className="text-[13px] md:text-[14px] text-[#667085] leading-snug mt-1">
              Track story collection, review, publishing, reading reach, and engagement across the network.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/stories?action=export"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export Report
            </Link>
            <Link
              href="/portal/story/manage?action=new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New Story
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              Actions
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ─── KPI strip — 7 metric cards ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          <Kpi label="STORIES COLLECTED"    value={fmt(DATA.kpis.storiesCollected)}      delta={DATA.kpis.storiesCollectedDelta}      icon={BookOpen}        accent="emerald" />
          <Kpi label="PUBLISHED STORIES"    value={fmt(DATA.kpis.publishedStories)}      delta={DATA.kpis.publishedStoriesDelta}      icon={BookOpenCheck}   accent="blue" />
          <Kpi label="PENDING REVIEW"       value={fmt(DATA.kpis.pendingReview)}         delta={DATA.kpis.pendingReviewDelta}         icon={Clock}           accent="orange" />
          <Kpi label="ACTIVE STORYTELLERS"  value={fmt(DATA.kpis.activeStorytellers)}    delta={DATA.kpis.activeStorytellersDelta}    icon={Users}           accent="violet" />
          <Kpi label="SCHOOLS CONTRIBUTING" value={fmt(DATA.kpis.schoolsContributing)}   delta={DATA.kpis.schoolsContributingDelta}   icon={SchoolIcon}      accent="emerald" />
          <Kpi label="LEARNERS REACHED"     value={fmt(DATA.kpis.learnersReached)}       delta={DATA.kpis.learnersReachedDelta}       icon={UsersRound}      accent="orange" />
          <Kpi label="ANTHOLOGIES CREATED"  value={fmt(DATA.kpis.anthologiesCreated)}    delta={DATA.kpis.anthologiesCreatedDelta}    icon={Layers}          accent="teal" />
        </div>

        {/* ─── Analytics row — 4 cards ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* Story Collection Trend */}
          <Card>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#102033]">Story Collection Trend</h3>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                <TrendingUp className="h-3 w-3" strokeWidth={2.25} /> {DATA.trend.delta}%
                <span className="font-medium text-emerald-600/80 ml-0.5">vs last 6 months</span>
              </span>
            </div>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#667085]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Stories Submitted
            </p>
            <SubmissionTrendChart months={DATA.trend.months} values={DATA.trend.submissions} />
          </Card>

          {/* Story Status Breakdown */}
          <Card>
            <h3 className="text-[15px] font-bold text-[#102033]">Story Status Breakdown</h3>
            <div className="mt-2 flex items-center gap-4">
              <StatusDonut total={DATA.status.total} segments={DATA.status.segments} />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {DATA.status.segments.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5 text-[#374151] min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="text-[#374151] whitespace-nowrap">
                      <strong className="text-[#102033]">{s.value.toLocaleString()}</strong>{" "}
                      <span className="text-[#94a3b8]">({s.pct}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <FooterLink href="/portal/stories?view=status" label="View full breakdown" />
          </Card>

          {/* Language & Genre Mix */}
          <Card>
            <h3 className="text-[15px] font-bold text-[#102033]">Language &amp; Genre Mix</h3>
            <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2">
              <p className="text-[11px] font-bold text-[#667085]">By Language</p>
              <p className="text-[11px] font-bold text-[#667085]">By Genre</p>
              <BarColumn items={DATA.language} />
              <BarColumn items={DATA.genre} />
            </div>
            <FooterLink href="/portal/stories?view=mix" label="View full breakdown" />
          </Card>

          {/* Reading Reach & Engagement */}
          <Card>
            <h3 className="text-[15px] font-bold text-[#102033]">Reading Reach &amp; Engagement</h3>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-[#667085]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Story Reads
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Avg. Completion Rate
              </span>
            </div>
            <EngagementChart
              months={DATA.engagement.months}
              reads={DATA.engagement.reads}
              completion={DATA.engagement.completion}
              endReadsLabel={DATA.engagement.readsLabel}
              endCompletionLabel={DATA.engagement.completionLabel}
            />
            <FooterLink href="/portal/stories?view=engagement" label="View engagement report" />
          </Card>
        </div>

        {/* ─── Top Performing Schools  +  Funnel + Curation Queue ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const tpl = "minmax(0,1.4fr) 90px 110px 90px 80px 90px";
            return (
              <DashboardListCard
                title="Top Performing Schools"
                padded={false}
                viewAll={{ href: "/portal/schools", label: "View all schools" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>School</span><span>District</span><span>Submitted</span>
                    <span>Published</span><span>Reads</span><span>Status</span>
                  </DashboardListHeader>
                  {DATA.topSchools.map((row) => (
                    <DashboardListRow key={row.school} template={tpl}>
                      <span className="text-[#102033] font-bold truncate">{row.school}</span>
                      <span className="text-[#374151]">{row.district}</span>
                      <span className="text-[#374151]">{row.submitted.toLocaleString()}</span>
                      <span className="text-[#374151]">{row.published.toLocaleString()}</span>
                      <span className="text-[#374151]">{row.reads.toLocaleString()}</span>
                      <span><StatusPill tone={pillToneFor(row.status)}>{row.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          {/* Right column: stacked Funnel + Curation Queue */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Publishing Funnel */}
            <Card>
              <h3 className="text-[15px] font-bold text-[#102033]">Publishing Funnel</h3>
              <div className="mt-3 grid grid-cols-5 gap-1.5 items-end">
                {DATA.funnel.map((stage) => (
                  <div key={stage.label} className="min-w-0">
                    <p className="text-[10.5px] text-[#667085] truncate">{stage.label}</p>
                    <p className="text-[15px] font-extrabold text-[#102033] leading-tight mt-0.5">
                      {stage.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {DATA.funnel.map((stage) => (
                  <div key={stage.label} className="min-w-0">
                    <div className="h-1.5 rounded-full bg-[#eef0f4] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(stage.pct, 6)}%`, backgroundColor: "#10b981" }}
                      />
                    </div>
                    <p className="text-[10.5px] text-[#667085] mt-1">{stage.pct}%</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <FooterLink href="/portal/stories?view=funnel" label="View funnel analytics" inline />
              </div>
            </Card>

            {(() => {
              const tpl = "minmax(0,1.4fr) minmax(0,1fr) 80px minmax(0,1.2fr) 80px";
              return (
                <DashboardListCard
                  title="Curation Queue"
                  padded={false}
                  viewAll={{ href: "/portal/stories?view=queue", label: "View full queue" }}
                >
                  <div className="px-3 pb-2 overflow-x-auto">
                    <DashboardListHeader template={tpl}>
                      <span>Story Title</span><span>School</span><span>Language</span>
                      <span>Reviewer Status</span><span>Urgency</span>
                    </DashboardListHeader>
                    {DATA.curation.map((row) => {
                      const Icon = row.icon;
                      const dotColor = row.statusTone === "blue" ? "#2563eb"
                        : row.statusTone === "orange" ? "#f97316" : "#94a3b8";
                      return (
                        <DashboardListRow key={row.title} template={tpl}>
                          <span className="inline-flex items-center gap-1.5 font-bold text-[#102033] truncate">
                            <Icon className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={1.75} />
                            {row.title}
                          </span>
                          <span className="text-[#374151] truncate">{row.school}</span>
                          <span className="text-[#374151]">{row.language}</span>
                          <span className="inline-flex items-center gap-1.5 text-[#374151] truncate">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                            {row.status}
                          </span>
                          <span><StatusPill tone={pillToneFor(row.urgency === "High" ? "Overdue" : row.urgency === "Medium" ? "Pending" : "Completed")}>{row.urgency}</StatusPill></span>
                        </DashboardListRow>
                      );
                    })}
                  </div>
                </DashboardListCard>
              );
            })()}
          </div>
        </div>

        {/* ─── Bottom row — 4 compact cards ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {(() => {
            const tpl = "100px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) 90px";
            return (
              <DashboardListCard
                title="Recent Story Submissions"
                padded={false}
                viewAll={{ href: "/portal/story/manage", label: "View all" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Date</span><span>Story Title</span><span>School</span>
                    <span>Storyteller</span><span>Status</span>
                  </DashboardListHeader>
                  {DATA.recent.map((r) => (
                    <DashboardListRow key={`${r.date}-${r.title}`} template={tpl}>
                      <span className="text-[#667085]">{r.date}</span>
                      <span className="text-[#102033] font-bold truncate">{r.title}</span>
                      <span className="text-[#374151] truncate">{r.school}</span>
                      <span className="text-[#374151] truncate">{r.storyteller}</span>
                      <span><StatusPill tone={pillToneFor(r.status === "Submitted" ? "Completed" : r.status === "Draft" ? "Draft" : "In Review")}>{r.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          {(() => {
            const tpl = "minmax(0,1.4fr) minmax(0,1fr) 70px 60px";
            return (
              <DashboardListCard
                title="Featured Stories"
                padded={false}
                viewAll={{ href: "/portal/stories?view=featured", label: "View all" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Story</span><span>Genre</span><span>Reads</span><span>Likes</span>
                  </DashboardListHeader>
                  {DATA.featured.map((s) => (
                    <DashboardListRow key={s.title} template={tpl}>
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="h-5 w-7 rounded shrink-0" style={{ backgroundColor: s.swatch }} />
                        <span className="text-[#102033] font-bold truncate">{s.title}</span>
                      </span>
                      <span className="text-[#374151] truncate">{s.genre}</span>
                      <span className="text-[#374151]">{s.reads}</span>
                      <span className="inline-flex items-center gap-1 text-[#374151]">
                        <Heart className="h-3 w-3 text-rose-500" strokeWidth={1.75} />
                        {s.likes}
                      </span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          {(() => {
            const tpl = "minmax(0,1.4fr) minmax(0,1fr) 130px";
            return (
              <DashboardListCard
                title="Story Sessions & Read-Alouds"
                padded={false}
                viewAll={{ href: "/portal/events", label: "View all" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Activity</span><span>School</span><span>Date &amp; Time</span>
                  </DashboardListHeader>
                  {DATA.sessions.map((row) => (
                    <DashboardListRow key={row.activity} template={tpl}>
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <ActivityIcon icon={row.icon} tone={row.tone} />
                        <span className="text-[#102033] font-bold truncate">{row.activity}</span>
                      </span>
                      <span className="text-[#374151] truncate">{row.school}</span>
                      <span className="text-[#374151]">{row.when}</span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          {/* Content Quality Signals */}
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#102033]">Content Quality Signals</h3>
              <FooterLink href="/portal/stories?view=quality" label="View report" inline />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <QualityTile icon={Star}        bg="#fef3c7" fg="#b45309" label="AVERAGE STORY RATING"   value={DATA.quality.rating.value}        delta={DATA.quality.rating.delta}        direction={DATA.quality.rating.direction} />
              <QualityTile icon={Flag}        bg="#fee2e2" fg="#b91c1c" label="FLAGGED CONTENT"        value={DATA.quality.flagged.value}       delta={DATA.quality.flagged.delta}       direction={DATA.quality.flagged.direction} />
              <QualityTile icon={BookMarked}  bg="#ccfbf1" fg="#0f766e" label="READABILITY SCORE (AVG.)" value={DATA.quality.readability.value} delta={DATA.quality.readability.delta}   direction={DATA.quality.readability.direction} />
              <QualityTile icon={ImageIcon}   bg="#cffafe" fg="#0e7490" label="ILLUSTRATION COVERAGE"  value={DATA.quality.illustration.value}  delta={DATA.quality.illustration.delta}  direction={DATA.quality.illustration.direction} />
            </div>
          </Card>
        </div>

        {/* ─── Insight bar ───────────────────────────────────────── */}
        <section className="rounded-2xl bg-white border border-[#e5eaf0] shadow-sm px-5 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-600 shrink-0">
              <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold text-[#102033] leading-tight">1001 Story Insight</p>
              <p className="text-[12px] text-[#374151] leading-snug mt-0.5">{DATA.insight.text}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-[#667085] self-start md:self-center shrink-0">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="whitespace-nowrap">Last updated: {DATA.insight.updated}</span>
            <button type="button" aria-label="Insight info" className="grid h-6 w-6 place-items-center rounded-full text-[#94a3b8] hover:bg-gray-50">
              <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </section>
      </div>
    </OzekiPortalShell>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Subcomponents
   ──────────────────────────────────────────────────────────────────── */

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function Card({
  children, padded = true, className = "",
}: {
  children: React.ReactNode; padded?: boolean; className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white border border-[#e5eaf0] ${padded ? "p-5" : ""} ${className}`}
      style={{ boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)" }}
    >
      {children}
    </section>
  );
}

function FooterLink({ href, label, inline = false }: { href: string; label: string; inline?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-[12px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center ${inline ? "" : "mt-3"}`}
    >
      {label} <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2.25} />
    </Link>
  );
}

/* ── KPI ──────────────────────────────────────────────────────────── */

type Accent = "emerald" | "blue" | "orange" | "violet" | "teal";
const accentMap: Record<Accent, { bg: string; fg: string }> = {
  emerald: { bg: "#e8f7f1", fg: "#047857" },
  blue:    { bg: "#eaf3ff", fg: "#1d4ed8" },
  orange:  { bg: "#fff2e8", fg: "#c2410c" },
  violet:  { bg: "#f4eeff", fg: "#7c3aed" },
  teal:    { bg: "#cffaf2", fg: "#0f766e" },
};

function Kpi({
  label, value, delta, icon: Icon, accent,
}: {
  label: string; value: string; delta: number; icon: LucideIcon; accent: Accent;
}) {
  const a = accentMap[accent];
  const isUp = delta >= 0;
  return (
    <div
      className="rounded-2xl border border-[#e5eaf0] bg-white p-3.5 flex flex-col gap-1.5 min-h-[104px]"
      style={{ boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: a.bg }}>
          <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: a.fg }} />
        </span>
        <p className="text-[10px] font-bold text-[#7a8ca3] uppercase tracking-[0.06em] leading-tight truncate">
          {label}
        </p>
      </div>
      <p className="text-[26px] lg:text-[28px] font-extrabold text-[#102033] leading-none tracking-tight truncate">
        {value}
      </p>
      <p
        className={`text-[11px] font-bold mt-auto inline-flex items-center gap-1 ${
          isUp ? "text-emerald-600" : "text-rose-500"
        }`}
      >
        {isUp ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} /> : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
        {isUp ? "" : "-"}{Math.abs(delta)}%
        <span className="text-[#94a3b8] font-medium ml-0.5">vs last 30 days</span>
      </p>
    </div>
  );
}

/* ── Submission Trend Chart ────────────────────────────────────────── */

function SubmissionTrendChart({ months, values }: { months: string[]; values: number[] }) {
  const w = 360, h = 140, pl = 28, pr = 8, pt = 16, pb = 22;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const yMax = 4000;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 1000, 2000, 3000, 4000];
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Story collection trend">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={sy(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v === 0 ? "0" : `${v / 1000}K`}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
          <text x={sx(i)} y={sy(v) - 8} fontSize="9.5" fontWeight="700" fill="#102033" textAnchor="middle">
            {v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ── Status Donut ──────────────────────────────────────────────────── */

function StatusDonut({
  total, segments,
}: {
  total: number; segments: { label: string; pct: number; color: string }[];
}) {
  const size = 140, stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {segments.map((s) => {
        const dash = (s.pct / 100) * c;
        const offset = c * (1 - acc / 100);
        acc += s.pct;
        return (
          <circle
            key={s.label}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="17" fontWeight="800" fill="#102033">
        {total.toLocaleString()}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9.5" fill="#7a8ca3">Total Stories</text>
    </svg>
  );
}

/* ── Bar Column (language / genre) ─────────────────────────────────── */

function BarColumn({ items }: { items: { label: string; pct: number; color: string }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="text-[11.5px]">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[#374151] truncate">{it.label}</span>
            <span className="text-[#102033] font-bold whitespace-nowrap">{it.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#eef0f4] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${it.pct}%`, backgroundColor: it.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Engagement (dual-axis line) ───────────────────────────────────── */

function EngagementChart({
  months, reads, completion, endReadsLabel, endCompletionLabel,
}: {
  months: string[]; reads: number[]; completion: number[];
  endReadsLabel: string; endCompletionLabel: string;
}) {
  const w = 360, h = 140, pl = 30, pr = 30, pt = 16, pb = 22;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const readsMax = 40000;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const syReads = (v: number) => pt + innerH - (v / readsMax) * innerH;
  const syPct = (v: number) => pt + innerH - (v / 100) * innerH;
  const ticks = [0, 10000, 20000, 30000, 40000];
  const pctTicks = [0, 25, 50, 75, 100];
  const readsPath = reads.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${syReads(v).toFixed(1)}`).join(" ");
  const pctPath = completion.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${syPct(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Reading reach and engagement">
      {ticks.map((v) => (
        <g key={`l-${v}`}>
          <line x1={pl} x2={pl + innerW} y1={syReads(v)} y2={syReads(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={syReads(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v === 0 ? "0" : `${v / 1000}K`}</text>
        </g>
      ))}
      {pctTicks.map((v) => (
        <text key={`r-${v}`} x={pl + innerW + 4} y={syPct(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="start">{v}%</text>
      ))}
      <path d={readsPath} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      <path d={pctPath}   fill="none" stroke="#f97316" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="0" />
      {reads.map((v, i) => (
        <circle key={`rc-${i}`} cx={sx(i)} cy={syReads(v)} r={2.5} fill="#10b981" stroke="#fff" strokeWidth={1.25} />
      ))}
      {completion.map((v, i) => (
        <circle key={`cc-${i}`} cx={sx(i)} cy={syPct(v)} r={2.5} fill="#f97316" stroke="#fff" strokeWidth={1.25} />
      ))}
      {/* End-of-line value pills */}
      {(() => {
        const endIdx = reads.length - 1;
        const ex = sx(endIdx);
        const ery = syReads(reads[endIdx]);
        const epy = syPct(completion[endIdx]);
        return (
          <>
            <g transform={`translate(${ex - 30}, ${ery - 18})`}>
              <rect width="28" height="14" rx="4" fill="#10b981" />
              <text x="14" y="10" fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">{endReadsLabel}</text>
            </g>
            <g transform={`translate(${ex - 30}, ${epy + 4})`}>
              <rect width="28" height="14" rx="4" fill="#f97316" />
              <text x="14" y="10" fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">{endCompletionLabel}</text>
            </g>
          </>
        );
      })()}
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ── Activity icon (Story Sessions) ────────────────────────────────── */

function ActivityIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    amber:   { bg: "#fef3c7", fg: "#b45309" },
    emerald: { bg: "#d1fae5", fg: "#047857" },
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
    violet:  { bg: "#ede9fe", fg: "#7c3aed" },
    pink:    { bg: "#fce7f3", fg: "#be185d" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md shrink-0" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: t.fg }} />
    </span>
  );
}

/* ── Quality tile ──────────────────────────────────────────────────── */

function QualityTile({
  icon: Icon, bg, fg, label, value, delta, direction,
}: {
  icon: LucideIcon; bg: string; fg: string;
  label: string; value: string; delta: string; direction: "up" | "down";
}) {
  const isUp = direction === "up";
  return (
    <div className="rounded-xl border border-[#eef0f4] p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: fg }} />
        </span>
        <p className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3] leading-tight">
          {label}
        </p>
      </div>
      <p className="text-[20px] font-extrabold text-[#102033] leading-none">{value}</p>
      <p className={`text-[10.5px] font-bold inline-flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
        {isUp ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} /> : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
        <span className="text-[#94a3b8] font-medium">{delta}</span>
      </p>
    </div>
  );
}

import Link from "next/link";
import {
  CalendarDays, CalendarPlus, Users, UserPlus, BarChart3, Award, Star,
  Download, Plus, ChevronRight, MoreVertical, Sparkles, RefreshCw,
  UploadCloud, Presentation, FileSpreadsheet, FileArchive, FileCheck,
  ClipboardList, Calendar, FileText, type LucideIcon,
} from "lucide-react";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import {
  DashboardListCard, DashboardListHeader, DashboardListRow,
  StatusPill, StarRating, pillToneFor,
} from "@/components/portal/DashboardList";
import { requirePortalStaffUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { devFallback } from "@/lib/dev-fallback";
import {
  getTrainingsKpis, getTrainingDeliveryTrend, getTrainingTypeMix,
  getTrainingRegionalCoverage, listTopTrainers, listTrainingPipeline,
  listRecentTrainingSessions, listSchoolsReached, getParticipantInsights,
} from "@/lib/server/postgres/repositories/trainings-dashboard";

async function safeFetch<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); }
  catch (err) {
    logger.warn(`[trainings] ${label} failed; falling back to mock`, { error: String(err) });
    return null;
  }
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
  catch { return iso; }
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training Overview | Ozeki Portal",
  description:
    "Track training delivery, attendance, facilitation quality, certification, and regional coverage across the network.",
};

/* ────────────────────────────────────────────────────────────────────
   Reference data — gated to dev only via devFallback().
   Production zeros these out so live (possibly-empty) DB drives the page.
   ──────────────────────────────────────────────────────────────────── */
const FALLBACK = devFallback({
  kpis: [
    { label: "Training Sessions",        value: "248",   delta: "↑ 18% vs last month",  icon: CalendarDays, accent: "emerald" as const },
    { label: "Upcoming Sessions",        value: "32",    delta: "↑ 7% vs last month",   icon: CalendarPlus, accent: "blue"    as const },
    { label: "Teachers Trained",         value: "6,420", delta: "↑ 12% vs last month",  icon: Users,        accent: "violet"  as const },
    { label: "Participants This Month",  value: "1,186", delta: "↑ 14% vs last month",  icon: UserPlus,     accent: "orange"  as const },
    { label: "Average Attendance Rate",  value: "89%",   delta: "↑ 3pp vs last month",  icon: BarChart3,    accent: "teal"    as const },
    { label: "Certificates Issued",      value: "4,980", delta: "↑ 16% vs last month",  icon: Award,        accent: "violet"  as const },
    { label: "Satisfaction Score",       value: "4.7/5", delta: "↑ 0.2 vs last month",  icon: Star,         accent: "orange"  as const },
  ],
  trend: {
    months: ["Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25"],
    values: [22, 38, 48, 62, 70, 89],
  },
  typeMix: {
    total: 248,
    rows: [
      { label: "Cluster-Based",      value: 104, pct: 42, color: "#10b981" },
      { label: "In-School Coaching", value: 60,  pct: 24, color: "#2563eb" },
      { label: "Virtual Training",   value: 40,  pct: 16, color: "#60a5fa" },
      { label: "Workshop",           value: 27,  pct: 11, color: "#a78bfa" },
      { label: "Refresher",          value: 17,  pct: 7,  color: "#7c3aed" },
    ],
  },
  attendance: {
    months: ["Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25"],
    attendance: [82, 84, 87, 86, 88, 89],
    completion: [70, 74, 78, 79, 81, 83],
  },
  regions: [
    { name: "Central",   value: 68, pct: 27 },
    { name: "Acholi",    value: 52, pct: 21 },
    { name: "West Nile", value: 41, pct: 17 },
    { name: "Lango",     value: 34, pct: 14 },
    { name: "Karamoja",  value: 28, pct: 11 },
    { name: "Teso",      value: 25, pct: 10 },
  ],
  funnel: [
    { label: "Planned",   value: 412, pct: 100 },
    { label: "Confirmed", value: 286, pct: 69 },
    { label: "Delivered", value: 248, pct: 87 },
    { label: "Evaluated", value: 205, pct: 83 },
    { label: "Certified", value: 167, pct: 82 },
  ],
  trainers: [
    { rank: 1, name: "Sarah N.",    sessions: 28, rating: 4.9, reach: 812 },
    { rank: 2, name: "Paul K.",     sessions: 24, rating: 4.8, reach: 678 },
    { rank: 3, name: "Grace A.",    sessions: 20, rating: 4.8, reach: 552 },
    { rank: 4, name: "James O.",    sessions: 18, rating: 4.7, reach: 498 },
    { rank: 5, name: "Patricia L.", sessions: 16, rating: 4.7, reach: 421 },
  ],
  pipeline: [
    { date: "May 28, 2025", location: "Gulu (Acholi)",     type: "Cluster-Based",      participants: 28, status: "Confirmed" },
    { date: "May 30, 2025", location: "Lira (Lango)",      type: "In-School Coaching", participants: 22, status: "Confirmed" },
    { date: "Jun 03, 2025", location: "Arua (West Nile)",  type: "Workshop",           participants: 30, status: "Planned"   },
    { date: "Jun 05, 2025", location: "Mbale (Teso)",      type: "Virtual Training",   participants: 25, status: "Planned"   },
    { date: "Jun 10, 2025", location: "Moroto (Karamoja)", type: "Cluster-Based",      participants: 26, status: "Planned"   },
  ],
  recent: [
    { date: "May 21, 2025", session: "Phonics Instruction Mastery", org: "Edify Uganda", presenter: "ORBF Support", region: "Central",   type: "Cluster-Based",      participants: 32, status: "Completed" },
    { date: "May 20, 2025", session: "Classroom Observation Skills", org: "Edify Uganda", presenter: "Sarah N.",     region: "Acholi",    type: "In-School Coaching", participants: 24, status: "Completed" },
    { date: "May 19, 2025", session: "Early Grade Reading Workshop", org: "GPE Uganda",   presenter: "Paul K.",      region: "West Nile", type: "Workshop",           participants: 28, status: "Completed" },
    { date: "May 16, 2025", session: "Reading Fluency Strategies",   org: "ORBF Network", presenter: "Grace A.",     region: "Lango",     type: "Cluster-Based",      participants: 31, status: "Completed" },
    { date: "May 14, 2025", session: "Coaching for Impact",          org: "Edify Uganda", presenter: "James O.",     region: "Teso",      type: "In-School Coaching", participants: 20, status: "Completed" },
  ],
  participantInsights: {
    gender: { male: 62, female: 38 },
    roles: [
      { label: "Teachers",     pct: 78, value: 922 },
      { label: "Headteachers", pct: 14, value: 166 },
      { label: "Coaches",      pct: 8,  value: 98  },
    ],
    attendanceTrend: [86, 88, 89, 87, 89, 89],
    avg: "89%",
  },
  quality: {
    avgScore: "4.7 / 5.0",
    rows: [
      { label: "Completion Rate",    value: "83%", tone: "emerald" as const },
      { label: "Flagged Sessions",   value: "6",   tone: "rose"    as const },
      { label: "On-time Reporting",  value: "91%", tone: "emerald" as const },
      { label: "Evidence Uploads",   value: "87%", tone: "emerald" as const },
    ],
  },
  schoolsReached: [
    { rank: 1, name: "St. Mary's Primary School",  count: 86 },
    { rank: 2, name: "Gulu Primary School",        count: 72 },
    { rank: 3, name: "Arua Model Primary School",  count: 69 },
    { rank: 4, name: "Lira Central Primary School", count: 61 },
    { rank: 5, name: "Mbale Demonstration School",  count: 58 },
  ],
  resources: [
    { name: "Phonics Mastery Guide.pdf",    when: "May 21, 2025", icon: FileText,        tone: "rose"    },
    { name: "Observation Checklist.xlsx",   when: "May 20, 2025", icon: FileSpreadsheet, tone: "emerald" },
    { name: "Attendance Sheet - Gulu.pdf",  when: "May 21, 2025", icon: FileText,        tone: "rose"    },
    { name: "Training Photos - Lira.zip",   when: "May 20, 2025", icon: FileArchive,     tone: "violet"  },
    { name: "Certificates Batch - May.pdf", when: "May 19, 2025", icon: FileCheck,       tone: "blue"    },
  ],
  actions: [
    { icon: CalendarPlus, label: "New Session",           href: "/portal/trainings/manage?new=1",           tone: "emerald" },
    { icon: UserPlus,     label: "Add Participant",       href: "/portal/trainings/participants/new",       tone: "blue"    },
    { icon: UploadCloud,  label: "Upload Evidence",       href: "/portal/resources?context=training",       tone: "violet"  },
    { icon: Calendar,     label: "Schedule Session",      href: "/portal/trainings/manage?action=schedule", tone: "orange"  },
    { icon: Award,        label: "Generate Certificates", href: "/portal/trainings?view=certificates",      tone: "rose"    },
    { icon: Presentation, label: "View Reports",          href: "/portal/training-reports",                 tone: "teal"    },
  ],
  insight: {
    text: "Training completion remains strong at 89%, with the highest facilitator performance in Central and Acholi regions.",
    updated: "May 22, 2025, 9:15 AM",
  },
});

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function PortalTrainingsOverviewPage() {
  const user = await requirePortalStaffUser();

  const [
    liveKpis, liveTrend, liveTypeMix, liveRegions,
    liveTrainers, livePipeline, liveRecent, liveSchools, liveParticipants,
  ] = await Promise.all([
    safeFetch("kpis",         () => getTrainingsKpis()),
    safeFetch("trend",        () => getTrainingDeliveryTrend(6)),
    safeFetch("typeMix",      () => getTrainingTypeMix()),
    safeFetch("regions",      () => getTrainingRegionalCoverage()),
    safeFetch("trainers",     () => listTopTrainers(5)),
    safeFetch("pipeline",     () => listTrainingPipeline(5)),
    safeFetch("recent",       () => listRecentTrainingSessions(5)),
    safeFetch("schools",      () => listSchoolsReached(5)),
    safeFetch("participants", () => getParticipantInsights()),
  ]);

  const DATA = {
    ...FALLBACK,
    kpis: liveKpis ? FALLBACK.kpis.map((k) => {
      const lookup: Record<string, string> = {
        "Training Sessions":       String(liveKpis.trainingSessions),
        "Upcoming Sessions":       String(liveKpis.upcomingSessions),
        "Teachers Trained":        liveKpis.teachersTrained.toLocaleString(),
        "Participants This Month": liveKpis.participantsThisMonth.toLocaleString(),
        "Average Attendance Rate": `${liveKpis.avgAttendanceRate}%`,
        "Certificates Issued":     liveKpis.certificatesIssued.toLocaleString(),
        "Satisfaction Score":      `${liveKpis.satisfactionScore || 4.7}/5`,
      };
      return { ...k, value: lookup[k.label] ?? k.value };
    }) : FALLBACK.kpis,
    trend: liveTrend && liveTrend.length > 0
      ? { months: liveTrend.map((p) => p.month), values: liveTrend.map((p) => p.sessions) }
      : FALLBACK.trend,
    typeMix: liveTypeMix && liveTypeMix.length > 0
      ? {
          total: liveTypeMix.reduce((n, r) => n + r.value, 0),
          rows: liveTypeMix.map((r, i) => ({
            ...r,
            color: FALLBACK.typeMix.rows[i]?.color ?? "#10b981",
          })),
        }
      : FALLBACK.typeMix,
    regions: liveRegions && liveRegions.length > 0 ? liveRegions : FALLBACK.regions,
    trainers: liveTrainers && liveTrainers.length > 0 ? liveTrainers : FALLBACK.trainers,
    pipeline: livePipeline && livePipeline.length > 0
      ? livePipeline.map((p) => ({ ...p, date: fmtDate(p.date) }))
      : FALLBACK.pipeline,
    recent: liveRecent && liveRecent.length > 0
      ? liveRecent.map((r) => ({ ...r, date: fmtDate(r.date) }))
      : FALLBACK.recent,
    schoolsReached: liveSchools && liveSchools.length > 0 ? liveSchools : FALLBACK.schoolsReached,
    participantInsights: liveParticipants
      ? {
          ...FALLBACK.participantInsights,
          gender: liveParticipants.gender,
          roles: liveParticipants.roles.length > 0 ? liveParticipants.roles : FALLBACK.participantInsights.roles,
        }
      : FALLBACK.participantInsights,
  };

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/trainings"
      greeting={`Welcome Back, ${user.fullName ?? "ORBF Support"} 👋`}
      subtitle="Here's what's happening across your literacy network today."
      hideFrame
    >
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#e7ecf3" }}
        className="px-4 sm:px-6 lg:px-7 py-5 space-y-4 max-w-[1700px] mx-auto"
      >
        {/* ─── Title row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[27px] font-extrabold tracking-tight text-[#111827] leading-tight">
              Training Overview
            </h1>
            <p className="text-[13px] text-[#667085] leading-snug mt-1.5">
              Track training delivery, attendance, facilitation quality, certification, and regional coverage across the network.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/training-reports?action=export"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-emerald-200 text-[13px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export Reports
            </Link>
            <Link
              href="/portal/trainings/manage?new=1"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New Training Session
            </Link>
            <Link
              href="/portal/trainings/participants/new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-emerald-200 text-[13px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              Add Participant
            </Link>
          </div>
        </div>

        {/* ─── KPI strip — 7 cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          {DATA.kpis.map((k) => (
            <Kpi key={k.label} {...k} />
          ))}
        </div>

        {/* ─── Analytics row — 4 cards ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          <Card>
            <CardTopRow title="Training Delivery Trend" subtitle="Sessions delivered over the last 6 months" />
            <DeliveryTrendChart months={DATA.trend.months} values={DATA.trend.values} />
          </Card>

          <Card>
            <CardTopRow title="Training Type Mix" subtitle="Distribution by training type" />
            <div className="mt-2 flex items-center gap-3">
              <TypeMixDonut total={DATA.typeMix.total} segments={DATA.typeMix.rows} />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {DATA.typeMix.rows.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5 text-[#374151] min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="text-[#374151] whitespace-nowrap">
                      <strong className="text-[#111827]">{s.pct}%</strong>{" "}
                      <span className="text-[#94a3b8]">({s.value})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardTopRow title="Attendance & Completion" subtitle="Last 6 months trend" />
            <div className="mt-1 flex items-center gap-3 text-[11px] text-[#667085]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Attendance Rate</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Completion Rate</span>
            </div>
            <AttendanceCompletionChart
              months={DATA.attendance.months}
              attendance={DATA.attendance.attendance}
              completion={DATA.attendance.completion}
            />
          </Card>

          <Card>
            <CardTopRow title="Regional Training Coverage" subtitle="Sessions delivered by region" />
            <div className="mt-2 grid grid-cols-[120px_1fr] gap-3 items-start">
              <UgandaRegionMap />
              <ul className="space-y-1.5">
                {DATA.regions.map((r) => (
                  <li key={r.name} className="grid grid-cols-[64px_1fr_60px] items-center gap-2 text-[11px]">
                    <span className="text-[#374151] truncate">{r.name}</span>
                    <div className="h-1.5 rounded-full bg-[#eef0f4] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(r.pct * 3.5, 100)}%`, backgroundColor: "#10b981" }} />
                    </div>
                    <span className="text-[#374151] whitespace-nowrap text-right">
                      <strong className="text-[#111827]">{r.value}</strong>{" "}
                      <span className="text-[#94a3b8]">({r.pct}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* ─── Funnel + Trainers + Pipeline ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-4">
            <CardTopRow title="Training Funnel" subtitle="Progress across training pipeline" />
            <TrainingFunnel rows={DATA.funnel} />
          </Card>

          {(() => {
            const tpl = "24px minmax(0,1.4fr) 90px 80px 110px";
            return (
              <DashboardListCard
                title="Top Performing Trainers"
                subtitle="Ranked by average evaluation score"
                padded={false}
                className="lg:col-span-4"
              >
                <div className="px-3 pb-2">
                  <DashboardListHeader template={tpl}>
                    <span>#</span><span>Trainer</span><span>Sessions</span>
                    <span>Rating</span><span>Reached</span>
                  </DashboardListHeader>
                  {DATA.trainers.map((t) => (
                    <DashboardListRow key={t.name} template={tpl}>
                      <span className="text-[#7a8ca3]">{t.rank}</span>
                      <span className="text-[#111827] font-bold truncate">{t.name}</span>
                      <span className="text-[#374151]">{t.sessions}</span>
                      <StarRating value={t.rating} />
                      <span className="text-[#374151]">{t.reach}</span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          {(() => {
            const tpl = "100px minmax(0,1fr) minmax(0,1fr) 100px 90px";
            return (
              <DashboardListCard
                title="Training Pipeline"
                subtitle="Upcoming sessions"
                padded={false}
                className="lg:col-span-4"
              >
                <div className="px-3 pb-2">
                  <DashboardListHeader template={tpl}>
                    <span>Date</span><span>Location</span><span>Type</span>
                    <span>Participants</span><span>Status</span>
                  </DashboardListHeader>
                  {DATA.pipeline.map((p) => (
                    <DashboardListRow key={`${p.date}-${p.location}`} template={tpl}>
                      <span className="text-[#374151]">{p.date}</span>
                      <span className="text-[#374151] truncate">{p.location}</span>
                      <span className="text-[#374151] truncate">{p.type}</span>
                      <span className="text-[#111827] font-bold">{p.participants}</span>
                      <span><StatusPill tone={pillToneFor(p.status)}>{p.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}
        </div>

        {/* ─── Recent Sessions / Participant Insights / Quality ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {(() => {
            const tpl = "100px minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 80px 130px 100px 90px";
            return (
              <DashboardListCard
                title="Recent Training Sessions"
                padded={false}
                className="lg:col-span-6"
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Date</span><span>Session Name</span><span>Organization</span>
                    <span>Presenter</span><span>Region</span><span>Type</span>
                    <span>Participants</span><span>Status</span>
                  </DashboardListHeader>
                  {DATA.recent.map((r) => (
                    <DashboardListRow key={`${r.date}-${r.session}`} template={tpl}>
                      <span className="text-[#374151]">{r.date}</span>
                      <span className="text-[#111827] font-bold truncate">{r.session}</span>
                      <span className="text-[#374151] truncate">{r.org}</span>
                      <span className="text-[#374151] truncate">{r.presenter}</span>
                      <span className="text-[#374151]">{r.region}</span>
                      <span className="text-[#374151] truncate">{r.type}</span>
                      <span className="text-[#111827] font-bold">{r.participants}</span>
                      <span><StatusPill tone={pillToneFor(r.status)}>{r.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14.5px] font-bold text-[#111827]">Participant Insights</h3>
              <KebabButton />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3]">Gender Breakdown</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-700">
                    <Users className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <p className="text-[16px] font-extrabold text-[#111827] leading-none">{DATA.participantInsights.gender.male}%<span className="block text-[10.5px] text-[#7a8ca3] font-medium mt-0.5">Male</span></p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-pink-50 text-pink-600">
                    <Users className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <p className="text-[16px] font-extrabold text-[#111827] leading-none">{DATA.participantInsights.gender.female}%<span className="block text-[10.5px] text-[#7a8ca3] font-medium mt-0.5">Female</span></p>
                </div>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3]">Attendance Trend</p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5">Last 6 months</p>
                <AttendanceSparkline values={DATA.participantInsights.attendanceTrend} />
                <p className="text-[14px] font-extrabold text-[#111827] mt-1">{DATA.participantInsights.avg}<span className="block text-[10.5px] text-[#7a8ca3] font-medium">Avg Attendance</span></p>
              </div>
            </div>
            <div className="mt-3 border-t border-[#e8edf3] pt-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3]">Role Breakdown</p>
              <ul className="mt-1.5 space-y-1 text-[11.5px]">
                {DATA.participantInsights.roles.map((r) => (
                  <li key={r.label} className="flex items-center justify-between">
                    <span className="text-[#374151]">{r.label}</span>
                    <span className="text-[#374151]">
                      <strong className="text-[#111827]">{r.pct}%</strong>{" "}
                      <span className="text-[#94a3b8]">({r.value})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14.5px] font-bold text-[#111827]">Training Quality Signals</h3>
              <KebabButton />
            </div>
            <div className="mt-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3]">Average Evaluation Score</p>
              <p className="text-[22px] font-extrabold text-[#111827] leading-none mt-1">{DATA.quality.avgScore}</p>
            </div>
            <ul className="mt-3 divide-y divide-[#f3f5f8]">
              {DATA.quality.rows.map((q) => (
                <li key={q.label} className="flex items-center justify-between py-2 text-[12px]">
                  <span className="text-[#374151]">{q.label}</span>
                  <span className={`font-extrabold ${q.tone === "rose" ? "text-rose-600" : "text-emerald-600"}`}>{q.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ─── Schools Reached / Resources / Action Center ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card padded={false} className="lg:col-span-4">
            <div className="px-5 py-3.5 border-b border-[#e8edf3] flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Schools Reached by Training</h3>
                <p className="text-[11px] text-[#7a8ca3] mt-0.5">Top schools by trained participants</p>
              </div>
              <KebabButton />
            </div>
            <ul>
              {DATA.schoolsReached.map((s) => (
                <li key={s.name} className="px-5 py-2 border-b border-[#f3f5f8] last:border-b-0 grid grid-cols-[24px_1fr_auto] items-center gap-3 text-[12px]">
                  <span className="text-[#7a8ca3]">{s.rank}</span>
                  <span className="font-bold text-[#111827] truncate">{s.name}</span>
                  <span className="text-[#111827] font-bold">{s.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padded={false} className="lg:col-span-4">
            <div className="px-5 py-3.5 border-b border-[#e8edf3] flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Session Resources &amp; Evidence</h3>
                <p className="text-[11px] text-[#7a8ca3] mt-0.5">Recent uploads</p>
              </div>
              <KebabButton />
            </div>
            <ul>
              {DATA.resources.map((r) => (
                <li key={r.name} className="px-5 py-2 border-b border-[#f3f5f8] last:border-b-0 flex items-center gap-3 text-[12px]">
                  <FileToneIcon icon={r.icon} tone={r.tone} />
                  <span className="font-semibold text-[#111827] truncate flex-1">{r.name}</span>
                  <span className="text-[#7a8ca3] whitespace-nowrap text-[11px]">{r.when}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="lg:col-span-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Action Center</h3>
                <p className="text-[11px] text-[#7a8ca3] mt-0.5">Quick actions for training operations</p>
              </div>
              <KebabButton />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {DATA.actions.map((a) => (
                <ActionTile key={a.label} {...a} />
              ))}
            </div>
          </Card>
        </div>

        {/* ─── Bottom Insight Bar ─────────────────────────────────── */}
        <section
          className="rounded-2xl border border-[#dcefe8] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ backgroundColor: "#f3faf6" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold text-[#0f5c4a] leading-tight">Training Insight</p>
              <p className="text-[12px] text-[#374151] leading-snug mt-0.5">{DATA.insight.text}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-[#7a8ca3] self-start md:self-center shrink-0">
            <span className="whitespace-nowrap">Last updated: {DATA.insight.updated}</span>
            <button type="button" aria-label="Refresh" className="grid h-7 w-7 place-items-center rounded-full text-[#94a3b8] hover:bg-white">
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
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

function Card({
  children, padded = true, className = "",
}: {
  children: React.ReactNode; padded?: boolean; className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white border border-[#e5eaf0] ${padded ? "p-4" : ""} ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      {children}
    </section>
  );
}

function CardTopRow({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[14.5px] font-bold text-[#111827]">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#7a8ca3] mt-0.5">{subtitle}</p>}
      </div>
      <KebabButton />
    </div>
  );
}

function KebabButton() {
  return (
    <button
      type="button"
      aria-label="Card actions"
      className="grid h-7 w-7 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50 shrink-0"
    >
      <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

/* ── KPI ──────────────────────────────────────────────────────────── */

type Accent = "emerald" | "blue" | "violet" | "orange" | "teal" | "rose";
const accentMap: Record<Accent, { bg: string; fg: string }> = {
  emerald: { bg: "#eaf7f1", fg: "#047857" },
  blue:    { bg: "#ecf4ff", fg: "#1d4ed8" },
  violet:  { bg: "#f4eeff", fg: "#7c3aed" },
  orange:  { bg: "#fff4e8", fg: "#c2410c" },
  teal:    { bg: "#ccfbf1", fg: "#0f766e" },
  rose:    { bg: "#fdecec", fg: "#b91c1c" },
};

function Kpi({
  label, value, delta, icon: Icon, accent,
}: {
  label: string; value: string; delta: string; icon: LucideIcon; accent: Accent;
}) {
  const a = accentMap[accent];
  const isUp = delta.startsWith("↑");
  return (
    <div
      className="rounded-2xl border border-[#e5eaf0] bg-white p-3.5 flex flex-col gap-1.5 min-h-[96px]"
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: a.bg }}>
          <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: a.fg }} />
        </span>
        <p className="text-[10px] font-bold text-[#7a8ca3] uppercase tracking-[0.06em] leading-tight">{label}</p>
      </div>
      <p className="text-[24px] font-extrabold text-[#111827] leading-none tracking-tight truncate">{value}</p>
      <p className={`text-[11px] font-bold mt-auto truncate ${isUp ? "text-emerald-600" : "text-rose-500"}`}>{delta}</p>
    </div>
  );
}

/* ── Delivery Trend chart (line + end annotation) ─────────────────── */

function DeliveryTrendChart({ months, values }: { months: string[]; values: number[] }) {
  const w = 360, h = 180, pl = 30, pr = 8, pt = 16, pb = 24;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const yMax = 100;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 20, 40, 60, 80, 100];
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const lastIdx = values.length - 1;
  const lastX = sx(lastIdx), lastY = sy(values[lastIdx]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Training delivery trend">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={sy(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
      ))}
      <g transform={`translate(${Math.max(lastX - 70, 6)}, ${Math.max(lastY - 38, 4)})`}>
        <rect width="70" height="30" rx="6" fill="#fff" stroke="#e5eaf0" />
        <text x="8" y="13" fontSize="9.5" fontWeight="700" fill="#111827">May &apos;25</text>
        <text x="8" y="24" fontSize="10" fontWeight="800" fill="#047857">{values[lastIdx]} Sessions</text>
      </g>
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ── Type Mix donut ────────────────────────────────────────────────── */

function TypeMixDonut({
  total, segments,
}: {
  total: number; segments: { label: string; pct: number; color: string }[];
}) {
  const size = 150, stroke = 24;
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
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="#111827">
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9.5" fill="#7a8ca3">Total</text>
    </svg>
  );
}

/* ── Attendance vs Completion grouped-bar chart ───────────────────── */

function AttendanceCompletionChart({
  months, attendance, completion,
}: {
  months: string[]; attendance: number[]; completion: number[];
}) {
  const w = 360, h = 165, pl = 32, pr = 8, pt = 14, pb = 22;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const yMax = 100;
  const groupW = innerW / months.length;
  const barW = (groupW - 6) / 2;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Attendance and completion">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={sy(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v}%</text>
        </g>
      ))}
      {months.map((m, i) => {
        const groupX = pl + i * groupW + 3;
        const aH = innerH * (attendance[i] / yMax);
        const cH = innerH * (completion[i] / yMax);
        return (
          <g key={m}>
            <rect x={groupX} y={sy(attendance[i])} width={barW} height={aH} fill="#10b981" rx={2} />
            <rect x={groupX + barW + 2} y={sy(completion[i])} width={barW} height={cH} fill="#f59e0b" rx={2} />
            <text x={groupX + barW + 1} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Uganda regional map (inline SVG) ─────────────────────────────── */

function UgandaRegionMap() {
  return (
    <svg viewBox="0 0 130 140" width={120} height={130} role="img" aria-label="Regional training coverage" className="shrink-0">
      <path d="M 14 18 L 38 12 L 46 30 L 30 42 L 18 36 Z" fill="#a7f3d0" stroke="#fff" strokeWidth={1} />
      <path d="M 46 30 L 38 12 L 70 14 L 78 26 L 64 36 L 46 38 Z" fill="#34d399" stroke="#fff" strokeWidth={1} />
      <path d="M 78 26 L 70 14 L 110 18 L 116 36 L 100 42 L 88 36 Z" fill="#bbf7d0" stroke="#fff" strokeWidth={1} />
      <path d="M 18 36 L 30 42 L 46 38 L 50 56 L 30 60 L 14 50 Z" fill="#86efac" stroke="#fff" strokeWidth={1} />
      <path d="M 64 36 L 78 26 L 88 36 L 100 42 L 96 60 L 78 62 L 60 56 L 50 56 L 46 38 Z" fill="#a7f3d0" stroke="#fff" strokeWidth={1} />
      <path d="M 14 50 L 30 60 L 50 56 L 50 78 L 30 84 L 16 76 Z" fill="#86efac" stroke="#fff" strokeWidth={1} />
      <path d="M 50 56 L 60 56 L 78 62 L 80 86 L 60 94 L 50 78 Z" fill="#10b981" stroke="#fff" strokeWidth={1} />
      <path d="M 78 62 L 96 60 L 102 78 L 96 94 L 80 86 Z" fill="#a7f3d0" stroke="#fff" strokeWidth={1} />
      <path d="M 16 76 L 30 84 L 50 78 L 48 100 L 30 104 L 18 92 Z" fill="#86efac" stroke="#fff" strokeWidth={1} />
      <path d="M 50 78 L 60 94 L 80 86 L 78 110 L 56 116 L 48 100 Z" fill="#10b981" stroke="#fff" strokeWidth={1} />
      <path d="M 78 110 L 96 94 L 102 78 L 116 88 L 120 120 L 90 130 L 60 122 L 56 116 Z" fill="#bfdbfe" opacity={0.85} />
    </svg>
  );
}

/* ── Training Funnel (5 stages) ────────────────────────────────────── */

function TrainingFunnel({ rows }: { rows: { label: string; value: number; pct: number }[] }) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-1.5">
      {rows.map((r, i) => (
        <div
          key={r.label}
          className="rounded-md px-2 py-3 flex flex-col items-center text-center min-h-[86px] justify-center"
          style={{ backgroundColor: "#eaf7f1", border: "1px solid #d1ecde" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#047857] leading-tight truncate w-full">{r.label}</p>
          <p className="text-[18px] font-extrabold text-[#111827] leading-none mt-1.5">{r.value}</p>
          <p className="text-[10px] font-bold text-emerald-700 mt-0.5">{i === 0 ? "" : `${r.pct}%`}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Attendance sparkline ──────────────────────────────────────────── */

function AttendanceSparkline({ values }: { values: number[] }) {
  const w = 130, h = 50, pad = 4;
  const max = Math.max(...values), min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const sx = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const sy = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${sx(values.length - 1).toFixed(1)} ${h - pad} L ${sx(0).toFixed(1)} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Attendance sparkline">
      <defs>
        <linearGradient id="trgSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trgSpark)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── File-tone icon (resources) ────────────────────────────────────── */

function FileToneIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    rose:    { bg: "#fee2e2", fg: "#b91c1c" },
    emerald: { bg: "#d1fae5", fg: "#047857" },
    violet:  { bg: "#ede9fe", fg: "#7c3aed" },
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
    amber:   { bg: "#fef3c7", fg: "#b45309" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md shrink-0" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: t.fg }} />
    </span>
  );
}

/* ── Action tile (Action Center) ──────────────────────────────────── */

function ActionTile({
  icon: Icon, label, href, tone,
}: {
  icon: LucideIcon; label: string; href: string; tone: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    emerald: { bg: "#d1fae5", fg: "#047857" },
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
    violet:  { bg: "#ede9fe", fg: "#7c3aed" },
    orange:  { bg: "#ffedd5", fg: "#c2410c" },
    rose:    { bg: "#fee2e2", fg: "#b91c1c" },
    teal:    { bg: "#ccfbf1", fg: "#0f766e" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e5eaf0] bg-white px-2 py-3 hover:bg-gray-50/60 text-center"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: t.fg }} />
      </span>
      <span className="text-[10.5px] font-bold text-[#111827] leading-tight">{label}</span>
    </Link>
  );
}

/* Hint that ChevronRight / ClipboardList are intentionally available
   for future tile icons — keeps the import compact and future-proof. */
void ChevronRight;
void ClipboardList;

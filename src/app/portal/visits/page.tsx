import Link from "next/link";
import {
  ClipboardCheck, Calendar, School as SchoolIcon, Users, Star, Flag, ShieldCheck,
  Plus, ClipboardList, Download, ChevronDown, ChevronRight, MoreVertical,
  AlertTriangle, Clock, Lightbulb, FileText, BookOpen, MessageSquare, Eye,
  Layers, Pencil, ListChecks, type LucideIcon,
} from "lucide-react";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import {
  DashboardListCard, DashboardListHeader, DashboardListRow,
  StatusPill, ProgressCell, AvatarCell, EmeraldLink, pillToneFor,
} from "@/components/portal/DashboardList";
import { requirePortalStaffUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { devFallback } from "@/lib/dev-fallback";
import {
  getVisitsKpis, getVisitTrend, getEvalDistribution, getRegionalCoverage,
  listRecentVisits, listUpcomingVisits, listCoachWorkload, getEvaluationDomains,
} from "@/lib/server/postgres/repositories/visits-dashboard";

async function safeFetch<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); }
  catch (err) {
    logger.warn(`[visits] ${label} failed; falling back to mock`, { error: String(err) });
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
  title: "School Visits & Teacher Evaluation Overview | Ozeki Portal",
  description:
    "Track school support visits, coaching delivery, classroom observations, and teacher performance across the network.",
};

/* ────────────────────────────────────────────────────────────────────
   Reference data — gated to dev only via devFallback().
   Production zeros these out so live (possibly-empty) DB drives the page.
   ──────────────────────────────────────────────────────────────────── */
const FALLBACK = devFallback({
  kpis: [
    { label: "Visits Completed",       value: "312",   delta: "↑ 18.4% vs last 6 months", icon: ClipboardCheck, accent: "emerald" as const },
    { label: "Scheduled Visits",       value: "48",    delta: "↑ 4.1% vs last 6 months",  icon: Calendar,       accent: "blue"    as const },
    { label: "Schools Reached",        value: "172",   delta: "↑ 6.5% vs last 6 months",  icon: SchoolIcon,     accent: "violet"  as const },
    { label: "Teachers Evaluated",     value: "1,264", delta: "↑ 11.7% vs last 6 months", icon: Users,          accent: "violet"  as const },
    { label: "Avg Evaluation Score",   value: "74%",   delta: "↑ 3.6pp vs last 6 months", icon: Star,           accent: "orange"  as const },
    { label: "Follow-up Actions Open", value: "96",    delta: "↑ 12.3% vs last 6 months", icon: Flag,           accent: "rose"    as const },
    { label: "Data Quality",           value: "94%",   delta: "↑ 2.8pp vs last 6 months", icon: ShieldCheck,    accent: "emerald" as const },
  ],
  visitTrend: {
    months: ["Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25"],
    values: [48, 56, 68, 72, 96, 72],
    yMax: 120,
  },
  evalDistribution: {
    total: 1264,
    label: "Evaluations",
    rows: [
      { label: "Excellent (80-100%)",    value: 302, pct: 23.9, color: "#10b981" },
      { label: "Good (60-79%)",          value: 541, pct: 42.8, color: "#2563eb" },
      { label: "Needs Support (40-59%)", value: 291, pct: 23.0, color: "#f59e0b" },
      { label: "Critical (0-39%)",       value: 130, pct: 10.3, color: "#ef4444" },
    ],
  },
  regionalCoverage: [
    { name: "Central",   pct: 94 },
    { name: "Western",   pct: 88 },
    { name: "Northern",  pct: 86 },
    { name: "Eastern",   pct: 82 },
    { name: "West Nile", pct: 79 },
    { name: "Karamoja",  pct: 65 },
    { name: "Teso",      pct: 61 },
  ],
  recentVisits: [
    { id: "VST-2025-0522", school: "Ndejje Primary School",  coach: "Agnes Nansajo", date: "May 21, 2025", type: "Coaching",    status: "Completed", score: "82%" },
    { id: "VST-2025-0521", school: "St. Mary's P/S, Gulu",   coach: "Joseph Akiri",  date: "May 20, 2025", type: "Observation", status: "Completed", score: "76%" },
    { id: "VST-2025-0519", school: "Kitende Primary School", coach: "Brigit Kalio",  date: "May 19, 2025", type: "Coaching",    status: "Completed", score: "68%" },
    { id: "VST-2025-0517", school: "Kabarole P/S",           coach: "Fah Nakato",    date: "May 17, 2025", type: "Observation", status: "In Review", score: "70%" },
    { id: "VST-2025-0516", school: "Arua Hill P/S",          coach: "Samuel Otelto", date: "May 16, 2025", type: "Coaching",    status: "Pending",   score: "—" },
  ],
  alerts: [
    { tone: "rose",   icon: AlertTriangle, text: "Teachers scoring below 50%",        count: 18 },
    { tone: "rose",   icon: AlertTriangle, text: "Consecutive low scores (2+ evals)", count: 12 },
    { tone: "rose",   icon: AlertTriangle, text: "Schools with < 50% avg score",      count: 14 },
    { tone: "orange", icon: AlertTriangle, text: "High-priority follow-ups overdue",  count: 22 },
    { tone: "muted",  icon: Clock,         text: "Evaluation overdue (> 90 days)",    count: 8  },
  ],
  upcoming: [
    { date: "May 27, 2025", school: "Lira Primary School",   purpose: "Classroom Observation", coach: "Agnes Nansajo" },
    { date: "May 28, 2025", school: "Gulu P/S",               purpose: "Coaching Visit",        coach: "Joseph Akiri"  },
    { date: "May 29, 2025", school: "Masindi Primary School", purpose: "Evaluation",            coach: "Brigit Kalio"  },
    { date: "May 30, 2025", school: "Soroti P/S",             purpose: "Coaching Visit",        coach: "Fah Nakato"    },
    { date: "Jun 02, 2025", school: "Mbarara Model P/S",      purpose: "Observation",           coach: "Samuel Otelto" },
  ],
  domains: [
    { label: "Lesson Planning",       pct: 76, delta: 4, icon: BookOpen },
    { label: "Phonics Instruction",   pct: 72, delta: 3, icon: MessageSquare },
    { label: "Learner Engagement",    pct: 69, delta: 5, icon: Users },
    { label: "Assessment Practice",   pct: 71, delta: 4, icon: ClipboardCheck },
    { label: "Classroom Environment", pct: 74, delta: 3, icon: Eye },
  ],
  workload: [
    { name: "Agnes Nansajo", initials: "AN", color: "#10b981", assigned: 24, completed: 18, pending: 6, rate: 75 },
    { name: "Joseph Akiri",  initials: "JA", color: "#2563eb", assigned: 22, completed: 16, pending: 7, rate: 73 },
    { name: "Brigit Kalio",  initials: "BK", color: "#f59e0b", assigned: 20, completed: 14, pending: 6, rate: 70 },
    { name: "Fah Nakato",    initials: "FN", color: "#8b5cf6", assigned: 21, completed: 13, pending: 8, rate: 62 },
    { name: "Samuel Otelto", initials: "SO", color: "#ef4444", assigned: 19, completed: 12, pending: 7, rate: 63 },
  ],
  followUps: [
    { action: "Demonstration Lesson",     relatedTo: "St. Mary's P/S, Gulu",    owner: "Joseph Akiri",  due: "May 26, 2025", status: "Overdue"  },
    { action: "In-school Coaching",        relatedTo: "Kitende Primary School",  owner: "Brigit Kalio",  due: "May 27, 2025", status: "Due Soon" },
    { action: "Re-observation",            relatedTo: "Kabarole P/S",            owner: "Fah Nakato",    due: "May 30, 2025", status: "Upcoming" },
    { action: "Reading Assessment Review", relatedTo: "Arua Hill P/S",           owner: "Samuel Otelto", due: "Jun 02, 2025", status: "Upcoming" },
    { action: "Follow-up Coaching",        relatedTo: "Masindi Primary School",  owner: "Agnes Nansajo", due: "Jun 03, 2025", status: "Upcoming" },
  ],
  insight: {
    text: "Northern and Central regions showed the strongest teacher growth this period, while 22 schools require targeted classroom coaching support.",
    updated: "May 21, 2025  12:45 PM",
  },
});

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function PortalVisitsOverviewPage() {
  const user = await requirePortalStaffUser();

  const [
    liveKpis, liveTrend, liveDist, liveCoverage,
    liveRecent, liveUpcoming, liveWorkload, liveDomains,
  ] = await Promise.all([
    safeFetch("kpis",        () => getVisitsKpis()),
    safeFetch("trend",       () => getVisitTrend(6)),
    safeFetch("distribution", () => getEvalDistribution()),
    safeFetch("coverage",    () => getRegionalCoverage()),
    safeFetch("recent",      () => listRecentVisits(5)),
    safeFetch("upcoming",    () => listUpcomingVisits(5)),
    safeFetch("workload",    () => listCoachWorkload(5)),
    safeFetch("domains",     () => getEvaluationDomains()),
  ]);

  const DATA = {
    ...FALLBACK,
    kpis: liveKpis ? FALLBACK.kpis.map((k) => {
      const lookup: Record<string, string> = {
        "Visits Completed":       String(liveKpis.visitsCompleted),
        "Scheduled Visits":       String(liveKpis.scheduledVisits),
        "Schools Reached":        String(liveKpis.schoolsReached),
        "Teachers Evaluated":     liveKpis.teachersEvaluated.toLocaleString(),
        "Avg Evaluation Score":   `${liveKpis.avgEvaluationScore}%`,
        "Follow-up Actions Open": String(liveKpis.followUpActionsOpen),
        "Data Quality":           `${liveKpis.dataQualityPct}%`,
      };
      return { ...k, value: lookup[k.label] ?? k.value };
    }) : FALLBACK.kpis,
    visitTrend: liveTrend && liveTrend.length > 0
      ? {
          months: liveTrend.map((p) => p.month),
          values: liveTrend.map((p) => p.visits),
          yMax: Math.max(120, ...liveTrend.map((p) => p.visits)),
        }
      : FALLBACK.visitTrend,
    evalDistribution: liveDist
      ? {
          total: liveDist.total,
          label: "Evaluations",
          rows: liveDist.segments.map((s, i) => ({
            ...s,
            color: FALLBACK.evalDistribution.rows[i]?.color ?? "#10b981",
          })),
        }
      : FALLBACK.evalDistribution,
    regionalCoverage: liveCoverage && liveCoverage.length > 0 ? liveCoverage : FALLBACK.regionalCoverage,
    recentVisits: liveRecent && liveRecent.length > 0
      ? liveRecent.map((v) => ({ ...v, date: fmtDate(v.date) }))
      : FALLBACK.recentVisits,
    upcoming: liveUpcoming && liveUpcoming.length > 0
      ? liveUpcoming.map((u) => ({ ...u, date: fmtDate(u.date) }))
      : FALLBACK.upcoming,
    workload: liveWorkload && liveWorkload.length > 0 ? liveWorkload : FALLBACK.workload,
    domains: liveDomains && liveDomains.length > 0
      ? liveDomains.map((d, i) => {
          const fb = FALLBACK.domains[i] ?? FALLBACK.domains[0];
          return { ...d, delta: fb.delta, icon: fb.icon };
        })
      : FALLBACK.domains,
  };

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/visits"
      greeting={`Welcome Back, ${user.fullName ?? "ORBF Support"} 👋`}
      subtitle="Here's what's happening across visits, coaching, and teacher evaluation."
      hideFrame
    >
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#f8fafc" }}
        className="px-4 sm:px-6 lg:px-7 py-5 space-y-4 max-w-[1700px] mx-auto"
      >
        {/* ─── Title row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[27px] font-extrabold tracking-tight text-[#111827] leading-tight">
              School Visits &amp; Teacher Evaluation Overview
            </h1>
            <p className="text-[13px] text-[#667085] leading-snug mt-1.5">
              Track school support visits, coaching delivery, classroom observations, and teacher performance across the network.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/visits/new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New School Visit
            </Link>
            <Link
              href="/portal/observations/new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-emerald-200 text-[13px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 whitespace-nowrap"
            >
              <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
              Start Evaluation
            </Link>
            <Link
              href="/portal/visits?action=export"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export Report
            </Link>
          </div>
        </div>

        {/* ─── KPI strip — 7 cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          {DATA.kpis.map((k) => (
            <Kpi key={k.label} {...k} />
          ))}
        </div>

        {/* ─── Analytics row — 4 cards (A / B / C / D) ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[14.5px] font-bold text-[#111827]">
                A. Visit Trend <span className="font-medium text-[#7a8ca3] text-[11.5px] ml-1">(Last 6 Months)</span>
              </h3>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#475467] bg-white border border-[#e5eaf0] rounded-md px-2 py-1 whitespace-nowrap">
                Monthly <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
              </span>
            </div>
            <VisitTrendChart months={DATA.visitTrend.months} values={DATA.visitTrend.values} yMax={DATA.visitTrend.yMax} />
          </Card>

          <Card>
            <CardTopRow title="B. Teacher Evaluation Score Distribution" />
            <div className="mt-2 flex items-center gap-3">
              <DistributionDonut total={DATA.evalDistribution.total} subLabel={DATA.evalDistribution.label} segments={DATA.evalDistribution.rows} />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {DATA.evalDistribution.rows.map((s) => (
                  <li key={s.label} className="text-[11px]">
                    <p className="inline-flex items-center gap-1.5 text-[#374151] font-semibold">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </p>
                    <p className="pl-3.5 text-[#475467]">
                      <strong className="text-[#111827]">{s.value}</strong>{" "}
                      <span className="text-[#94a3b8]">({s.pct}%)</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <h3 className="text-[14.5px] font-bold text-[#111827]">
              C. Regional Coverage <span className="font-medium text-[#7a8ca3] text-[11.5px] ml-1">(Schools Reached)</span>
            </h3>
            <ul className="mt-3 space-y-1.5">
              {DATA.regionalCoverage.map((r) => (
                <li key={r.name} className="grid grid-cols-[80px_1fr_36px] gap-2 items-center text-[11.5px]">
                  <span className="text-[#374151] truncate">{r.name}</span>
                  <div className="h-1.5 rounded-full bg-[#eef0f4] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: "#10b981" }} />
                  </div>
                  <span className="text-[#111827] font-bold text-right">{r.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="text-[14.5px] font-bold text-[#111827]">D. School Visit Coverage Map</h3>
            <div className="mt-2 flex items-center gap-3">
              <UgandaCoverageMap />
              <ul className="space-y-1.5 text-[10.5px]">
                <CoverageLegendRow color="#065f46" label="90-100%" />
                <CoverageLegendRow color="#10b981" label="75-89%" />
                <CoverageLegendRow color="#34d399" label="50-74%" />
                <CoverageLegendRow color="#86efac" label="25-49%" />
                <CoverageLegendRow color="#d1fae5" label="0-24%" />
                <CoverageLegendRow color="#e5e7eb" label="No Data" />
              </ul>
            </div>
          </Card>
        </div>

        {/* ─── Operational row — Recent / Alerts / Upcoming ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {(() => {
            const tpl = "120px minmax(0,1.4fr) minmax(0,1fr) 100px 100px 100px 60px";
            return (
              <DashboardListCard
                title="Recent School Visits"
                padded={false}
                className="lg:col-span-5"
                viewAll={{ href: "/portal/visits/manage", label: "View All" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Visit ID</span><span>School</span><span>Coach</span>
                    <span>Date</span><span>Type</span><span>Status</span><span>Score</span>
                  </DashboardListHeader>
                  {DATA.recentVisits.map((v) => (
                    <DashboardListRow key={v.id} template={tpl}>
                      <span><EmeraldLink href={`/portal/visits/${v.id}`}>{v.id}</EmeraldLink></span>
                      <span className="text-[#111827] font-bold truncate">{v.school}</span>
                      <span className="text-[#374151] truncate">{v.coach}</span>
                      <span className="text-[#374151]">{v.date}</span>
                      <span className="text-[#374151]">{v.type}</span>
                      <span><StatusPill tone={pillToneFor(v.status)}>{v.status}</StatusPill></span>
                      <span className="text-[#111827] font-bold">{v.score}</span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          <Card padded={false} className="lg:col-span-3">
            <div className="px-5 py-3.5 border-b border-[#e8edf3] flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold text-[#111827]">Teacher Evaluation Alerts</h3>
              <FooterLink href="/portal/visits?view=alerts" label="View All" inline />
            </div>
            <ul>
              {DATA.alerts.map((a) => (
                <li key={a.text} className="px-5 py-2.5 border-b border-[#f3f5f8] last:border-b-0 flex items-center gap-3 text-[12px]">
                  <AlertIcon icon={a.icon} tone={a.tone} />
                  <p className="min-w-0 flex-1 text-[#374151] truncate">{a.text}</p>
                  <AlertCountChip tone={a.tone} value={a.count} />
                </li>
              ))}
            </ul>
          </Card>

          {(() => {
            const tpl = "100px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)";
            return (
              <DashboardListCard
                title="Upcoming Visits & Coaching"
                padded={false}
                className="lg:col-span-4"
                viewAll={{ href: "/portal/visits?view=upcoming", label: "View All" }}
              >
                <div className="px-3 pb-2">
                  <DashboardListHeader template={tpl}>
                    <span>Date</span><span>School</span><span>Purpose</span><span>Coach</span>
                  </DashboardListHeader>
                  {DATA.upcoming.map((u) => (
                    <DashboardListRow key={`${u.date}-${u.school}`} template={tpl}>
                      <span className="inline-flex items-center gap-1.5 text-[#374151]">
                        <Calendar className="h-3 w-3 text-[#94a3b8]" strokeWidth={1.75} />
                        {u.date}
                      </span>
                      <span className="text-[#111827] font-bold truncate">{u.school}</span>
                      <span className="text-[#374151] truncate">{u.purpose}</span>
                      <span className="text-[#374151] truncate">{u.coach}</span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}
        </div>

        {/* ─── Domains + Coach Workload + Follow-up Actions ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Evaluation Domains</h3>
                <p className="text-[11px] text-[#7a8ca3] mt-0.5">(Average Score)</p>
              </div>
              <KebabButton />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {DATA.domains.map((d) => (
                <DomainTile key={d.label} {...d} />
              ))}
            </div>
          </Card>

          {(() => {
            const tpl = "minmax(0,1.4fr) 90px 80px 100px 130px";
            return (
              <DashboardListCard
                title="Coach Workload"
                padded={false}
                className="lg:col-span-5"
                viewAll={{ href: "/portal/coach-workload", label: "View All" }}
              >
                <div className="px-3 pb-2">
                  <DashboardListHeader template={tpl}>
                    <span>Coach</span><span>Assigned</span><span>Completed</span>
                    <span>Pending</span><span>Completion Rate</span>
                  </DashboardListHeader>
                  {DATA.workload.map((c) => (
                    <DashboardListRow key={c.name} template={tpl}>
                      <AvatarCell initials={c.initials} name={c.name} color={c.color} />
                      <span className="text-[#374151]">{c.assigned}</span>
                      <span className="text-[#374151]">{c.completed}</span>
                      <span className="text-[#374151]">{c.pending}</span>
                      <ProgressCell pct={c.rate} />
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          {(() => {
            const tpl = "minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1fr) 100px 90px";
            return (
              <DashboardListCard
                title="Follow-up Actions"
                padded={false}
                className="lg:col-span-4"
                viewAll={{ href: "/portal/visits?view=follow-ups", label: "View All" }}
              >
                <div className="px-3 pb-2">
                  <DashboardListHeader template={tpl}>
                    <span>Action</span><span>Related To</span><span>Owner</span>
                    <span>Due Date</span><span>Status</span>
                  </DashboardListHeader>
                  {DATA.followUps.map((f) => (
                    <DashboardListRow key={`${f.action}-${f.relatedTo}`} template={tpl}>
                      <span className="text-[#111827] font-bold truncate">{f.action}</span>
                      <span className="text-[#374151] truncate">{f.relatedTo}</span>
                      <span className="text-[#374151] truncate">{f.owner}</span>
                      <span className="text-[#7a8ca3]">{f.due}</span>
                      <span><StatusPill tone={pillToneFor(f.status)}>{f.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}
        </div>

        {/* ─── Bottom Insight Bar ─────────────────────────────────── */}
        <section
          className="rounded-2xl border border-[#dcefe8] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ backgroundColor: "#f3faf6" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] text-[#374151] leading-snug min-w-0">
              <strong className="text-emerald-700">Visit &amp; Evaluation Insight</strong> &mdash; {DATA.insight.text}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#7a8ca3] self-start md:self-center shrink-0">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="whitespace-nowrap">Updated: {DATA.insight.updated}</span>
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

function CardTopRow({ title }: { title: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-[14.5px] font-bold text-[#111827]">{title}</h3>
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
      className="rounded-2xl border border-[#e5eaf0] bg-white p-3.5 flex flex-col gap-1.5 min-h-[100px]"
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

/* ── Visit Trend chart (line + point labels) ──────────────────────── */

function VisitTrendChart({ months, values, yMax }: { months: string[]; values: number[]; yMax: number }) {
  const w = 360, h = 175, pl = 30, pr = 8, pt = 22, pb = 24;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 30, 60, 90, 120];
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Visit trend">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={sy(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
          <text x={sx(i)} y={sy(v) - 8} fontSize="9.5" fontWeight="700" fill="#111827" textAnchor="middle">{v}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ── Distribution donut (4-segment) ───────────────────────────────── */

function DistributionDonut({
  total, subLabel, segments,
}: {
  total: number; subLabel: string; segments: { label: string; pct: number; color: string }[];
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
        {total.toLocaleString()}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9.5" fill="#7a8ca3">{subLabel}</text>
    </svg>
  );
}

/* ── Alert icon + count chip ──────────────────────────────────────── */

function AlertIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    rose:   { bg: "#fee2e2", fg: "#b91c1c" },
    orange: { bg: "#ffedd5", fg: "#c2410c" },
    muted:  { bg: "#f1f5f9", fg: "#475467" },
  };
  const t = map[tone] ?? map.rose;
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full shrink-0" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: t.fg }} />
    </span>
  );
}

function AlertCountChip({ tone, value }: { tone: string; value: number }) {
  const cls = tone === "rose"
    ? "bg-rose-50 text-rose-700 border-rose-100"
    : tone === "orange"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${cls}`}>
      {value}
    </span>
  );
}

/* ── Domain tile ───────────────────────────────────────────────────── */

function DomainTile({
  label, pct, delta, icon: Icon,
}: {
  label: string; pct: number; delta: number; icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-[#e5eaf0] p-2.5 flex flex-col items-center text-center gap-1.5 bg-white">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <p className="text-[10px] font-bold text-[#475467] leading-tight min-h-[24px]">{label}</p>
      <p className="text-[18px] font-extrabold text-[#111827] leading-none">{pct}%</p>
      <p className="text-[10px] font-bold text-emerald-600">↑ {delta}pp</p>
      <div className="h-1 w-full rounded-full bg-[#eef0f4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#10b981" }} />
      </div>
    </div>
  );
}

/* ── Coverage legend row ──────────────────────────────────────────── */

function CoverageLegendRow({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[#374151] whitespace-nowrap">{label}</span>
    </li>
  );
}

/* ── Uganda coverage map ──────────────────────────────────────────── */

function UgandaCoverageMap() {
  /* District-tile choropleth approach used by the assessments + visits
     coverage cards — Uganda-shaped with 6 colour buckets and Lake
     Victoria in light blue. */
  const tiles: { x: number; y: number; fill: string }[] = [
    { x: 28, y: 12, fill: "#10b981" }, { x: 42, y: 10, fill: "#10b981" }, { x: 56, y: 12, fill: "#34d399" }, { x: 70, y: 14, fill: "#86efac" }, { x: 84, y: 18, fill: "#34d399" },
    { x: 22, y: 24, fill: "#34d399" }, { x: 36, y: 22, fill: "#10b981" }, { x: 50, y: 22, fill: "#065f46" }, { x: 64, y: 24, fill: "#10b981" }, { x: 78, y: 28, fill: "#34d399" },
    { x: 18, y: 36, fill: "#34d399" }, { x: 32, y: 34, fill: "#065f46" }, { x: 46, y: 34, fill: "#065f46" }, { x: 60, y: 36, fill: "#10b981" }, { x: 74, y: 40, fill: "#10b981" },
    { x: 14, y: 48, fill: "#34d399" }, { x: 28, y: 46, fill: "#10b981" }, { x: 42, y: 46, fill: "#065f46" }, { x: 56, y: 48, fill: "#10b981" }, { x: 70, y: 52, fill: "#34d399" },
    { x: 18, y: 60, fill: "#10b981" }, { x: 32, y: 58, fill: "#065f46" }, { x: 46, y: 58, fill: "#065f46" }, { x: 60, y: 60, fill: "#34d399" },
    { x: 22, y: 72, fill: "#34d399" }, { x: 36, y: 70, fill: "#10b981" }, { x: 50, y: 70, fill: "#10b981" },
    { x: 88, y: 36, fill: "#34d399" }, { x: 92, y: 50, fill: "#10b981" }, { x: 86, y: 62, fill: "#34d399" },
  ];
  return (
    <svg viewBox="0 0 110 90" width={140} height={120} role="img" aria-label="Visit coverage map" className="shrink-0">
      <path d="M 60 75 Q 72 70 86 74 Q 96 78 100 86 L 60 86 Z" fill="#bfdbfe" opacity={0.85} />
      <path d="M 12 12 L 90 8 L 100 30 L 102 60 L 95 80 L 60 84 L 30 80 L 14 60 Z" fill="#f0fdf4" opacity={0.55} />
      {tiles.map((t, i) => (
        <rect key={i} x={t.x - 4} y={t.y - 4} width={8} height={8} rx={1.4} fill={t.fill} opacity={0.92} />
      ))}
    </svg>
  );
}

/* Hint that imports kept for future tile slots stay referenced. */
void FileText; void Layers; void Pencil; void ListChecks;

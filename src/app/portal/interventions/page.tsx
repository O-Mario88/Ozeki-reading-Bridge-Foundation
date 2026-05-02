import Link from "next/link";
import {
  CalendarCheck, School as SchoolIcon, ClipboardCheck, AlertOctagon, Users,
  Gauge, ShieldAlert, Download, Plus, UserPlus, ChevronDown, Lightbulb,
  Filter, MoreVertical, FilePlus2, Upload, FileText, FileSpreadsheet,
  FileImage, Calendar, MapPin, Sparkles, Activity,
  type LucideIcon,
} from "lucide-react";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getInterventionsKpis,
  listInterventionPlans,
  getInterventionProgressTrend,
  getInterventionTypeMix,
  getInterventionOutcomeFunnel,
  getInterventionRegionCoverage,
  listPriorityQueue,
  listPlanActions,
  listOwnerWorkload,
  listInterventionActivity,
  listInterventionEvidence,
} from "@/lib/server/postgres/repositories/interventions";

export const dynamic = "force-dynamic";

/* Pretty-format a Postgres date/timestamp as the dashboard's "MMM DD, YYYY"
   style. Falls through to the original string if the value is already
   pre-formatted (the FALLBACK constant uses pre-formatted strings). */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  try {
    return new Date(iso)
      .toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "numeric", minute: "2-digit",
      })
      .replace(",", " •");
  } catch {
    return iso;
  }
}

/* Try a repo function and return its value on success, otherwise null.
   Each card on the page checks for null and falls back to the FALLBACK
   constant. Repo errors (missing table, bad query) are logged once
   and do NOT take the page down. */
async function safeFetch<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(`[interventions] ${label} failed; falling back to mock`, { error: String(err) });
    return null;
  }
}

export const metadata = {
  title: "Interventions Overview | Ozeki Portal",
  description:
    "Plan, prioritize, track actions, and measure outcomes across Uganda.",
};

/* ────────────────────────────────────────────────────────────────────
   Reference data — frozen verbatim from the supplied screenshot.
   ──────────────────────────────────────────────────────────────────── */
const FALLBACK = {
  tabs: [
    { label: "Benchmarks",        href: "/portal/benchmarks" },
    { label: "Data Quality",      href: "/portal/data-quality" },
    { label: "National Insights", href: "/portal/national-intelligence" },
    { label: "Priority Queue",    href: "/portal/priority-queue" },
    { label: "Interventions",     href: "/portal/interventions", active: true },
    { label: "Report Packs",      href: "/portal/national-reports" },
    { label: "Partner API",       href: "/portal/admin/api-keys" },
  ],
  kpis: [
    { label: "Active Plans",               value: "32",  delta: "↑ 14% vs last month",  trendUp: true,  icon: CalendarCheck,  accent: "emerald" as const },
    { label: "Schools Under Intervention", value: "248", delta: "↑ 9% vs last month",   trendUp: true,  icon: SchoolIcon,     accent: "violet"  as const },
    { label: "Open Actions",               value: "412", delta: "↑ 11% vs last month",  trendUp: true,  icon: ClipboardCheck, accent: "blue"    as const },
    { label: "Overdue Actions",            value: "67",  delta: "↑ 22% vs last month",  trendUp: true,  icon: AlertOctagon,   accent: "rose"    as const },
    { label: "Owners Assigned",            value: "28",  delta: "→ 0% vs last month",   trendUp: null,  icon: Users,          accent: "orange"  as const },
    { label: "Avg Plan Completion",        value: "62%", delta: "↑ 6 pp vs last month", trendUp: true,  icon: Gauge,          accent: "emerald" as const },
    { label: "High-Risk Schools",          value: "37",  delta: "↑ 15% vs last month",  trendUp: true,  icon: ShieldAlert,    accent: "rose"    as const },
  ],
  trend: {
    months: ["Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25"],
    values: [32, 40, 38, 50, 56, 62],
  },
  typeMix: {
    total: 32,
    rows: [
      { label: "Coaching Cycles",     value: 10, pct: 31, color: "#10b981" },
      { label: "Remedial Reading",    value: 8,  pct: 25, color: "#8b5cf6" },
      { label: "Materials Support",   value: 6,  pct: 19, color: "#2563eb" },
      { label: "Leadership Support",  value: 5,  pct: 16, color: "#f59e0b" },
      { label: "Data Quality Fixes", value: 3,  pct: 9,  color: "#14b8a6" },
    ],
  },
  funnel: [
    { label: "Planned",     value: 48, pct: 100, color: "#10b981" },
    { label: "Approved",    value: 36, pct: 75,  color: "#86efac" },
    { label: "In Progress", value: 24, pct: 50,  color: "#fbbf24" },
    { label: "Completed",   value: 16, pct: 33,  color: "#60a5fa" },
    { label: "Verified",    value: 10, pct: 21,  color: "#a78bfa" },
  ],
  regions: [
    { name: "Central",   value: 64 },
    { name: "Northern",  value: 52 },
    { name: "Western",   value: 46 },
    { name: "Eastern",   value: 34 },
    { name: "Karamoja",  value: 29 },
    { name: "West Nile", value: 23 },
  ],
  filters: {
    scopeType: "Country",
    scopeName: "Uganda",
    priority:  "All Priorities",
    status:    "All Statuses",
  },
  plans: [
    { id: "IP-032", title: "Northern Literacy Recovery Plan",   scope: "Uganda", owner: "Jane Namuli",    ownerInit: "JN", ownerColor: "#10b981", status: "In Progress", progress: 68, due: "Jun 15, 2026", risk: "High",   updated: "May 21, 2025" },
    { id: "IP-031", title: "Teacher Coaching Cycle – Acholi",   scope: "Uganda", owner: "Patrick Okello", ownerInit: "PO", ownerColor: "#2563eb", status: "In Progress", progress: 54, due: "May 28, 2026", risk: "Medium", updated: "May 20, 2025" },
    { id: "IP-030", title: "Attendance Improvement – Moroto",   scope: "Uganda", owner: "Aminah M.",      ownerInit: "AM", ownerColor: "#f59e0b", status: "At Risk",     progress: 31, due: "May 18, 2026", risk: "High",   updated: "May 19, 2025" },
    { id: "IP-029", title: "Assessment Data Cleanup – Kampala", scope: "Uganda", owner: "Brian W.",       ownerInit: "BW", ownerColor: "#8b5cf6", status: "In Progress", progress: 72, due: "Jun 05, 2026", risk: "Low",    updated: "May 18, 2025" },
    { id: "IP-028", title: "Reading Materials Support – Lira",  scope: "Uganda", owner: "Nadia T.",       ownerInit: "NT", ownerColor: "#ef4444", status: "Approved",    progress: 15, due: "Jun 20, 2026", risk: "Medium", updated: "May 17, 2025" },
  ],
  totalPlans: 32,
  priorityQueue: [
    { plan: "Attendance Improvement – Moroto",    issue: "Overdue actions (12)", risk: "High",   due: "May 18, 2026" },
    { plan: "Reading Support – Karamoja Cluster", issue: "Low progress (18%)",   risk: "High",   due: "May 20, 2026" },
    { plan: "Coaching Cycle – West Nile",         issue: "No recent activity",   risk: "Medium", due: "May 25, 2026" },
    { plan: "Materials Support – Bundibugyo",     issue: "Evidence pending",     risk: "Medium", due: "May 27, 2026" },
  ],
  planActions: [
    { action: "Conduct coaching visit",     plan: "IP-031", owner: "Patrick Okello", due: "May 23, 2026", status: "Pending"     },
    { action: "Collect attendance data",     plan: "IP-030", owner: "Aminah M.",      due: "May 24, 2026", status: "Pending"     },
    { action: "Verify assessment fixes",     plan: "IP-029", owner: "Brian W.",       due: "May 25, 2026", status: "In Progress" },
    { action: "Distribute reading kits",     plan: "IP-028", owner: "Nadia T.",       due: "May 26, 2026", status: "Pending"     },
    { action: "Hold school leadership mtg.", plan: "IP-032", owner: "Jane Namuli",    due: "May 27, 2026", status: "Pending"     },
  ],
  actionCenter: [
    { icon: FilePlus2, label: "New Plan",        href: "/portal/interventions?action=new",       tone: "emerald" },
    { icon: Plus,      label: "Add Action",      href: "/portal/interventions?action=add",       tone: "blue"    },
    { icon: UserPlus,  label: "Assign Owner",    href: "/portal/interventions?action=assign",    tone: "violet"  },
    { icon: Calendar,  label: "Schedule Visit",  href: "/portal/visits/new",                     tone: "orange"  },
    { icon: Upload,    label: "Upload Evidence", href: "/portal/resources?context=intervention", tone: "teal"    },
    { icon: FileText,  label: "Generate Pack",   href: "/portal/national-reports",               tone: "rose"    },
  ],
  workload: [
    { rank: 1, owner: "Jane Namuli",    active: 8, completion: 72 },
    { rank: 2, owner: "Patrick Okello", active: 7, completion: 58 },
    { rank: 3, owner: "Aminah M.",      active: 6, completion: 46 },
    { rank: 4, owner: "Brian W.",       active: 5, completion: 66 },
    { rank: 5, owner: "Nadia T.",       active: 4, completion: 39 },
  ],
  activity: [
    { tone: "emerald", icon: Activity,        title: "Plan IP-031 \"Teacher Coaching Cycle – Acholi\" progress updated to 54%",        when: "May 21, 2026 • 10:24 AM" },
    { tone: "emerald", icon: ClipboardCheck,   title: "Action \"Collect attendance data\" marked complete for IP-030",                  when: "May 20, 2026 • 04:18 PM" },
    { tone: "rose",    icon: Upload,           title: "New evidence uploaded for IP-029 \"Assessment Data Cleanup – Kampala\"",         when: "May 20, 2026 • 11:02 AM" },
    { tone: "blue",    icon: Sparkles,         title: "Plan IP-032 \"Northern Literacy Recovery Plan\" status changed to In Progress", when: "May 19, 2026 • 03:47 PM" },
  ],
  evidence: [
    { file: "Coaching Visit Report – Gulu.pdf",  icon: FileText,        tone: "rose",    plan: "IP-031", uploader: "Patrick Okello", date: "May 21, 2026", status: "Verified" },
    { file: "Attendance Sheet – Moroto.xlsx",     icon: FileSpreadsheet, tone: "emerald", plan: "IP-030", uploader: "Aminah M.",      date: "May 20, 2026", status: "Pending"  },
    { file: "Assessment Fix Log – Kampala.csv",   icon: FileSpreadsheet, tone: "emerald", plan: "IP-029", uploader: "Brian W.",       date: "May 19, 2026", status: "Verified" },
    { file: "Reading Kits Delivery – Lira.jpg",   icon: FileImage,       tone: "violet",  plan: "IP-028", uploader: "Nadia T.",       date: "May 18, 2026", status: "Pending"  },
    { file: "Leadership Meeting Minutes.pdf",     icon: FileText,        tone: "rose",    plan: "IP-032", uploader: "Jane Namuli",    date: "May 17, 2026", status: "Verified" },
  ],
  insight: {
    text: "Regions with the highest action completion this month were Central and Northern, while 37 schools remain high-risk and require immediate follow-up.",
    updated: "May 21, 2026  12:45 PM",
  },
};

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function PortalInterventionsOverviewPage() {
  const user = await requirePortalStaffUser();

  /* ── Fetch live data in parallel; each repo returns null on miss/error
        and we fall back to the screenshot constants below so an empty
        intervention_* table still renders the same UI as before. ───── */
  const [
    liveKpis,
    livePlansPage,
    liveTrend,
    liveTypeMix,
    liveFunnel,
    liveRegions,
    liveQueue,
    liveActions,
    liveWorkload,
    liveActivity,
    liveEvidence,
  ] = await Promise.all([
    safeFetch("kpis",         () => getInterventionsKpis()),
    safeFetch("plans",        () => listInterventionPlans({ limit: 5 })),
    safeFetch("trend",        () => getInterventionProgressTrend(6)),
    safeFetch("typeMix",      () => getInterventionTypeMix()),
    safeFetch("funnel",       () => getInterventionOutcomeFunnel()),
    safeFetch("regions",      () => getInterventionRegionCoverage()),
    safeFetch("priorityQueue", () => listPriorityQueue(4)),
    safeFetch("planActions",  () => listPlanActions(5)),
    safeFetch("workload",     () => listOwnerWorkload(5)),
    safeFetch("activity",     () => listInterventionActivity(4)),
    safeFetch("evidence",     () => listInterventionEvidence(5)),
  ]);

  /* ── Overlay live data onto the FALLBACK structure. The renderer
        below reads everything from `DATA`. Anything that returned
        null/empty stays at the screenshot value, anything live
        replaces it. Shape conversions (Postgres ISO dates → display
        strings, repo column names → renderer field names) live here
        so the JSX stays simple. ─────────────────────────────────── */
  const ownerColors: Record<string, string> = {
    JN: "#10b981", PO: "#2563eb", AM: "#f59e0b", BW: "#8b5cf6", NT: "#ef4444",
  };
  const colorFor = (init: string) =>
    ownerColors[init] ?? `hsl(${(init.charCodeAt(0) * 37) % 360} 65% 45%)`;

  const DATA = {
    ...FALLBACK,
    kpis: liveKpis
      ? FALLBACK.kpis.map((k) => {
          const lookup: Record<string, string> = {
            "Active Plans":               String(liveKpis.activePlans),
            "Schools Under Intervention": String(liveKpis.schoolsUnderIntervention),
            "Open Actions":               String(liveKpis.openActions),
            "Overdue Actions":            String(liveKpis.overdueActions),
            "Owners Assigned":            String(liveKpis.ownersAssigned),
            "Avg Plan Completion":        `${liveKpis.avgPlanCompletionPct}%`,
            "High-Risk Schools":          String(liveKpis.highRiskSchools),
          };
          return { ...k, value: lookup[k.label] ?? k.value };
        })
      : FALLBACK.kpis,
    trend: liveTrend && liveTrend.length > 0
      ? { months: liveTrend.map((p) => p.month), values: liveTrend.map((p) => p.pct) }
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
    funnel: liveFunnel && liveFunnel.length > 0
      ? liveFunnel.map((r, i) => ({ ...r, color: FALLBACK.funnel[i]?.color ?? "#10b981" }))
      : FALLBACK.funnel,
    regions: liveRegions && liveRegions.length > 0 ? liveRegions : FALLBACK.regions,
    plans: livePlansPage && livePlansPage.rows.length > 0
      ? livePlansPage.rows.map((p) => ({
          id:          p.id,
          title:       p.title,
          scope:       p.scope,
          owner:       p.ownerName ?? "—",
          ownerInit:   p.ownerInitials,
          ownerColor:  colorFor(p.ownerInitials),
          status:      p.status,
          progress:    p.progress,
          due:         fmtDate(p.due),
          risk:        p.risk,
          updated:     fmtDate(p.updated),
        }))
      : FALLBACK.plans,
    totalPlans: livePlansPage?.total ?? FALLBACK.totalPlans,
    priorityQueue: liveQueue && liveQueue.length > 0
      ? liveQueue.map((q) => ({ ...q, due: fmtDate(q.due) }))
      : FALLBACK.priorityQueue,
    planActions: liveActions && liveActions.length > 0
      ? liveActions.map((a) => ({
          action: a.action,
          plan:   a.plan,
          owner:  a.ownerName ?? "—",
          due:    fmtDate(a.due),
          status: a.status,
        }))
      : FALLBACK.planActions,
    workload: liveWorkload && liveWorkload.length > 0
      ? liveWorkload.map((w, i) => ({
          rank: i + 1,
          owner: w.ownerName,
          active: w.activePlans,
          completion: w.avgCompletionPct,
        }))
      : FALLBACK.workload,
    activity: liveActivity && liveActivity.length > 0
      ? liveActivity.map((a) => {
          const fb = FALLBACK.activity[0];
          return {
            tone: fb.tone,
            icon: fb.icon,
            title: a.message,
            when:  fmtDateTime(a.occurredAt),
          };
        })
      : FALLBACK.activity,
    evidence: liveEvidence && liveEvidence.length > 0
      ? liveEvidence.map((e, i) => {
          const fb = FALLBACK.evidence[i] ?? FALLBACK.evidence[0];
          return {
            file: e.fileName,
            icon: fb.icon,
            tone: fb.tone,
            plan: e.planId ?? "—",
            uploader: e.uploaderName ?? "—",
            date: fmtDate(e.uploadedAt),
            status: e.status,
          };
        })
      : FALLBACK.evidence,
  };

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/interventions"
      greeting={`Welcome Back, ${user.fullName ?? "ORBF Support"} 👋`}
      subtitle="Here's what's happening with interventions across Uganda."
      hideFrame
    >
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#f8fafc" }}
        className="px-3 sm:px-4 lg:px-5 py-3 space-y-3 max-w-[1700px] mx-auto"
      >
        {/* ─── Tab strip ──────────────────────────────────────────── */}
        <nav aria-label="Intelligence sections" className="flex items-center gap-0.5 border-b border-[#e8edf3]">
          {DATA.tabs.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={
                t.active
                  ? "px-3 py-2 text-[12px] font-bold text-emerald-700 border-b-2 border-emerald-600 -mb-px"
                  : "px-3 py-2 text-[12px] font-semibold text-[#475467] hover:text-[#111827] border-b-2 border-transparent -mb-px"
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/* ─── Title row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[18px] font-extrabold tracking-tight text-[#111827] leading-tight">
              Interventions Overview
            </h1>
            <p className="text-[12px] text-[#667085] leading-snug mt-1">
              Plan, prioritize, track actions, and measure outcomes across Uganda.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/portal/interventions?action=export"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-emerald-200 text-[12px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Export Plans
            </Link>
            <Link
              href="/portal/interventions?action=new"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-white text-[12px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Create Plan
            </Link>
            <Link
              href="/portal/interventions?action=assign"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-emerald-200 text-[12px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Assign Action
            </Link>
          </div>
        </div>

        {/* ─── KPI strip — 7 cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-2.5">
          {DATA.kpis.map((k) => (
            <Kpi key={k.label} {...k} />
          ))}
        </div>

        {/* ─── Analytics row — 4 cards ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-3">
          <Card>
            <CardTopRow no={1} title="Intervention Progress Trend" subtitle="Plan completion % over the last 6 months" />
            <ProgressTrendChart months={DATA.trend.months} values={DATA.trend.values} />
          </Card>

          <Card>
            <CardTopRow no={2} title="Intervention Type Mix" subtitle="By number of active plans" />
            <div className="mt-2 flex items-center gap-2">
              <TypeMixDonut total={DATA.typeMix.total} segments={DATA.typeMix.rows} />
              <ul className="min-w-0 flex-1 space-y-1">
                {DATA.typeMix.rows.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="inline-flex items-center gap-1.5 text-[#374151] min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="text-[#374151] whitespace-nowrap">
                      <strong className="text-[#111827]">{s.value}</strong>{" "}
                      <span className="text-[#94a3b8]">({s.pct}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardTopRow no={3} title="Intervention Outcome Funnel" subtitle="Plans by stage" />
            <ul className="mt-2 space-y-1.5">
              {DATA.funnel.map((row, i) => (
                <li key={row.label} className="grid grid-cols-[80px_1fr_70px] items-center gap-2 text-[10.5px]">
                  <span className="text-[#374151] truncate">{row.label}</span>
                  <FunnelBar pct={row.pct} color={row.color} barIndex={i} totalBars={DATA.funnel.length} />
                  <span className="text-[#374151] whitespace-nowrap text-right">
                    <strong className="text-[#111827]">{row.value}</strong>{" "}
                    <span className="text-[#94a3b8]">({row.pct}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTopRow no={4} title="Uganda Intervention Coverage" subtitle="Active plans by region" />
            <div className="mt-2 grid grid-cols-[100px_1fr] gap-2 items-start">
              <UgandaCoverageMap />
              <ul className="space-y-1 text-[10.5px]">
                {DATA.regions.map((r) => (
                  <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-1">
                    <span className="text-[#374151] truncate">{r.name}</span>
                    <span className="text-[#111827] font-bold whitespace-nowrap">{r.value}</span>
                  </li>
                ))}
                <li className="grid grid-cols-[1fr_auto] items-center gap-1 border-t border-[#eef0f4] pt-1 mt-1">
                  <span className="text-[#7a8ca3] font-bold">Total</span>
                  <span className="text-[#111827] font-extrabold">248</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* ─── Filter row ─────────────────────────────────────────── */}
        <Card padded={false}>
          <div className="px-3 py-2.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
            <FilterField label="Scope Type">
              <SelectStub value={DATA.filters.scopeType} />
            </FilterField>
            <FilterField label="Scope ID / Name">
              <SelectStub value={DATA.filters.scopeName} />
            </FilterField>
            <FilterField label="Period Start">
              <DateStub value="01/01/2026" />
            </FilterField>
            <FilterField label="Period End">
              <DateStub value="02/05/2026" />
            </FilterField>
            <FilterField label="Priority">
              <SelectStub value={DATA.filters.priority} />
            </FilterField>
            <FilterField label="Status">
              <SelectStub value={DATA.filters.status} />
            </FilterField>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[6px] text-white text-[11px] font-bold whitespace-nowrap"
                style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
              >
                <Filter className="h-3 w-3" strokeWidth={1.75} />
                Apply Filters
              </button>
              <button type="button" className="text-[11px] font-semibold text-[#475467] hover:text-[#111827]">
                Reset
              </button>
            </div>
          </div>
        </Card>

        {/* ─── Main content grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-3 min-w-0">
            {/* Intervention Plans */}
            <Card padded={false}>
              <div className="px-3 py-2.5 border-b border-[#e8edf3] flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#111827]">Intervention Plans</h3>
                <KebabButton />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left uppercase tracking-[0.04em] text-[#7a8ca3] border-b border-[#e8edf3]">
                      <th>ID</th>
                      <th>Title</th>
                      <th>Scope</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Due Date</th>
                      <th>Risk</th>
                      <th>Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA.plans.map((p) => (
                      <tr key={p.id} className="border-b border-[#f3f5f8] last:border-b-0 hover:bg-gray-50/40">
                        <td>
                          <Link href={`/portal/interventions/${p.id}`} className="text-emerald-700 hover:underline">{p.id}</Link>
                        </td>
                        <td className="text-[#111827]"><strong>{p.title}</strong></td>
                        <td className="text-[#374151]">{p.scope}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="grid h-4 w-4 place-items-center rounded-full text-white" style={{ backgroundColor: p.ownerColor, fontSize: "8px", fontWeight: 700 }}>
                              {p.ownerInit}
                            </span>
                            <span className="text-[#111827]"><strong>{p.owner}</strong></span>
                          </span>
                        </td>
                        <td><PlanStatusPill status={p.status} /></td>
                        <td>
                          <div className="flex items-center gap-1.5 min-w-[110px]">
                            <span className="text-[#111827]"><strong>{p.progress}%</strong></span>
                            <div className="h-1 flex-1 rounded-full bg-[#eef0f4] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: "#10b981" }} />
                            </div>
                          </div>
                        </td>
                        <td className="text-[#374151]">{p.due}</td>
                        <td><RiskDot risk={p.risk} /></td>
                        <td className="text-[#7a8ca3]">{p.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-t border-[#e8edf3] flex items-center justify-between text-[11px]">
                <span className="text-[#7a8ca3]">Showing 1 to 5 of {DATA.totalPlans} plans</span>
                <Link href="/portal/interventions?view=all" className="text-emerald-700 font-bold hover:underline">View all plans →</Link>
              </div>
            </Card>

            {/* Owner Workload + Recent Activity (side-by-side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card padded={false}>
                <div className="px-3 py-2.5 border-b border-[#e8edf3] flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-[#111827]">Owner Workload &amp; Completion</h3>
                  <KebabButton />
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-left uppercase tracking-[0.04em] text-[#7a8ca3] border-b border-[#e8edf3]">
                      <th>#</th>
                      <th>Owner</th>
                      <th>Active Plans</th>
                      <th>Avg Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA.workload.map((w) => (
                      <tr key={w.owner} className="border-b border-[#f3f5f8] last:border-b-0">
                        <td className="text-[#7a8ca3]">{w.rank}</td>
                        <td className="text-[#111827]"><strong>{w.owner}</strong></td>
                        <td className="text-[#374151]">{w.active}</td>
                        <td>
                          <div className="flex items-center gap-1.5 min-w-[100px]">
                            <span className="text-[#111827]"><strong>{w.completion}%</strong></span>
                            <div className="h-1 flex-1 rounded-full bg-[#eef0f4] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${w.completion}%`, backgroundColor: "#10b981" }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card padded={false}>
                <div className="px-3 py-2.5 border-b border-[#e8edf3] flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-[#111827]">Recent Activity Feed</h3>
                  <Link href="/portal/interventions?view=activity" className="text-[11px] font-bold text-emerald-700 hover:underline">View all →</Link>
                </div>
                <ul>
                  {DATA.activity.map((a) => (
                    <li key={a.title} className="px-3 py-2 border-b border-[#f3f5f8] last:border-b-0 flex items-start gap-2">
                      <ActivityIcon icon={a.icon} tone={a.tone} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[#374151] leading-tight">{a.title}</p>
                        <p className="text-[10px] text-[#7a8ca3] mt-0.5">{a.when}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-3 min-w-0">
            {/* Priority Queue */}
            <Card padded={false}>
              <div className="px-3 py-2.5 border-b border-[#e8edf3] flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#111827] inline-flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.75} />
                  Priority Queue
                </h3>
                <Link href="/portal/priority-queue" className="text-[11px] font-bold text-emerald-700 hover:underline">View all →</Link>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left uppercase tracking-[0.04em] text-[#7a8ca3] border-b border-[#e8edf3]">
                    <th>Plan</th>
                    <th>Issue</th>
                    <th>Risk</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.priorityQueue.map((q) => (
                    <tr key={q.plan} className="border-b border-[#f3f5f8] last:border-b-0">
                      <td className="text-[#111827]"><strong>{q.plan}</strong></td>
                      <td className="text-[#374151]">{q.issue}</td>
                      <td><RiskDot risk={q.risk} /></td>
                      <td className="text-[#374151]">{q.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Plan Actions (Next 5 Due) */}
            <Card padded={false}>
              <div className="px-3 py-2.5 border-b border-[#e8edf3] flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#111827] inline-flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
                  Plan Actions <span className="font-normal text-[#7a8ca3]">(Next 5 Due)</span>
                </h3>
                <Link href="/portal/interventions?view=actions" className="text-[11px] font-bold text-emerald-700 hover:underline">View all →</Link>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left uppercase tracking-[0.04em] text-[#7a8ca3] border-b border-[#e8edf3]">
                    <th>Action</th>
                    <th>Plan</th>
                    <th>Owner</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.planActions.map((a) => (
                    <tr key={a.action} className="border-b border-[#f3f5f8] last:border-b-0">
                      <td className="text-[#111827]"><strong>{a.action}</strong></td>
                      <td><Link href={`/portal/interventions/${a.plan}`} className="text-emerald-700 hover:underline">{a.plan}</Link></td>
                      <td className="text-[#374151]">{a.owner}</td>
                      <td className="text-[#374151]">{a.due}</td>
                      <td><ActionStatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Action Center */}
            <Card>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-[#111827] inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
                  Action Center
                </h3>
                <KebabButton />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {DATA.actionCenter.map((a) => (
                  <ActionTile key={a.label} {...a} />
                ))}
              </div>
            </Card>

            {/* Evidence & Verification */}
            <Card padded={false}>
              <div className="px-3 py-2.5 border-b border-[#e8edf3] flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#111827]">Evidence &amp; Verification</h3>
                <Link href="/portal/data-quality?tab=evidence" className="text-[11px] font-bold text-emerald-700 hover:underline">View all →</Link>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left uppercase tracking-[0.04em] text-[#7a8ca3] border-b border-[#e8edf3]">
                    <th>File / Evidence</th>
                    <th>Plan</th>
                    <th>Uploaded By</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.evidence.map((e) => (
                    <tr key={e.file} className="border-b border-[#f3f5f8] last:border-b-0">
                      <td>
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <FileToneIcon icon={e.icon} tone={e.tone} />
                          <span className="text-[#111827] truncate"><strong>{e.file}</strong></span>
                        </span>
                      </td>
                      <td><Link href={`/portal/interventions/${e.plan}`} className="text-emerald-700 hover:underline">{e.plan}</Link></td>
                      <td className="text-[#374151]">{e.uploader}</td>
                      <td className="text-[#374151]">{e.date}</td>
                      <td><EvidenceStatusPill status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        {/* ─── Insight strip ─────────────────────────────────────── */}
        <section
          className="rounded-xl border border-[#dcefe8] px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
          style={{ backgroundColor: "#f3faf6" }}
        >
          <div className="flex items-start gap-2 min-w-0">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <p className="text-[11.5px] text-[#374151] leading-snug min-w-0">
              <strong className="text-emerald-700">Intervention Insight</strong> &mdash; {DATA.insight.text}
            </p>
          </div>
          <span className="text-[10.5px] text-[#7a8ca3] whitespace-nowrap shrink-0 self-start md:self-center">
            Updated: {DATA.insight.updated}
          </span>
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
      className={`rounded-xl bg-white border border-[#e5eaf0] ${padded ? "p-3" : ""} ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.03)" }}
    >
      {children}
    </section>
  );
}

function CardTopRow({ no, title, subtitle }: { no?: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[12.5px] font-bold text-[#111827]">
          {no && <span className="text-[#94a3b8] font-semibold mr-1">{no}.</span>}
          {title}
        </h3>
        {subtitle && <p className="text-[10.5px] text-[#7a8ca3] mt-0.5">{subtitle}</p>}
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
      className="grid h-6 w-6 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50 shrink-0"
    >
      <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
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
  label, value, delta, trendUp, icon: Icon, accent,
}: {
  label: string; value: string; delta: string; trendUp: boolean | null;
  icon: LucideIcon; accent: Accent;
}) {
  const a = accentMap[accent];
  const trendClass =
    trendUp === null
      ? "text-[#7a8ca3]"
      : trendUp
        ? "text-emerald-600"
        : "text-rose-500";
  return (
    <div
      className="rounded-xl border border-[#e5eaf0] bg-white p-2.5 flex flex-col gap-1 min-h-[78px]"
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.03)" }}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full shrink-0" style={{ backgroundColor: a.bg }}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: a.fg }} />
        </span>
        <p className="text-[9.5px] font-bold text-[#7a8ca3] uppercase tracking-[0.06em] leading-tight">{label}</p>
      </div>
      <p className="text-[18px] font-extrabold text-[#111827] leading-none tracking-tight truncate">{value}</p>
      <p className={`text-[10px] font-bold mt-auto truncate ${trendClass}`}>{delta}</p>
    </div>
  );
}

/* ── Progress trend chart (line + soft fill) ──────────────────────── */

function ProgressTrendChart({ months, values }: { months: string[]; values: number[] }) {
  const w = 320, h = 130, pl = 26, pr = 8, pt = 18, pb = 20;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const yMax = 100;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 25, 50, 75, 100];
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${sx(values.length - 1).toFixed(1)} ${sy(0).toFixed(1)} L ${sx(0).toFixed(1)} ${sy(0).toFixed(1)} Z`;
  const lastIdx = values.length - 1;
  const lastX = sx(lastIdx), lastY = sy(values[lastIdx]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Intervention progress trend">
      <defs>
        <linearGradient id="ivnTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 3} y={sy(v) + 3} fontSize="8" fill="#94a3b8" textAnchor="end">{v}%</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#ivnTrendFill)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={2.5} fill="#10b981" stroke="#fff" strokeWidth={1.25} />
      ))}
      <g transform={`translate(${Math.max(lastX - 48, 4)}, ${Math.max(lastY - 30, 4)})`}>
        <rect width="48" height="24" rx="4" fill="#fff" stroke="#e5eaf0" />
        <text x="6" y="10" fontSize="8" fontWeight="700" fill="#111827">May &apos;25</text>
        <text x="6" y="20" fontSize="9" fontWeight="800" fill="#047857">{values[lastIdx]}%</text>
      </g>
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 5} fontSize="8.5" fill="#94a3b8" textAnchor="middle">{m}</text>
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
  const size = 110, stroke = 18;
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
      <text x={size / 2} y={size / 2 - 1} textAnchor="middle" fontSize="16" fontWeight="800" fill="#111827">{total}</text>
      <text x={size / 2} y={size / 2 + 11} textAnchor="middle" fontSize="8" fill="#7a8ca3">Total</text>
    </svg>
  );
}

/* ── Funnel bar (decreasing widths) ───────────────────────────────── */

function FunnelBar({ pct, color, barIndex, totalBars }: {
  pct: number; color: string; barIndex: number; totalBars: number;
}) {
  const widthPct = Math.max(pct, 8);
  const containerWidthPct = 100 - (barIndex / Math.max(totalBars, 1)) * 18;
  return (
    <div className="h-3 rounded-sm bg-[#f3f5f8] overflow-hidden" style={{ width: `${containerWidthPct}%` }}>
      <div className="h-full rounded-sm" style={{ width: `${widthPct}%`, backgroundColor: color }} />
    </div>
  );
}

/* ── Uganda coverage map (inline SVG) ─────────────────────────────── */

function UgandaCoverageMap() {
  return (
    <svg viewBox="0 0 130 140" width={100} height={108} role="img" aria-label="Uganda intervention coverage" className="shrink-0">
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

/* ── Filter helpers ────────────────────────────────────────────────── */

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-[#7a8ca3] uppercase tracking-[0.04em] mb-1">{label}</p>
      {children}
    </div>
  );
}

function SelectStub({ value }: { value: string }) {
  return (
    <div className="h-7 px-2 rounded-[6px] border border-[#e5eaf0] bg-white text-[12px] text-[#111827] flex items-center justify-between gap-1">
      <span className="truncate">{value}</span>
      <ChevronDown className="h-3 w-3 text-[#94a3b8] shrink-0" strokeWidth={1.75} />
    </div>
  );
}

function DateStub({ value }: { value: string }) {
  return (
    <div className="h-7 px-2 rounded-[6px] border border-[#e5eaf0] bg-white text-[12px] text-[#111827] flex items-center justify-between gap-1">
      <span className="truncate">{value}</span>
      <Calendar className="h-3 w-3 text-[#94a3b8] shrink-0" strokeWidth={1.75} />
    </div>
  );
}

/* ── Pills + risk dots ────────────────────────────────────────────── */

function PlanStatusPill({ status }: { status: string }) {
  const cls = status === "In Progress"
    ? "bg-blue-50 text-blue-700 border-blue-100"
    : status === "At Risk"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : status === "Approved"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
  );
}

function ActionStatusPill({ status }: { status: string }) {
  const cls = status === "Pending"
    ? "bg-orange-50 text-orange-700 border-orange-100"
    : "bg-blue-50 text-blue-700 border-blue-100";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
  );
}

function EvidenceStatusPill({ status }: { status: string }) {
  const cls = status === "Verified"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-orange-50 text-orange-700 border-orange-100";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
  );
}

function RiskDot({ risk }: { risk: string }) {
  const color = risk === "High"
    ? "#ef4444"
    : risk === "Medium"
      ? "#f59e0b"
      : "#10b981";
  return (
    <span className="inline-flex items-center gap-1.5 text-[#374151]">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {risk}
    </span>
  );
}

/* ── Activity icon ─────────────────────────────────────────────────── */

function ActivityIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    emerald: { bg: "#d1fae5", fg: "#047857" },
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
    rose:    { bg: "#fee2e2", fg: "#b91c1c" },
    orange:  { bg: "#ffedd5", fg: "#c2410c" },
    violet:  { bg: "#ede9fe", fg: "#7c3aed" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full shrink-0 mt-0.5" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3 w-3" strokeWidth={1.75} style={{ color: t.fg }} />
    </span>
  );
}

/* ── File-type icon ────────────────────────────────────────────────── */

function FileToneIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    rose:    { bg: "#fee2e2", fg: "#b91c1c" },
    emerald: { bg: "#d1fae5", fg: "#047857" },
    violet:  { bg: "#ede9fe", fg: "#7c3aed" },
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <span className="grid h-5 w-5 place-items-center rounded-md shrink-0" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3 w-3" strokeWidth={1.75} style={{ color: t.fg }} />
    </span>
  );
}

/* ── Action tile ──────────────────────────────────────────────────── */

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
    teal:    { bg: "#ccfbf1", fg: "#0f766e" },
    rose:    { bg: "#fee2e2", fg: "#b91c1c" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-lg border border-[#e5eaf0] bg-white px-1.5 py-2 hover:bg-gray-50/60 text-center"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: t.fg }} />
      </span>
      <span className="text-[10px] font-bold text-[#111827] leading-tight">{label}</span>
    </Link>
  );
}

/* Hint that imports kept for adjacent tile slots stay referenced. */
void MapPin;

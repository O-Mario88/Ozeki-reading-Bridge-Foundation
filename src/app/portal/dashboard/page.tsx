import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  getDashboardKpisPostgres,
  getSchoolScorecardPostgres,
  getActivityTrendPostgres,
  getRecentNetworkActivityPostgres,
  getImplementationCoveragePostgres,
} from "@/lib/server/postgres/repositories/portal-dashboard";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { PortalKpiCard } from "@/components/portal/dashboard/PortalKpiCard";
import { ScorecardGauge, DomainScoreCircle } from "@/components/portal/dashboard/ScorecardGauge";
import { ActivityTrendChart } from "@/components/portal/dashboard/ActivityTrendChart";
import { ImplementationCoverageDonut } from "@/components/portal/dashboard/ImplementationCoverageDonut";
import {
  Users, GraduationCap, FileText, MapPin, BookOpen, Shield, ShieldOff,
  ChevronRight, Calendar, Info, ArrowUpRight, ArrowDownRight,
  ClipboardCheck, Sparkles, PencilLine, Folder, Layers, Lightbulb,
  type LucideIcon,
} from "lucide-react";

export const metadata = { title: "Reading Command Center | Ozeki Portal" };
export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const user = await requirePortalStaffUser();

  const [kpis, scorecard, trend, activity, coverage] = await Promise.all([
    getDashboardKpisPostgres(),
    getSchoolScorecardPostgres(),
    getActivityTrendPostgres(30),
    getRecentNetworkActivityPostgres(8),
    getImplementationCoveragePostgres(),
  ]);

  // Date range: rolling 30-day window
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const fmtRange = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateRangeLabel = `${fmtRange(start)} – ${fmtRange(end)}`;

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/dashboard"
      hideFrame
      subtitle="Live reading intelligence across assessments, teaching quality, coaching, interventions, and story practice."
    >
      <div className="space-y-4 lg:space-y-6">
        {/* Page heading — Reading Command Center positioning sits above the
            date selector. The shell already shows the welcome strip with the
            updated subtitle, so the heading reinforces the focus rather than
            duplicating it. */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h1 className="text-[20px] lg:text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
              Reading Command Center
            </h1>
            <p className="text-[12.5px] text-gray-500 leading-snug mt-1 max-w-2xl">
              How is reading improving across the network — which schools need urgent reading support, what evidence proves progress, and what action must happen next?
            </p>
          </div>
        </header>

        {/* Date range selector — desktop only (not in mobile reference) */}
        <div className="hidden lg:flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{dateRangeLabel}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 rotate-90 shrink-0" strokeWidth={2} />
          </button>
        </div>

        {/* KPI strip — 7 cards (3-col on mobile per reference, 7-col on 2xl) */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-7 gap-2.5 lg:gap-3">
          <PortalKpiCard
            label="Learners Reached"
            value={kpis.learnersReached.toLocaleString()}
            subline="Total impacting"
            deltaPct={kpis.learnersDeltaPct}
            icon={Users}
            iconBg="#ecfeff" iconColor="#0e7490"
            cardBg="#f0fdff" borderColor="#cffafe"
          />
          <PortalKpiCard
            label="Trainings Logged"
            value={kpis.trainingsLogged.toLocaleString()}
            subline="All time"
            deltaPct={kpis.trainingsDeltaPct}
            icon={GraduationCap}
            iconBg="#eff6ff" iconColor="#1d4ed8"
            cardBg="#f5f8ff" borderColor="#dbeafe"
          />
          <PortalKpiCard
            label="Assessments"
            value={kpis.assessments.toLocaleString()}
            subline="Total records"
            deltaPct={kpis.assessmentsDeltaPct}
            icon={FileText}
            iconBg="#faf5ff" iconColor="#7c3aed"
            cardBg="#fbf6ff" borderColor="#ede9fe"
          />
          <PortalKpiCard
            label="School Visits"
            value={kpis.schoolVisits.toLocaleString()}
            subline="Tracking"
            deltaPct={kpis.visitsDeltaPct}
            icon={MapPin}
            iconBg="#fff7ed" iconColor="#c2410c"
            cardBg="#fffaf3" borderColor="#fed7aa"
          />
          <PortalKpiCard
            label="Story Activities"
            value={kpis.storyActivities.toLocaleString()}
            subline="Collected"
            deltaPct={kpis.storiesDeltaPct}
            icon={BookOpen}
            iconBg="#fdf4ff" iconColor="#a21caf"
            cardBg="#fefaff" borderColor="#f5d0fe"
          />
          <PortalKpiCard
            label="Implementing"
            value={`${kpis.implementingPct}%`}
            subline="Schools active"
            deltaPct={kpis.implementingDeltaPp}
            icon={Shield}
            iconBg="#ecfdf5" iconColor="#066a67"
            cardBg="#f4fdf8" borderColor="#bbf7d0"
          />
          <PortalKpiCard
            label="Not Implementing"
            value={`${kpis.notImplementingPct}%`}
            subline="Schools inactive"
            deltaPct={kpis.notImplementingDeltaPp}
            deltaPositive={false}
            icon={ShieldOff}
            iconBg="#fef2f2" iconColor="#b91c1c"
            cardBg="#fff5f5" borderColor="#fecaca"
            className="col-span-1"
          />
        </div>

        {/* Quick action cards — 2-col mobile / 4-col desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
          <QuickAction icon={GraduationCap} title="Log Training" subtitle="Record a new training" href="/portal/trainings?new=1" />
          <QuickAction icon={MapPin} title="School Visit" subtitle="Log a coaching visit" href="/portal/visits/new" />
          <QuickAction icon={ClipboardCheck} title="Assessment" subtitle="Upload learner scores" href="/portal/assessments?new=1" />
          <QuickAction icon={Sparkles} title="1001 Story" subtitle="Capture a story" href="/portal/stories?new=1" />
          <QuickAction icon={PencilLine} title="Blog Post" subtitle="Publish an update" href="/portal/blog?new=1" />
          <QuickAction icon={Folder} title="Resources" subtitle="Upload evidence" href="/portal/resources" />
          <QuickAction icon={Layers} title="Programs" subtitle="View school data" href="/portal/schools" />
          <QuickAction icon={Lightbulb} title="Insights" subtitle="View global stats" href="/portal/insights" />
        </div>

        {/* School Performance Scorecard + Activity Trend row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Scorecard */}
          <section className="lg:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-1.5">
                  School Performance Scorecard
                  <Info className="h-3.5 w-3.5 text-gray-300" strokeWidth={1.75} />
                </h2>
                <p className="text-[12px] text-gray-500 mt-1 leading-snug max-w-2xl">
                  Average score (0–10) aggregated by location. Schools scoring ≥ 8 in all areas are eligible for weaning.
                </p>
              </div>
              <Link
                href="/portal/insights"
                className="text-[12px] text-[#066a67] font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-0.5"
              >
                View full scorecard <ChevronRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </div>

            {/* Score row: gauge + 5 domain circles */}
            <div className="flex items-center gap-6 mt-4 mb-5 overflow-x-auto pb-2">
              <div className="shrink-0 flex flex-col items-center">
                <ScorecardGauge score={scorecard.overallScore} size={150} />
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2"
                  style={{
                    backgroundColor:
                      scorecard.performanceBand === "High Performance" ? "#dcfce7" :
                      scorecard.performanceBand === "Moderate Performance" ? "#dcfce7" :
                      scorecard.performanceBand === "Needs Improvement" ? "#fef3c7" : "#fee2e2",
                    color:
                      scorecard.performanceBand === "High Performance" ? "#166534" :
                      scorecard.performanceBand === "Moderate Performance" ? "#166534" :
                      scorecard.performanceBand === "Needs Improvement" ? "#92400e" : "#991b1b",
                  }}
                >
                  {scorecard.performanceBand}
                </span>
              </div>

              <div className="flex flex-1 gap-5 justify-around">
                {scorecard.domains.map((d) => (
                  <div key={d.key} className="flex flex-col items-center text-center min-w-[80px]">
                    <DomainScoreCircle score={d.score} color={d.bandColor} />
                    <p className="text-[10.5px] font-semibold text-gray-700 mt-2 leading-tight max-w-[88px]">
                      {d.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 pt-3 border-t border-gray-50">
              <LegendItem color="#ef4444" label="0–3 Low Performance" />
              <LegendItem color="#f59e0b" label="3.1–6 Needs Improvement" />
              <LegendItem color="#34d399" label="6.1–7.9 Moderate Performance" />
              <LegendItem color="#10b981" label="8–10 High Performance" />
            </div>
          </section>

          {/* Activity Trend */}
          <section className="lg:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[16px] font-bold text-gray-900">Activity Trend</h2>
              <span className="px-3 py-1 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 bg-gray-50">
                Last 30 days ▾
              </span>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniStat label="Trainings" value={trend.totals.trainings.count} delta={trend.totals.trainings.deltaPct} />
              <MiniStat label="Assessments" value={trend.totals.assessments.count} delta={trend.totals.assessments.deltaPct} />
              <MiniStat label="School Visits" value={trend.totals.schoolVisits.count} delta={trend.totals.schoolVisits.deltaPct} />
              <MiniStat label="Stories Collected" value={trend.totals.storiesCollected.count} delta={trend.totals.storiesCollected.deltaPct} />
            </div>

            <div className="-mx-2">
              <ActivityTrendChart series={trend.series} />
            </div>
          </section>
        </div>

        {/* Recent Network Activity + Coverage row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Recent Network Activity */}
          <section className="lg:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-[16px] font-bold text-gray-900">Recent Network Activity</h2>
              <span className="px-3 py-1 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 bg-gray-50">
                All Activity Types ▾
              </span>
            </div>

            {activity.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                <p className="text-[14px]">No recent activity.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <ul className="sm:hidden space-y-2">
                  {activity.map((row) => (
                    <li key={`m-${row.id}`} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white border border-gray-100 shrink-0">
                          <Users className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-[13px] text-gray-900 truncate">
                              {row.schoolName}
                            </p>
                            <StatusBadge status={row.status} />
                          </div>
                          <p className="text-[12px] text-gray-700 truncate mt-0.5">{row.type}</p>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <span className="text-[11px] text-gray-500 truncate">
                              {formatTimestamp(row.occurredAt)}
                            </span>
                            <Link
                              href={row.href}
                              className="text-[11px] text-[#066a67] font-semibold hover:underline inline-flex items-center gap-0.5 shrink-0"
                            >
                              View <ChevronRight className="h-3 w-3" strokeWidth={2} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* sm+: card-list (CSS-grid rows, no <table>) */}
                {(() => {
                  const tpl = "28px minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 110px 60px";
                  return (
                    <div className="hidden sm:block">
                      <DashboardListHeader template={tpl}>
                        <span>#</span><span>School Name</span><span>Type</span>
                        <span>Timestamp</span><span>Status</span><span className="text-right">Action</span>
                      </DashboardListHeader>
                      {activity.map((row, i) => (
                        <DashboardListRow key={row.id} template={tpl}>
                          <span className="text-[#7a8ca3]">{i + 1}</span>
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span className="grid h-6 w-6 place-items-center rounded bg-gray-100 shrink-0">
                              <Users className="h-3 w-3 text-gray-500" strokeWidth={1.75} />
                            </span>
                            <span className="text-[#111827] font-bold truncate">{row.schoolName}</span>
                          </span>
                          <span className="text-[#374151] truncate">{row.type}</span>
                          <span className="text-[#7a8ca3]">{formatTimestamp(row.occurredAt)}</span>
                          <span><StatusBadge status={row.status} /></span>
                          <span className="text-right">
                            <Link
                              href={row.href}
                              className="text-[#066a67] font-bold hover:underline inline-flex items-center gap-0.5"
                            >
                              View <ChevronRight className="h-3 w-3" strokeWidth={2} />
                            </Link>
                          </span>
                        </DashboardListRow>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            <div className="mt-3">
              <Link
                href="/portal/reports"
                className="text-[12px] text-[#066a67] font-semibold inline-flex items-center hover:underline"
              >
                View all activity <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </section>

          {/* Program Implementation Coverage */}
          <section className="lg:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <h2 className="text-[16px] font-bold text-gray-900 mb-3">Program Implementation Coverage</h2>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
              <div className="sm:col-span-2 flex items-center justify-center">
                <ImplementationCoverageDonut
                  buckets={coverage.buckets}
                  centerPct={coverage.implementingPct}
                  size={180}
                />
              </div>
              <ul className="sm:col-span-3 space-y-3">
                {coverage.buckets.map((b) => (
                  <li key={b.label} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="inline-flex items-center gap-2 text-gray-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="font-semibold">{b.label}</span>
                    </span>
                    <span className="text-gray-700 font-mono text-[12px] whitespace-nowrap">
                      <strong className="text-gray-900 text-[14px]">{b.pct}%</strong>
                      <span className="ml-2 text-gray-400">({b.count.toLocaleString()} schools)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/portal/insights"
              className="text-[12px] text-[#066a67] font-semibold mt-4 inline-flex items-center hover:underline"
            >
              View coverage details <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </section>
        </div>
      </div>
    </OzekiPortalShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function QuickAction({
  icon: Icon, title, subtitle, href,
}: {
  icon: LucideIcon; title: string; subtitle: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl lg:rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md transition-all px-2.5 py-2 lg:p-4 flex items-center gap-2 lg:gap-3"
    >
      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 transition-colors">
        <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 group-hover:text-[#066a67] transition-colors" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] lg:text-[14px] font-bold text-gray-900 leading-tight truncate">{title}</p>
        <p className="text-[10px] lg:text-[11px] text-gray-500 leading-tight mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" strokeWidth={2} />
    </Link>
  );
}

function MiniStat({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  const isUp = (delta ?? 0) >= 0;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <p className="text-[22px] font-extrabold text-gray-900 leading-none">{value}</p>
        {delta != null && (
          <span className={`inline-flex items-center text-[10px] font-bold ${isUp ? "text-[#066a67]" : "text-red-600"}`}>
            {isUp ? <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2} /> : <ArrowDownRight className="h-2.5 w-2.5" strokeWidth={2} />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const positive = s === "submitted" || s === "completed" || s === "active" || s === "approved";
  const inProgress = s === "in_progress" || s === "in progress" || s === "draft" || s === "pending";
  const negative = s === "void" || s === "cancelled" || s === "failed" || s === "missed";

  const cls = positive
    ? "bg-emerald-50 text-[#066a67] border-emerald-100"
    : inProgress
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : negative
        ? "bg-red-50 text-red-700 border-red-100"
        : "bg-gray-50 text-gray-700 border-gray-100";
  const label =
    status === "submitted"
      ? "Completed"
      : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {label}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d
      .toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      })
      .replace(",", " •");
  } catch {
    return iso;
  }
}

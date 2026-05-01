import Link from "next/link";
import { Open_Sans } from "next/font/google";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  getDashboardKpisPostgres,
  getSchoolScorecardPostgres,
  getActivityTrendPostgres,
  getRecentNetworkActivityPostgres,
  getImplementationCoveragePostgres,
} from "@/lib/server/postgres/repositories/portal-dashboard";
import { PortalKpiCard } from "@/components/portal/dashboard/PortalKpiCard";
import { ScorecardGauge, DomainScoreCircle } from "@/components/portal/dashboard/ScorecardGauge";
import { ActivityTrendChart } from "@/components/portal/dashboard/ActivityTrendChart";
import { ImplementationCoverageDonut } from "@/components/portal/dashboard/ImplementationCoverageDonut";
import { FinanceTopControls } from "@/components/portal/finance/FinanceTopControls";
import {
  Users, GraduationCap, FileText, MapPin, BookOpen, Shield, ShieldOff,
  ChevronRight, Calendar, Info, ArrowUpRight, ArrowDownRight,
  PenSquare, MapPin as VisitIcon, ClipboardCheck, Sparkles,
  PencilLine, Folder, Layers, Lightbulb,
} from "lucide-react";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-portal-open-sans",
});

export const metadata = { title: "Dashboard | Ozeki Portal" };
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

  const initials = (user.fullName ?? user.email ?? "OS")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  // Date range: rolling 30-day window ending today (matches the data fetcher window)
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const fmtRange = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateRangeLabel = `${fmtRange(start)} – ${fmtRange(end)}`;

  return (
    <PortalShell user={user} activeHref="/portal/dashboard" hideFrame>
      <div className={`${openSans.className} min-h-screen bg-[#fafaf7]`}>

        {/* Top header */}
        <header className="bg-white/70 backdrop-blur-sm border-b border-gray-100 px-6 lg:px-10 py-4">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
            <div>
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Welcome back, {user.fullName ?? "Ozeki Team"} <span aria-hidden>👋</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Here&apos;s what&apos;s happening across your literacy network today.</p>
            </div>
            <FinanceTopControls initials={initials} />
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 space-y-6">

          {/* Date range selector */}
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              {dateRangeLabel}
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-90" />
            </button>
          </div>

          {/* KPI strip — 7 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
              iconBg="#ecfdf5" iconColor="#047857"
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
            />
          </div>

          {/* Quick action cards — 8 across (4 + 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction icon={GraduationCap} title="Log Training" subtitle="Record a new training" href="/portal/trainings?new=1" />
            <QuickAction icon={VisitIcon} title="School Visit" subtitle="Log a coaching visit" href="/portal/visits/new" />
            <QuickAction icon={ClipboardCheck} title="Assessment" subtitle="Upload learner scores" href="/portal/assessments?new=1" />
            <QuickAction icon={Sparkles} title="1001 Story" subtitle="Capture a story" href="/portal/stories?new=1" />
            <QuickAction icon={PencilLine} title="Blog Post" subtitle="Publish an update" href="/portal/blog?new=1" />
            <QuickAction icon={Folder} title="Resources" subtitle="Upload evidence" href="/portal/resources" />
            <QuickAction icon={Layers} title="Programs" subtitle="View school data" href="/portal/schools" />
            <QuickAction icon={Lightbulb} title="Insights" subtitle="View global stats" href="/portal/insights" />
          </div>

          {/* Two-column: Scorecard + Activity Trend */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* School Performance Scorecard */}
            <section className="xl:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                    School Performance Scorecard
                    <Info className="w-3.5 h-3.5 text-gray-300" />
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Average score (0–10) aggregated by location. Schools scoring ≥ 8 in all areas are eligible for weaning.
                  </p>
                </div>
                <Link href="/portal/insights" className="text-xs text-emerald-700 font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                  View full scorecard <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Score row: gauge + 5 domain circles */}
              <div className="flex items-center gap-6 mt-4 mb-5 overflow-x-auto pb-2">
                <div className="shrink-0 flex flex-col items-center">
                  <ScorecardGauge score={scorecard.overallScore} size={150} />
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2"
                        style={{
                          backgroundColor: scorecard.performanceBand === "High Performance" ? "#dcfce7" :
                                           scorecard.performanceBand === "Moderate Performance" ? "#dcfce7" :
                                           scorecard.performanceBand === "Needs Improvement" ? "#fef3c7" : "#fee2e2",
                          color: scorecard.performanceBand === "High Performance" ? "#166534" :
                                 scorecard.performanceBand === "Moderate Performance" ? "#166534" :
                                 scorecard.performanceBand === "Needs Improvement" ? "#92400e" : "#991b1b",
                        }}>
                    {scorecard.performanceBand}
                  </span>
                </div>

                <div className="flex flex-1 gap-5 justify-around">
                  {scorecard.domains.map((d) => (
                    <div key={d.key} className="flex flex-col items-center text-center min-w-[80px]">
                      <DomainScoreCircle score={d.score} color={d.bandColor} />
                      <p className="text-[10.5px] font-semibold text-gray-700 mt-2 leading-tight max-w-[88px]">{d.label}</p>
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
            <section className="xl:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-base font-bold text-gray-900">Activity Trend</h2>
                <span className="px-3 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50">
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

          {/* Recent Activity + Coverage row */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* Recent Network Activity */}
            <section className="xl:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-gray-900">Recent Network Activity</h2>
                <span className="px-3 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50">
                  All Activity Types ▾
                </span>
              </div>

              {activity.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent activity.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-100">
                        <th className="px-3 py-2 font-bold w-8">#</th>
                        <th className="px-3 py-2 font-bold">School Name</th>
                        <th className="px-3 py-2 font-bold">Type</th>
                        <th className="px-3 py-2 font-bold">Timestamp</th>
                        <th className="px-3 py-2 font-bold">Status</th>
                        <th className="px-3 py-2 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((row, i) => (
                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                          <td className="px-3 py-3 text-gray-500 text-xs">{i + 1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                <Users className="w-3 h-3 text-gray-500" />
                              </div>
                              <span className="font-semibold text-gray-900">{row.schoolName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-700">{row.type}</td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                            {formatTimestamp(row.occurredAt)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link href={row.href} className="text-xs text-emerald-700 font-semibold hover:underline inline-flex items-center gap-0.5">
                              View <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3">
                <Link href="/portal/reports" className="text-xs text-emerald-700 font-semibold inline-flex items-center hover:underline">
                  View all activity <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>

            {/* Program Implementation Coverage */}
            <section className="xl:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Program Implementation Coverage</h2>

              <div className="grid grid-cols-5 gap-4 items-center">
                <div className="col-span-2 flex items-center justify-center">
                  <ImplementationCoverageDonut buckets={coverage.buckets} centerPct={coverage.implementingPct} size={180} />
                </div>
                <ul className="col-span-3 space-y-3">
                  {coverage.buckets.map((b) => (
                    <li key={b.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 text-gray-800">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                        <span className="font-semibold">{b.label}</span>
                      </span>
                      <span className="text-gray-700 font-mono text-xs whitespace-nowrap">
                        <strong className="text-gray-900 text-sm">{b.pct}%</strong>
                        <span className="ml-2 text-gray-400">({b.count.toLocaleString()} schools)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/portal/insights" className="text-xs text-emerald-700 font-semibold mt-4 inline-flex items-center hover:underline">
                View coverage details <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function QuickAction({
  icon: Icon, title, subtitle, href,
}: {
  icon: typeof PenSquare; title: string; subtitle: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md transition-all p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 transition-colors">
        <Icon className="w-5 h-5 text-gray-600 group-hover:text-emerald-700 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 leading-tight">{title}</p>
        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
    </Link>
  );
}

function MiniStat({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  const isUp = (delta ?? 0) >= 0;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        {delta != null && (
          <span className={`inline-flex items-center text-[10px] font-bold ${isUp ? "text-emerald-700" : "text-red-600"}`}>
            {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
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
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
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
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : inProgress
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : negative
        ? "bg-red-50 text-red-700 border-red-100"
        : "bg-gray-50 text-gray-700 border-gray-100";
  const label = status === "submitted" ? "Completed" : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

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
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(",", " •");
  } catch {
    return iso;
  }
}

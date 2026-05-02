import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  getDashboardKpisPostgres,
  getSchoolScorecardPostgres,
  getActivityTrendPostgres,
  getRecentNetworkActivityPostgres,
  getImplementationCoveragePostgres,
} from "@/lib/server/postgres/repositories/portal-dashboard";
import { ScorecardGauge, DomainScoreCircle } from "@/components/portal/dashboard/ScorecardGauge";
import { ActivityTrendChart } from "@/components/portal/dashboard/ActivityTrendChart";
import { ImplementationCoverageDonut } from "@/components/portal/dashboard/ImplementationCoverageDonut";
import {
  GlassDashboardShell,
  GlassTopBar,
  GlassTopControls,
  GlassCard,
  GlassMetricCard,
  GlassQuickAction,
} from "@/components/portal/glass-dashboard-shell";
import {
  Users, GraduationCap, FileText, MapPin as VisitIcon, BookOpen, Shield, ShieldOff,
  ChevronRight, Calendar, Info,
  ArrowUpRight, ArrowDownRight, Layers, Lightbulb,
  ClipboardCheck, Sparkles, PencilLine, Folder,
} from "lucide-react";

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

  // Date range: rolling 30-day window ending today
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const fmtRange = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateRangeLabel = `${fmtRange(start)} – ${fmtRange(end)}`;

  return (
    <GlassDashboardShell user={user} activeHref="/portal/dashboard">
      <div className="space-y-5">
        {/* Mobile-only welcome line — the shell's MobileHeader handles nav */}
        <div className="lg:hidden">
          <h1 className="text-[22px] font-bold tracking-tight text-[#111111] leading-tight">
            Welcome back, {user.fullName ?? "Ozeki Team"}
          </h1>
          <p className="text-[13px] text-[#6B6E76] leading-snug mt-1">
            Here&apos;s what&apos;s happening across your literacy network today.
          </p>
        </div>

        {/* Desktop top bar with welcome + controls */}
        <div className="hidden lg:block">
          <GlassTopBar
            greeting={`Welcome back, ${user.fullName ?? "Ozeki Team"}`}
            subtitle="Here's what's happening across your literacy network today."
            controls={<GlassTopControls initials={initials} />}
          />
        </div>

        {/* Date range selector */}
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[13px] font-semibold text-[#111111] shadow-[0_10px_28px_rgba(10,10,10,0.06)] hover:bg-white transition whitespace-nowrap"
          >
            <Calendar className="h-4 w-4 text-[#6B6E76] shrink-0" strokeWidth={1.75} />
            <span className="truncate">{dateRangeLabel}</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6B6E76] rotate-90 shrink-0" strokeWidth={2} />
          </button>
        </div>

        {/* KPI strip — 7 cards. Mobile: horizontal scroll. md/lg: 4-col grid
            (wraps to 2 rows = 4+3). 2xl: single 7-col row. */}
        <div className="md:grid md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 md:gap-3 -mx-4 md:mx-0 px-4 md:px-0 flex gap-3 overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0 snap-x snap-mandatory md:snap-none">
          {[
            <GlassMetricCard
              key="learners"
              label="Learners Reached"
              value={kpis.learnersReached.toLocaleString()}
              subline="Total impacting"
              deltaPct={kpis.learnersDeltaPct}
              icon={Users}
              className="snap-start min-w-[170px] md:min-w-0"
            />,
            <GlassMetricCard
              key="trainings"
              label="Trainings Logged"
              value={kpis.trainingsLogged.toLocaleString()}
              subline="All time"
              deltaPct={kpis.trainingsDeltaPct}
              icon={GraduationCap}
              className="snap-start min-w-[170px] md:min-w-0"
            />,
            <GlassMetricCard
              key="assessments"
              label="Assessments"
              value={kpis.assessments.toLocaleString()}
              subline="Total records"
              deltaPct={kpis.assessmentsDeltaPct}
              icon={FileText}
              className="snap-start min-w-[170px] md:min-w-0"
            />,
            <GlassMetricCard
              key="visits"
              label="School Visits"
              value={kpis.schoolVisits.toLocaleString()}
              subline="Tracking"
              deltaPct={kpis.visitsDeltaPct}
              icon={VisitIcon}
              className="snap-start min-w-[170px] md:min-w-0"
            />,
            <GlassMetricCard
              key="stories"
              label="Story Activities"
              value={kpis.storyActivities.toLocaleString()}
              subline="Collected"
              deltaPct={kpis.storiesDeltaPct}
              icon={BookOpen}
              className="snap-start min-w-[170px] md:min-w-0"
            />,
            <GlassMetricCard
              key="implementing"
              label="Implementing"
              value={`${kpis.implementingPct}%`}
              subline="Schools active"
              deltaPct={kpis.implementingDeltaPp}
              icon={Shield}
              accentDot="#0F8F6B"
              className="snap-start min-w-[170px] md:min-w-0"
            />,
            <GlassMetricCard
              key="notImplementing"
              label="Not Implementing"
              value={`${kpis.notImplementingPct}%`}
              subline="Schools inactive"
              deltaPct={kpis.notImplementingDeltaPp}
              deltaPositive={false}
              icon={ShieldOff}
              accentDot="#DC2626"
              className="snap-start min-w-[170px] md:min-w-0"
            />,
          ]}
        </div>

        {/* Quick action cards — 2-col on mobile, 4-col on lg+ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <GlassQuickAction icon={GraduationCap} title="Log Training" subtitle="Record a new training" href="/portal/trainings?new=1" />
          <GlassQuickAction icon={VisitIcon} title="School Visit" subtitle="Log a coaching visit" href="/portal/visits/new" />
          <GlassQuickAction icon={ClipboardCheck} title="Assessment" subtitle="Upload learner scores" href="/portal/assessments?new=1" />
          <GlassQuickAction icon={Sparkles} title="1001 Story" subtitle="Capture a story" href="/portal/stories?new=1" />
          <GlassQuickAction icon={PencilLine} title="Blog Post" subtitle="Publish an update" href="/portal/blog?new=1" />
          <GlassQuickAction icon={Folder} title="Resources" subtitle="Upload evidence" href="/portal/resources" />
          <GlassQuickAction icon={Layers} title="Programs" subtitle="View school data" href="/portal/schools" />
          <GlassQuickAction icon={Lightbulb} title="Insights" subtitle="View global stats" href="/portal/insights" />
        </div>

        {/* Two-column: Scorecard + Activity Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* School Performance Scorecard */}
          <GlassCard className="lg:col-span-7 p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-[18px] font-bold text-[#111111] flex items-center gap-1.5 tracking-tight">
                  School Performance Scorecard
                  <Info className="h-3.5 w-3.5 text-[#6B6E76]" strokeWidth={1.75} />
                </h2>
                <p className="text-[12px] text-[#6B6E76] mt-1 leading-snug">
                  Average score (0–10) aggregated by location. Schools scoring ≥ 8 in all areas are eligible for weaning.
                </p>
              </div>
              <Link
                href="/portal/insights"
                className="text-[12px] font-semibold text-[#111111] underline-offset-2 hover:underline whitespace-nowrap inline-flex items-center gap-0.5"
              >
                View full scorecard <ChevronRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-4 mb-5 overflow-x-auto pb-2">
              <div className="shrink-0 flex flex-col items-center">
                <ScorecardGauge score={scorecard.overallScore} size={150} />
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2"
                  style={{
                    backgroundColor: scorecard.performanceBand === "High Performance" ? "#dcfce7" :
                      scorecard.performanceBand === "Moderate Performance" ? "#dcfce7" :
                        scorecard.performanceBand === "Needs Improvement" ? "#fef3c7" : "#fee2e2",
                    color: scorecard.performanceBand === "High Performance" ? "#166534" :
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
                    <p className="text-[10.5px] font-semibold text-[#35383F] mt-2 leading-tight max-w-[88px]">
                      {d.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-[10px] text-[#6B6E76] pt-3 border-t border-[#14141414]">
              <LegendItem color="#ef4444" label="0–3 Low Performance" />
              <LegendItem color="#f59e0b" label="3.1–6 Needs Improvement" />
              <LegendItem color="#34d399" label="6.1–7.9 Moderate Performance" />
              <LegendItem color="#10b981" label="8–10 High Performance" />
            </div>
          </GlassCard>

          {/* Activity Trend */}
          <GlassCard className="lg:col-span-5 p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[18px] font-bold text-[#111111] tracking-tight">Activity Trend</h2>
              <span className="px-3 h-8 inline-flex items-center rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[12px] font-semibold text-[#222]">
                Last 30 days ▾
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniStat label="Trainings" value={trend.totals.trainings.count} delta={trend.totals.trainings.deltaPct} />
              <MiniStat label="Assessments" value={trend.totals.assessments.count} delta={trend.totals.assessments.deltaPct} />
              <MiniStat label="School Visits" value={trend.totals.schoolVisits.count} delta={trend.totals.schoolVisits.deltaPct} />
              <MiniStat label="Stories Collected" value={trend.totals.storiesCollected.count} delta={trend.totals.storiesCollected.deltaPct} />
            </div>

            <div className="-mx-2">
              <ActivityTrendChart series={trend.series} />
            </div>
          </GlassCard>
        </div>

        {/* Recent Activity + Coverage row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Recent Network Activity */}
          <GlassCard className="lg:col-span-7 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-[18px] font-bold text-[#111111] tracking-tight">Recent Network Activity</h2>
              <span className="px-3 h-8 inline-flex items-center rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[12px] font-semibold text-[#222]">
                All Activity Types ▾
              </span>
            </div>

            {activity.length === 0 ? (
              <div className="py-12 text-center text-[#6B6E76]">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                <p className="text-[14px]">No recent activity.</p>
              </div>
            ) : (
              <>
                {/* Mobile: stacked cards (<sm) */}
                <ul className="sm:hidden space-y-2">
                  {activity.map((row) => (
                    <li
                      key={`m-${row.id}`}
                      className="rounded-2xl border border-white/70 bg-white/65 p-3 backdrop-blur-xl shadow-[0_8px_22px_rgba(10,10,10,0.06)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white border border-white/70 shrink-0">
                          <Users className="h-4 w-4 text-[#202124]" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-[14px] text-[#111111] truncate">
                              {row.schoolName}
                            </p>
                            <StatusBadge status={row.status} />
                          </div>
                          <p className="text-[12px] text-[#35383F] truncate mt-0.5">{row.type}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <span className="text-[11px] text-[#6B6E76] truncate">
                              {formatTimestamp(row.occurredAt)}
                            </span>
                            <Link
                              href={row.href}
                              className="text-[12px] font-semibold text-[#111111] hover:underline inline-flex items-center gap-0.5 shrink-0"
                            >
                              View <ChevronRight className="h-3 w-3" strokeWidth={2} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* sm+: regular table with horizontal scroll fallback */}
                <div className="hidden sm:block overflow-x-auto -mx-2">
                  <table className="w-full text-[14px] min-w-[700px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-[#6B6E76] border-b border-[#14141414]">
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
                        <tr key={row.id} className="border-b border-[#14141408] hover:bg-white/40 transition">
                          <td className="px-3 py-3 text-[#6B6E76] text-[12px]">{i + 1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-7 w-7 place-items-center rounded-xl bg-white/70 border border-white/70 shrink-0">
                                <Users className="h-3.5 w-3.5 text-[#202124]" strokeWidth={1.75} />
                              </div>
                              <span className="font-semibold text-[#111111]">{row.schoolName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[#35383F]">{row.type}</td>
                          <td className="px-3 py-3 text-[#6B6E76] whitespace-nowrap text-[12px]">
                            {formatTimestamp(row.occurredAt)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={row.href}
                              className="text-[12px] font-semibold text-[#111111] hover:underline inline-flex items-center gap-0.5"
                            >
                              View <ChevronRight className="h-3 w-3" strokeWidth={2} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-3">
              <Link
                href="/portal/reports"
                className="text-[12px] font-semibold text-[#111111] inline-flex items-center hover:underline"
              >
                View all activity <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </GlassCard>

          {/* Program Implementation Coverage */}
          <GlassCard className="lg:col-span-5 p-6">
            <h2 className="text-[18px] font-bold text-[#111111] mb-3 tracking-tight">
              Program Implementation Coverage
            </h2>

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
                    <span className="inline-flex items-center gap-2 text-[#35383F]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="font-semibold">{b.label}</span>
                    </span>
                    <span className="text-[#35383F] font-mono text-[12px] whitespace-nowrap">
                      <strong className="text-[#111111] text-[14px]">{b.pct}%</strong>
                      <span className="ml-2 text-[#6B6E76]">({b.count.toLocaleString()} schools)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/portal/insights"
              className="text-[12px] font-semibold text-[#111111] mt-4 inline-flex items-center hover:underline"
            >
              View coverage details <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </GlassCard>
        </div>
      </div>
    </GlassDashboardShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function MiniStat({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  const isUp = (delta ?? 0) >= 0;
  return (
    <div>
      <p className="text-[10px] font-bold text-[#6B6E76] uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <p className="text-[24px] font-extrabold text-[#111111] leading-none">{value}</p>
        {delta != null && (
          <span className={`inline-flex items-center text-[10px] font-bold ${isUp ? "text-[#0F8F6B]" : "text-[#DC2626]"}`}>
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
    ? "bg-[#0F8F6B]/10 text-[#0F8F6B] border-[#0F8F6B]/20"
    : inProgress
      ? "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20"
      : negative
        ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20"
        : "bg-white/65 text-[#35383F] border-white/70";
  const label = status === "submitted"
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

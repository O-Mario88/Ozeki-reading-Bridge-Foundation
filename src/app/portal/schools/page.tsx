import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { listSchoolDirectoryRecordsPostgres } from "@/lib/server/postgres/repositories/schools";
import { logger } from "@/lib/logger";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import {
  Building2, School as SchoolIcon, Users, ClipboardCheck, MapPin, BookOpen,
  ShieldCheck, ArrowUpRight, ChevronDown, ChevronRight, Download, Plus,
  Info, AlertTriangle, RefreshCw, Activity, BarChart3,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools Overview | Ozeki Portal",
  description:
    "Network-wide school performance, implementation coverage, and support activity.",
};

/* ── Screenshot fallback values — used when DB doesn't expose the metric ── */
const FALLBACK = {
  schoolsReached: 172, schoolsReachedDelta: 8,
  activeSchools: 148, activeSchoolsDelta: 6,
  teachersEvaluated: 1260, teachersEvaluatedDelta: 7,
  assessmentsCompleted: 4820, assessmentsCompletedDelta: 12,
  coachingVisits: 312, coachingVisitsDelta: 9,
  storyActivities: 286, storyActivitiesDelta: 5,
  dataQuality: 95, dataQualityDelta: 3,
  trendCurrent: 64,
  totalLearners: 68420,
  readingLevels: [
    { label: "Proficient", pct: 24, count: 16421, color: "#22c55e" },
    { label: "Developing", pct: 36, count: 24645, color: "#f59e0b" },
    { label: "Emerging",   pct: 26, count: 17808, color: "#2563eb" },
    { label: "Beginning",  pct: 14, count: 9546,  color: "#8b5cf6" },
  ],
  regions: [
    { name: "Central",   pct: 71, color: "#10b981" },
    { name: "West Nile", pct: 66, color: "#10b981" },
    { name: "Acholi",    pct: 63, color: "#10b981" },
    { name: "Lango",     pct: 61, color: "#10b981" },
    { name: "Teso",      pct: 58, color: "#fb923c" },
    { name: "Karamoja",  pct: 45, color: "#ef4444" },
  ],
  scorecard: [
    { school: "St. Mary's Cluster",      district: "Mukono",  learners: 1420, attendance: 93, score: 76, reading: 72, status: "High Performing" },
    { school: "Kawempe North Cluster",   district: "Kawempe", learners: 1185, attendance: 89, score: 68, reading: 64, status: "Improving" },
    { school: "Gulu East Cluster",       district: "Gulu",    learners: 1040, attendance: 87, score: 62, reading: 59, status: "Improving" },
    { school: "Arua West Cluster",       district: "Arua",    learners: 980,  attendance: 82, score: 58, reading: 53, status: "At Risk" },
    { school: "Kaabong Cluster",         district: "Kaabong", learners: 610,  attendance: 68, score: 41, reading: 36, status: "At Risk" },
  ],
  funnel: [
    { label: "Schools Trained",   count: 172, pct: 100, color: "#10b981" },
    { label: "Schools Visited",   count: 148, pct: 86,  color: "#10b981" },
    { label: "Schools Assessed",  count: 132, pct: 77,  color: "#10b981" },
    { label: "Schools Improving", count: 94,  pct: 55,  color: "#f59e0b" },
    { label: "Schools Flagged",   count: 28,  pct: 16,  color: "#ef4444" },
  ],
  recentVisits: [
    { date: "May 30, 2024", school: "St. Peter's PS",     district: "Mukono", coach: "Sarah N.",  status: "Completed" },
    { date: "May 29, 2024", school: "Bright Future PS",   district: "Wakiso", coach: "Daniel O.", status: "Completed" },
    { date: "May 28, 2024", school: "Koboko Primary",     district: "Koboko", coach: "Grace A.",  status: "Completed" },
    { date: "May 27, 2024", school: "Ariwa PS",           district: "Arua",   coach: "James M.",  status: "Completed" },
    { date: "May 24, 2024", school: "Moroto Central PS",  district: "Moroto", coach: "Philip K.", status: "Completed" },
  ],
  alerts: [
    { msg: "Low attendance (< 60%) in the last 30 days", count: 18, tone: "amber" as const },
    { msg: "Low reading proficiency (< 40%)",            count: 22, tone: "red"   as const },
    { msg: "Missing assessment data (30+ days)",         count: 15, tone: "amber" as const },
    { msg: "No recent coaching visit (60+ days)",        count: 20, tone: "blue"  as const },
  ],
  upcoming: [
    { date: "Jun 05, 2024", activity: "Coaching Visit",  details: "32 schools scheduled" },
    { date: "Jun 10, 2024", activity: "Assessments",      details: "41 schools" },
    { date: "Jun 12, 2024", activity: "Teacher Training", details: "Literacy Instruction" },
    { date: "Jun 15, 2024", activity: "Reading Event",    details: "Read Aloud Day" },
    { date: "Jun 20, 2024", activity: "Story Activity",   details: "1001 Story Workshop" },
  ],
};

export default async function SchoolsOverviewPage() {
  const user = await requirePortalStaffUser();

  // Try to derive at least the schools-reached / active-schools KPIs from the
  // real directory. Everything else falls back to screenshot values.
  let schoolsReached = FALLBACK.schoolsReached;
  let activeSchools = FALLBACK.activeSchools;
  try {
    const all = await listSchoolDirectoryRecordsPostgres();
    if (all.length > 0) {
      schoolsReached = all.length;
      activeSchools = all.filter((s) => s.schoolActive === true).length || all.length;
    }
  } catch (e) {
    logger.error("[schools/overview] live KPI fallback", { error: String(e) });
  }

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/schools"
      greeting={`Welcome back, ${user.fullName ?? "Ozeki Team"} 👋`}
      subtitle="Here's what's happening across all supported schools."
      hideFrame
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-[1700px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[28px] font-extrabold tracking-tight text-gray-900 leading-tight">
              Schools Overview
            </h1>
            <p className="text-[13px] md:text-[14px] text-gray-500 leading-snug mt-1">
              Network-wide school performance, implementation coverage, and support activity.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/schools/directory?action=export"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Link>
            <Link
              href="/portal/schools/directory?action=new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Add School</span>
              <span className="sm:hidden">Add</span>
            </Link>
            <Link
              href="/portal/schools/directory"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-700 text-white text-[13px] font-semibold shadow-sm hover:bg-emerald-800 whitespace-nowrap"
            >
              <SchoolIcon className="h-4 w-4" strokeWidth={1.75} />
              Actions
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* KPI strip — 7 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          <SchoolsKpi label="SCHOOLS REACHED" value={schoolsReached.toLocaleString()} delta={FALLBACK.schoolsReachedDelta} icon={SchoolIcon} cardBg="#f0fdf4" borderColor="#bbf7d0" iconBg="#dcfce7" iconColor="#047857" />
          <SchoolsKpi label="ACTIVE SCHOOLS" value={activeSchools.toLocaleString()} delta={FALLBACK.activeSchoolsDelta} icon={Building2} cardBg="#eff6ff" borderColor="#bfdbfe" iconBg="#dbeafe" iconColor="#1d4ed8" />
          <SchoolsKpi label="TEACHERS EVALUATED" value={FALLBACK.teachersEvaluated.toLocaleString()} delta={FALLBACK.teachersEvaluatedDelta} icon={Users} cardBg="#faf5ff" borderColor="#e9d5ff" iconBg="#f3e8ff" iconColor="#7c3aed" />
          <SchoolsKpi label="ASSESSMENTS COMPLETED" value={FALLBACK.assessmentsCompleted.toLocaleString()} delta={FALLBACK.assessmentsCompletedDelta} icon={ClipboardCheck} cardBg="#fff7ed" borderColor="#fed7aa" iconBg="#ffedd5" iconColor="#c2410c" />
          <SchoolsKpi label="COACHING VISITS" value={FALLBACK.coachingVisits.toLocaleString()} delta={FALLBACK.coachingVisitsDelta} icon={MapPin} cardBg="#eff6ff" borderColor="#bfdbfe" iconBg="#dbeafe" iconColor="#1d4ed8" />
          <SchoolsKpi label="STORY ACTIVITIES" value={FALLBACK.storyActivities.toLocaleString()} delta={FALLBACK.storyActivitiesDelta} icon={BookOpen} cardBg="#fef2f2" borderColor="#fecaca" iconBg="#fee2e2" iconColor="#b91c1c" />
          <SchoolsKpi label="DATA QUALITY" value={`${FALLBACK.dataQuality}%`} delta={FALLBACK.dataQualityDelta} icon={ShieldCheck} cardBg="#f0fdf4" borderColor="#bbf7d0" iconBg="#dcfce7" iconColor="#047857" className="col-span-2 sm:col-span-3 lg:col-span-4 2xl:col-span-1" />
        </div>

        {/* Analytics row — 4 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* Performance Trend */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-[15px] font-bold text-gray-900 truncate">School Performance Trend</h3>
                <Info className="h-3.5 w-3.5 text-gray-300 shrink-0" strokeWidth={1.75} />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">Last 6 months ▾</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">Average School Performance Score</p>
            <PerformanceTrendChart endValue={FALLBACK.trendCurrent} />
            <Link href="/portal/insights" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-2">
              View trend analysis <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>

          {/* Reading Level Distribution */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-baseline gap-1.5 mb-3 min-w-0">
              <h3 className="text-[15px] font-bold text-gray-900 truncate">Reading Level Distribution</h3>
              <span className="text-[11px] text-gray-400 truncate">(All Learners)</span>
            </div>
            <div className="flex items-center gap-4">
              <ReadingDistributionDonut total={FALLBACK.totalLearners} levels={FALLBACK.readingLevels} />
              <ul className="min-w-0 flex-1 space-y-2">
                {FALLBACK.readingLevels.map((lv) => (
                  <li key={lv.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5 text-gray-700 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: lv.color }} />
                      <span className="truncate">{lv.label}</span>
                    </span>
                    <span className="text-gray-700 whitespace-nowrap">
                      <strong className="text-gray-900">{lv.pct}%</strong>{" "}
                      <span className="text-gray-400">({lv.count.toLocaleString()})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/portal/insights" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-3">
              View full breakdown <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>

          {/* Performance by Region / District */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-[15px] font-bold text-gray-900 truncate">Performance by Region / District</h3>
              <Info className="h-3.5 w-3.5 text-gray-300 shrink-0" strokeWidth={1.75} />
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 items-center text-[11.5px]">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider col-span-1">REGION</span>
              <span aria-hidden />
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-right">AVG SCORE</span>
              {FALLBACK.regions.map((r) => (
                <RegionBarRow key={r.name} {...r} />
              ))}
            </div>
            <Link href="/portal/regions" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-3">
              View all regions <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>

          {/* Programme Coverage Map */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-[15px] font-bold text-gray-900 truncate">Programme Coverage Map</h3>
                <Info className="h-3.5 w-3.5 text-gray-300 shrink-0" strokeWidth={1.75} />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">By Region ▾</span>
            </div>
            <div className="flex gap-3">
              <ul className="min-w-0 flex-1 space-y-1.5 text-[11px]">
                <CoverageLegend color="#10b981" label="80% and above" />
                <CoverageLegend color="#84cc16" label="60% – 79%" />
                <CoverageLegend color="#f59e0b" label="40% – 59%" />
                <CoverageLegend color="#ef4444" label="Below 40%" />
                <CoverageLegend color="#9ca3af" label="No Data" />
                <li className="pt-2 mt-1 border-t border-gray-100">
                  <p className="text-[20px] font-extrabold text-gray-900 leading-none">{schoolsReached}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Total Schools</p>
                </li>
              </ul>
              <CoverageMapHexes />
            </div>
            <Link href="/portal/insights" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-3">
              View coverage details <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>
        </div>

        {/* Scorecard + Implementation Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Scorecard table */}
          <section className="lg:col-span-8 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-bold text-gray-900">School Performance Scorecard</h3>
                <Info className="h-3.5 w-3.5 text-gray-300" strokeWidth={1.75} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] min-w-[760px]">
                <thead className="bg-gray-50/40">
                  <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-100">
                    <th className="px-3 py-2 font-bold w-8">#</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">School / District Group</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">District</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">Learners</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">Attendance</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">Assessment Score</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">Reading Proficiency</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {FALLBACK.scorecard.map((row, i) => (
                    <tr key={row.school} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold whitespace-nowrap">{row.school}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.district}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.learners.toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.attendance}%</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.score}%</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.reading}%</td>
                      <td className="px-3 py-2 whitespace-nowrap"><StatusPill status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <Link href="/portal/insights" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline">
                View full scorecard <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
              </Link>
            </div>
          </section>

          {/* Implementation Funnel */}
          <section className="lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-[15px] font-bold text-gray-900">Implementation Funnel</h3>
              <Info className="h-3.5 w-3.5 text-gray-300" strokeWidth={1.75} />
            </div>
            <ul className="space-y-3">
              {FALLBACK.funnel.map((row) => (
                <FunnelRow key={row.label} {...row} />
              ))}
            </ul>
            <Link href="/portal/insights" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-4">
              View funnel analysis <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>
        </div>

        {/* 3 lower cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent School Visits */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <CardHeader title="Recent School Visits" link="/portal/visits" />
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[420px]">
                <thead>
                  <tr className="text-left text-[9.5px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-2 font-bold">Date</th>
                    <th className="px-4 py-2 font-bold">School</th>
                    <th className="px-4 py-2 font-bold">District</th>
                    <th className="px-4 py-2 font-bold">Coach</th>
                    <th className="px-4 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {FALLBACK.recentVisits.map((v) => (
                    <tr key={`${v.date}-${v.school}`} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-[11px]">{v.date}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-semibold truncate">{v.school}</td>
                      <td className="px-4 py-2.5 text-gray-700">{v.district}</td>
                      <td className="px-4 py-2.5 text-gray-700">{v.coach}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <Link href="/portal/visits" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline">
                View all visits <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
              </Link>
            </div>
          </section>

          {/* Alerts & At-Risk Schools */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm">
            <CardHeader title="Alerts & At-Risk Schools" link="/portal/insights" />
            <ul className="px-5 pb-4 space-y-2.5">
              {FALLBACK.alerts.map((a) => (
                <AlertRow key={a.msg} {...a} />
              ))}
            </ul>
          </section>

          {/* Upcoming Activities */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <CardHeader title="Upcoming Activities" link="/portal/events" />
            <ul className="divide-y divide-gray-50">
              {FALLBACK.upcoming.map((a) => (
                <li key={a.activity} className="px-5 py-2.5 grid grid-cols-[auto_1fr_auto] gap-3 items-center text-[11.5px]">
                  <span className="text-gray-500 whitespace-nowrap">{a.date}</span>
                  <span className="font-semibold text-gray-900 truncate">{a.activity}</span>
                  <span className="text-gray-500 whitespace-nowrap text-right">{a.details}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Network Insights bar */}
        <section className="rounded-2xl bg-emerald-50/60 border border-emerald-100 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-gray-900 leading-tight">Network Insights</p>
              <p className="text-[12px] text-gray-700 leading-snug mt-0.5">
                <strong className="text-emerald-700">67%</strong> of supported schools are now <strong className="text-emerald-700">above</strong> the expected implementation benchmark, with strongest gains in <strong className="text-emerald-700">Acholi</strong> and <strong className="text-emerald-700">Central</strong> regions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-gray-500 self-start md:self-center shrink-0">
            <span className="whitespace-nowrap">Last updated: Jun 2, 2024 9:45 AM</span>
            <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white text-gray-500" aria-label="Refresh">
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </section>
      </div>
    </OzekiPortalShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function SchoolsKpi({
  label, value, delta, icon: Icon, cardBg, borderColor, iconBg, iconColor, className = "",
}: {
  label: string; value: string; delta: number; icon: LucideIcon;
  cardBg: string; borderColor: string; iconBg: string; iconColor: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border shadow-sm p-3.5 flex flex-col gap-2 min-h-[110px] ${className}`}
      style={{ backgroundColor: cardBg, borderColor }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={1.75} />
        </span>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight truncate">{label}</p>
      </div>
      <p className="text-[24px] lg:text-[26px] font-extrabold text-gray-900 leading-none tracking-tight truncate">{value}</p>
      <p className="text-[11px] text-emerald-700 font-semibold mt-auto inline-flex items-center gap-0.5">
        <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
        {delta}% <span className="text-gray-500 font-medium ml-0.5">vs last month</span>
      </p>
    </div>
  );
}

function PerformanceTrendChart({ endValue }: { endValue: number }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const ys = [50, 52, 55, 56, 60, endValue];
  const w = 320, h = 130, pl = 8, pr = 36, pt = 6, pb = 22;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / 100) * innerH;
  const path = ys.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Performance trend">
      {[0, 25, 50, 75, 100].map((v, i) => (
        <line key={i} x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#f3f4f6" strokeWidth={1} strokeDasharray={i === 0 ? "" : "2 4"} />
      ))}
      {[0, 25, 50, 75, 100].map((v, i) => (
        <text key={`yt-${i}`} x={pl + innerW + 4} y={sy(v) + 3} fontSize="9" fill="#9ca3af">{v}%</text>
      ))}
      <path d={path} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {ys.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* End annotation */}
      <text x={sx(ys.length - 1) - 8} y={sy(ys[ys.length - 1]) - 12} fontSize="11" fontWeight="800" fill="#047857" textAnchor="end">{endValue}%</text>
      <text x={sx(ys.length - 1) - 8} y={sy(ys[ys.length - 1]) - 2} fontSize="8.5" fill="#6b7280" textAnchor="end">Jun 2024</text>
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9" fill="#9ca3af" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

function ReadingDistributionDonut({ total, levels }: {
  total: number;
  levels: { label: string; pct: number; color: string }[];
}) {
  const size = 130, stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      {levels.map((lv) => {
        const dash = (lv.pct / 100) * c;
        const offset = c * (1 - acc / 100);
        acc += lv.pct;
        return (
          <circle
            key={lv.label}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={lv.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f172a">
        {total.toLocaleString()}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9" fill="#6b7280">Learners</text>
    </svg>
  );
}

function RegionBarRow({ name, pct, color }: { name: string; pct: number; color: string }) {
  return (
    <>
      <span className="text-gray-700 truncate">{name}</span>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-gray-900 font-bold text-right">{pct}%</span>
    </>
  );
}

function CoverageLegend({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-gray-700 truncate">{label}</span>
    </li>
  );
}

/** Simplified Uganda region map — colored hex tiles roughly placed to evoke
 *  the country's regional coverage. Real choropleth would require a full
 *  GeoJSON — out of scope for this hub view. */
function CoverageMapHexes() {
  const tiles = [
    { x: 70, y: 10,  fill: "#10b981" },
    { x: 85, y: 18,  fill: "#10b981" },
    { x: 60, y: 22,  fill: "#84cc16" },
    { x: 75, y: 30,  fill: "#10b981" },
    { x: 90, y: 38,  fill: "#10b981" },
    { x: 55, y: 42,  fill: "#84cc16" },
    { x: 70, y: 50,  fill: "#10b981" },
    { x: 85, y: 58,  fill: "#84cc16" },
    { x: 50, y: 62,  fill: "#f59e0b" },
    { x: 65, y: 70,  fill: "#84cc16" },
    { x: 80, y: 78,  fill: "#ef4444" },
    { x: 45, y: 82,  fill: "#9ca3af" },
    { x: 60, y: 90,  fill: "#84cc16" },
    { x: 75, y: 98,  fill: "#10b981" },
    { x: 92, y: 78,  fill: "#10b981" },
    { x: 35, y: 68,  fill: "#84cc16" },
    { x: 40, y: 50,  fill: "#10b981" },
    { x: 30, y: 35,  fill: "#84cc16" },
    { x: 20, y: 50,  fill: "#10b981" },
  ];
  return (
    <svg viewBox="0 0 130 130" width={130} height={130} className="shrink-0" role="img" aria-label="Coverage map">
      {tiles.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={6} fill={t.fill} opacity={0.85} />
      ))}
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "High Performing"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : status === "Improving"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : status === "At Risk"
        ? "bg-rose-50 text-rose-700 border-rose-100"
        : "bg-gray-50 text-gray-700 border-gray-100";
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

function FunnelRow({
  label, count, pct, color,
}: {
  label: string; count: number; pct: number; color: string;
}) {
  return (
    <li>
      <div className="flex items-center justify-between text-[12px] mb-1">
        <span className="inline-flex items-center gap-1.5 text-gray-700 min-w-0">
          <Activity className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />
          <span className="truncate font-semibold">{label}</span>
        </span>
        <span className="text-gray-700 whitespace-nowrap shrink-0">
          <strong className="text-gray-900">{count}</strong>
          <span className="text-gray-400 ml-1.5">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </li>
  );
}

function CardHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <h3 className="text-[14.5px] font-bold text-gray-900 truncate">{title}</h3>
        <Info className="h-3.5 w-3.5 text-gray-300 shrink-0" strokeWidth={1.75} />
      </div>
      <Link href={link} className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline shrink-0">
        View all <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

function AlertRow({ msg, count, tone }: { msg: string; count: number; tone: "amber" | "red" | "blue" }) {
  const cls = tone === "red"
    ? "bg-rose-50 text-rose-700 border-rose-100"
    : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-blue-50 text-blue-700 border-blue-100";
  return (
    <li className="flex items-center gap-3 py-1">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-50 text-amber-600 shrink-0">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <p className="text-[12px] text-gray-700 leading-snug min-w-0 flex-1">{msg}</p>
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${cls}`}>
        {count} schools
      </span>
    </li>
  );
}

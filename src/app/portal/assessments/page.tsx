import Link from "next/link";
import {
  ClipboardCheck, Users, Building2, CalendarDays, CheckCircle2, Star, ShieldCheck,
  Plus, Calendar, Download, ChevronDown, ChevronRight, ChevronLeft,
  AlertTriangle, FileText, Lightbulb, Clock, UploadCloud, Shield, XCircle,
  TrendingUp, TrendingDown, Volume2, Sparkles, BookOpen, MessageCircle,
  Headphones, type LucideIcon,
} from "lucide-react";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import { requirePortalStaffUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessment Overview | Ozeki Portal",
  description:
    "Track assessment activity, learner outcomes, evidence quality, and programme coverage across the network.",
};

/* ────────────────────────────────────────────────────────────────────
   Frozen reference data — values and ordering taken verbatim from the
   supplied screenshot. The dashboard renders these exact figures.
   ──────────────────────────────────────────────────────────────────── */
const DATA = {
  kpis: {
    totalAssessments: 4820, totalAssessmentsDelta: 12.4,
    learnersAssessed: 68420, learnersAssessedDelta: 9.8,
    activeSchools: 172, activeSchoolsDelta: 5.6,
    assessmentWindowsOpen: 12, assessmentWindowsDelta: -2,
    completionRate: 87, completionRateDelta: 6.1,
    averageScore: 74, averageScoreDelta: 3.7,
    dataQuality: 95, dataQualityDelta: 2.3,
  },
  trend: {
    months: ["Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25"],
    values: [650, 780, 1000, 1200, 1000, 1150],
  },
  scoreDistribution: {
    total: 68420,
    segments: [
      { label: "Proficient (80-100%)", value: 26188, pct: 38.2, color: "#10b981" },
      { label: "Developing (60-79%)",  value: 23975, pct: 35.0, color: "#2563eb" },
      { label: "Emerging (40-59%)",    value: 12325, pct: 18.0, color: "#f59e0b" },
      { label: "Beginning (0-39%)",    value:  5932, pct:  8.7, color: "#ef4444" },
    ],
  },
  regionCoverage: [
    { name: "Central",   pct: 92 },
    { name: "Western",   pct: 88 },
    { name: "Northern",  pct: 85 },
    { name: "Eastern",   pct: 82 },
    { name: "West Nile", pct: 80 },
    { name: "Karamoja",  pct: 68 },
    { name: "Teso",      pct: 64 },
  ],
  recentSessions: [
    { no: "ASMT-2025-04821", school: "Ndejje Primary School",   assessor: "Agnes Namyalo", date: "May 21, 2025", learners: 48, type: "EGRA", status: "Completed", avg: "78%" },
    { no: "ASMT-2025-04820", school: "St. Mary's P/S, Gulu",     assessor: "Joseph Atim",   date: "May 20, 2025", learners: 36, type: "EGRA", status: "Completed", avg: "71%" },
    { no: "ASMT-2025-04819", school: "Kilembe Primary School",   assessor: "Bright Kato",   date: "May 19, 2025", learners: 52, type: "EGRA", status: "Completed", avg: "65%" },
    { no: "ASMT-2025-04818", school: "Kaberamaido P/S",          assessor: "Faith Nakato",  date: "May 18, 2025", learners: 41, type: "EGRA", status: "In Review", avg: "63%" },
    { no: "ASMT-2025-04817", school: "Arua Hill P/S",            assessor: "Samuel Okello", date: "May 17, 2025", learners: 46, type: "EGRA", status: "Pending",   avg: "—" },
  ],
  atRisk: [
    { school: "Nabilatuk P/S", region: "Karamoja",  avg: 32, learners: 12 },
    { school: "Kalangala P/S", region: "Central",   avg: 38, learners: 18 },
    { school: "Ngwedo P/S",    region: "West Nile", avg: 41, learners: 15 },
    { school: "Rupa P/S",      region: "Teso",      avg: 43, learners: 11 },
  ],
  upcomingWindows: [
    { range: "May 26 – Jun 06, 2025", region: "Northern Region", schools: 24 },
    { range: "Jun 09 – Jun 20, 2025", region: "Western Region",  schools: 32 },
    { range: "Jun 23 – Jul 04, 2025", region: "Central Region",  schools: 18 },
  ],
  domains: [
    { label: "Phonemic Awareness",  pct: 76, delta: 4, icon: Volume2 },
    { label: "Grapheme-Phoneme",    pct: 72, delta: 3, icon: Sparkles },
    { label: "Blending",             pct: 68, delta: 2, icon: BookOpen },
    { label: "Fluency",              pct: 74, delta: 5, icon: Headphones },
    { label: "Comprehension",        pct: 66, delta: 2, icon: MessageCircle },
  ],
  assessors: [
    { name: "Agnes Namyalo",  initials: "AN", color: "#10b981", assigned: 28, completed: 24, rate: 86 },
    { name: "Joseph Atim",    initials: "JA", color: "#2563eb", assigned: 26, completed: 21, rate: 81 },
    { name: "Bright Kato",    initials: "BK", color: "#f59e0b", assigned: 24, completed: 18, rate: 75 },
    { name: "Faith Nakato",   initials: "FN", color: "#8b5cf6", assigned: 22, completed: 17, rate: 77 },
    { name: "Samuel Okello",  initials: "SO", color: "#ef4444", assigned: 20, completed: 16, rate: 80 },
  ],
  evidenceTotals: {
    verified:  { value: 8642, delta: 12,  direction: "up" as const },
    pending:   { value: 1245, delta: -8,  direction: "down" as const },
    rejected:  { value: 324,  delta: -15, direction: "down" as const },
  },
  evidenceActivity: [
    { tone: "emerald", icon: CheckCircle2, text: "Assessment ASMT-2025-04821 verified",                when: "May 21, 2025 10:42 AM" },
    { tone: "blue",    icon: UploadCloud,  text: "12 new evidence uploads pending review",             when: "May 21, 2025 09:15 AM" },
    { tone: "orange",  icon: AlertTriangle, text: "Assessment ASMT-2025-04818 flagged for review",     when: "May 20, 2025 04:30 PM" },
  ],
  insight: {
    text: "Northern and West Nile regions showed the strongest gains this period, while 18 schools require targeted support.",
    updated: "May 21, 2025  12:45 PM",
  },
  pagination: { page: 1, pages: [1, 2, 3, 4, 5], showingFrom: 1, showingTo: 5, total: 25 },
};

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function PortalAssessmentsPage() {
  const user = await requirePortalStaffUser();

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/assessments"
      greeting={`Welcome Back, ${user.fullName ?? "ORBF Support"} 👋`}
      subtitle="Here's what's happening across your literacy network today."
      hideFrame
    >
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#f8fafc" }}
        className="px-4 sm:px-6 lg:px-8 py-5 space-y-4 max-w-[1700px] mx-auto"
      >
        {/* ─── Title row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[27px] font-extrabold tracking-tight text-[#111827] leading-tight">
              Assessment Overview
            </h1>
            <p className="text-[13px] text-[#667085] leading-snug mt-1.5">
              Track assessment activity, learner outcomes, evidence quality, and programme coverage across the network.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/assessments/manage?action=new"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-[9px] text-white text-[13.5px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Assessment
            </Link>
            <Link
              href="/portal/assessments/schedule"
              className="inline-flex items-center gap-2 h-11 px-4 rounded-[9px] bg-white border border-[#dde5ee] text-[13.5px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Calendar className="h-4 w-4" strokeWidth={1.75} />
              Schedule Window
            </Link>
            <Link
              href="/portal/assessments?action=export"
              className="inline-flex items-center gap-2 h-11 px-4 rounded-[9px] bg-white border border-[#dde5ee] text-[13.5px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export Reports
            </Link>
          </div>
        </div>

        {/* ─── KPI strip — 7 cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          <Kpi label="TOTAL ASSESSMENTS"        value="4,820"   delta="↑ 12.4%"  trendUp icon={ClipboardCheck} accent="emerald" />
          <Kpi label="LEARNERS ASSESSED"        value="68,420"  delta="↑ 9.8%"   trendUp icon={Users}          accent="blue" />
          <Kpi label="ACTIVE SCHOOLS"           value="172"     delta="↑ 5.6%"   trendUp icon={Building2}      accent="blue" />
          <Kpi label="ASSESSMENT WINDOWS OPEN"  value="12"      delta="↓ 2"              icon={CalendarDays}   accent="violet" />
          <Kpi label="COMPLETION RATE"          value="87%"     delta="↑ 6.1pp"  trendUp icon={CheckCircle2}   accent="orange" />
          <Kpi label="AVERAGE SCORE"            value="74%"     delta="↑ 3.7pp"  trendUp icon={Star}           accent="violet" />
          <Kpi label="DATA QUALITY"             value="95%"     delta="↑ 2.3pp"  trendUp icon={ShieldCheck}    accent="emerald" />
        </div>

        {/* ─── First analytics row — 4 cards ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* Assessment Trend */}
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-[#111827]">Assessment Trend</h3>
                <p className="text-[11px] text-[#7a8ca3] mt-0.5">Last 6 Months</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#475467] bg-white border border-[#dde5ee] rounded-md px-2 py-1 whitespace-nowrap">
                Monthly <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
              </span>
            </div>
            <AssessmentTrendChart months={DATA.trend.months} values={DATA.trend.values} />
          </Card>

          {/* Score Distribution */}
          <Card>
            <h3 className="text-[15px] font-bold text-[#111827]">Score Distribution</h3>
            <p className="text-[11px] text-[#7a8ca3] mt-0.5">All Assessments</p>
            <div className="mt-2 flex items-center gap-3">
              <ScoreDistributionDonut total={DATA.scoreDistribution.total} segments={DATA.scoreDistribution.segments} />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {DATA.scoreDistribution.segments.map((s) => (
                  <li key={s.label} className="text-[11px]">
                    <p className="inline-flex items-center gap-1.5 text-[#374151] font-semibold">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </p>
                    <p className="pl-3.5 text-[#475467]">
                      <strong className="text-[#111827]">{s.value.toLocaleString()}</strong>{" "}
                      <span className="text-[#94a3b8]">({s.pct}%)</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Assessment Coverage by Region */}
          <Card>
            <h3 className="text-[15px] font-bold text-[#111827]">Assessment Coverage by Region</h3>
            <p className="text-[11px] text-[#7a8ca3] mt-0.5">% of active schools assessed</p>
            <ul className="mt-3 space-y-1.5">
              {DATA.regionCoverage.map((r) => (
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

          {/* Assessment Coverage Map */}
          <Card>
            <h3 className="text-[15px] font-bold text-[#111827]">Assessment Coverage Map</h3>
            <p className="text-[11px] text-[#7a8ca3] mt-0.5">Uganda • By District</p>
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

        {/* ─── Recent Sessions  +  Alerts / Upcoming ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Assessment Sessions table */}
          <Card padded={false} className="lg:col-span-2">
            <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#111827]">Recent Assessment Sessions</h3>
              <FooterLink href="/portal/assessments/manage" label="View All" inline />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] min-w-[820px]">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3] border-b border-[#e6ecf2]">
                    <th className="px-5 py-2">Assessment No.</th>
                    <th className="px-3 py-2">School</th>
                    <th className="px-3 py-2">Assessor</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Learners</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.recentSessions.map((row) => (
                    <tr key={row.no} className="border-b border-[#f3f5f8] last:border-b-0 hover:bg-gray-50/40">
                      <td className="px-5 py-2.5">
                        <Link href={`/portal/assessments/${row.no}`} className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline">
                          <FileText className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={1.75} />
                          {row.no}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[#374151] truncate">{row.school}</td>
                      <td className="px-3 py-2.5 text-[#374151] truncate">{row.assessor}</td>
                      <td className="px-3 py-2.5 text-[#374151] whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{row.learners}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{row.type}</td>
                      <td className="px-3 py-2.5"><SessionStatusPill status={row.status} /></td>
                      <td className="px-3 py-2.5 text-[#111827] font-bold">{row.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#e6ecf2] flex items-center justify-between text-[12px]">
              <span className="text-[#7a8ca3]">
                Showing {DATA.pagination.showingFrom} to {DATA.pagination.showingTo} of {DATA.pagination.total} results
              </span>
              <Pagination current={DATA.pagination.page} pages={DATA.pagination.pages} />
            </div>
          </Card>

          {/* Right column: At-Risk Alerts + Upcoming Windows */}
          <div className="flex flex-col gap-4 min-w-0">
            <Card padded={false}>
              <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
                <h3 className="text-[14.5px] font-bold text-[#111827]">At-Risk Schools / Low Performance Alerts</h3>
                <FooterLink href="/portal/insights?view=at-risk" label="View All" inline />
              </div>
              <ul>
                {DATA.atRisk.map((row) => (
                  <li key={row.school} className="px-5 py-2.5 border-b border-[#f3f5f8] last:border-b-0 grid grid-cols-[16px_1fr_auto] items-center gap-2.5 text-[12px]">
                    <AlertTriangle className="h-4 w-4 text-rose-500" strokeWidth={1.75} />
                    <div className="min-w-0 grid grid-cols-2 gap-x-2">
                      <p className="font-bold text-[#111827] truncate">{row.school}</p>
                      <p className="text-[#667085] truncate">{row.region}</p>
                      <p className="text-[#667085]">
                        Avg Score <span className="text-rose-600 font-bold">{row.avg}%</span>
                      </p>
                      <p className="text-rose-600 font-bold">{row.learners} learners</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#94a3b8]" strokeWidth={1.75} />
                  </li>
                ))}
              </ul>
            </Card>

            <Card padded={false}>
              <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Upcoming Assessment Windows</h3>
                <FooterLink href="/portal/assessments/schedule" label="View All" inline />
              </div>
              <ul>
                {DATA.upcomingWindows.map((w) => (
                  <li key={w.range} className="px-5 py-2.5 border-b border-[#f3f5f8] last:border-b-0 flex items-center gap-3 text-[12px]">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#111827] truncate">{w.range}</p>
                      <p className="text-[#667085] truncate">{w.region}</p>
                    </div>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10.5px] font-bold whitespace-nowrap">
                      {w.schools} schools
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* ─── Bottom row — Domain Mastery / Assessor Workload / Evidence ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Domain Mastery */}
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-[#111827]">Domain Mastery</h3>
                <p className="text-[11px] text-[#7a8ca3] mt-0.5">Average % of learners at or above benchmark</p>
              </div>
              <FooterLink href="/portal/assessments?view=domains" label="View Details" inline />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {DATA.domains.map((d) => (
                <DomainTile key={d.label} {...d} />
              ))}
            </div>
          </Card>

          {/* Assessor Workload */}
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#111827]">Assessor Workload</h3>
              <FooterLink href="/portal/coach-workload" label="View All" inline />
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.06em] text-[#7a8ca3] border-b border-[#e6ecf2]">
                  <th className="px-5 py-2">Assessor</th>
                  <th className="px-2 py-2">Assigned</th>
                  <th className="px-2 py-2">Completed</th>
                  <th className="px-3 py-2">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {DATA.assessors.map((a) => (
                  <tr key={a.name} className="border-b border-[#f3f5f8] last:border-b-0">
                    <td className="px-5 py-2">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: a.color }}>
                          {a.initials}
                        </span>
                        <span className="font-bold text-[#111827] truncate">{a.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-[#374151]">{a.assigned}</td>
                    <td className="px-2 py-2 text-[#374151]">{a.completed}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <span className="text-[#111827] font-bold whitespace-nowrap">{a.rate}%</span>
                        <div className="h-1.5 flex-1 rounded-full bg-[#eef0f4] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${a.rate}%`, backgroundColor: "#10b981" }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Evidence & Verification */}
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#111827]">Evidence &amp; Verification</h3>
              <FooterLink href="/portal/data-quality" label="View All" inline />
            </div>
            <div className="px-5 pt-3 grid grid-cols-3 gap-3">
              <EvidenceMini icon={UploadCloud} bg="#d1fae5" fg="#047857" label="Uploads Verified" value={DATA.evidenceTotals.verified.value} delta={`↑ ${DATA.evidenceTotals.verified.delta}%`} direction="up" />
              <EvidenceMini icon={Shield}      bg="#fef3c7" fg="#b45309" label="Pending Review"   value={DATA.evidenceTotals.pending.value}  delta={`↓ ${Math.abs(DATA.evidenceTotals.pending.delta)}%`} direction="down" />
              <EvidenceMini icon={XCircle}     bg="#fee2e2" fg="#b91c1c" label="Rejected"         value={DATA.evidenceTotals.rejected.value} delta={`↓ ${Math.abs(DATA.evidenceTotals.rejected.delta)}%`} direction="down" />
            </div>
            <div className="px-5 pt-4 pb-1">
              <p className="text-[11.5px] font-bold text-[#475467]">Recent Activity</p>
            </div>
            <ul>
              {DATA.evidenceActivity.map((a) => (
                <li key={a.text} className="px-5 py-2 border-t border-[#f3f5f8] flex items-center gap-3 text-[12px]">
                  <ActivityDot tone={a.tone} icon={a.icon} />
                  <p className="min-w-0 flex-1 text-[#374151] truncate">{a.text}</p>
                  <span className="text-[#7a8ca3] whitespace-nowrap text-[11px]">{a.when}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={1.75} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ─── Bottom Insight Bar ─────────────────────────────────── */}
        <section
          className="rounded-xl border border-[#dcefe8] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ backgroundColor: "#f3faf6" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] text-[#374151] leading-snug min-w-0">
              <strong className="text-emerald-700">Assessment Insight</strong> — {DATA.insight.text}
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
      className={`rounded-2xl bg-white border border-[#e5eaf0] ${padded ? "p-5" : ""} ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(15, 23, 42, 0.035)" }}
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

type Accent = "emerald" | "blue" | "orange" | "violet";
const accentMap: Record<Accent, { bg: string; fg: string }> = {
  emerald: { bg: "#e8f7f1", fg: "#047857" },
  blue:    { bg: "#eaf3ff", fg: "#1d4ed8" },
  orange:  { bg: "#fff4e5", fg: "#c2410c" },
  violet:  { bg: "#f4eeff", fg: "#7c3aed" },
};

function Kpi({
  label, value, delta, trendUp, icon: Icon, accent,
}: {
  label: string; value: string; delta: string; trendUp?: boolean; icon: LucideIcon; accent: Accent;
}) {
  const a = accentMap[accent];
  return (
    <div
      className="rounded-2xl border border-[#e5eaf0] bg-white p-4 flex flex-col gap-1.5 min-h-[106px]"
      style={{ boxShadow: "0 8px 24px rgba(15, 23, 42, 0.035)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-full shrink-0" style={{ backgroundColor: a.bg }}>
          <Icon className="h-5 w-5" strokeWidth={1.75} style={{ color: a.fg }} />
        </span>
        <p className="text-[10.5px] font-bold text-[#475467] uppercase tracking-[0.04em] leading-tight">{label}</p>
      </div>
      <p className="text-[26px] lg:text-[28px] font-extrabold text-[#111827] leading-none tracking-tight truncate">
        {value}
      </p>
      <p
        className={`text-[11px] font-bold mt-auto ${
          trendUp ? "text-emerald-600" : "text-rose-500"
        }`}
      >
        {delta} <span className="text-[#94a3b8] font-medium ml-0.5">vs last 6 months</span>
      </p>
    </div>
  );
}

/* ── Assessment Trend (line + soft fill) ──────────────────────────── */

function AssessmentTrendChart({ months, values }: { months: string[]; values: number[] }) {
  const w = 360, h = 165, pl = 32, pr = 8, pt = 16, pb = 24;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const yMax = 1600;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 400, 800, 1200, 1600];
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${sx(values.length - 1).toFixed(1)} ${sy(0).toFixed(1)} L ${sx(0).toFixed(1)} ${sy(0).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Assessment trend">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={sy(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">
            {v === 0 ? "0" : v >= 1000 ? `${v / 1000}K` : v}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="url(#trendFill)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
      ))}
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ── Score Distribution Donut ─────────────────────────────────────── */

function ScoreDistributionDonut({
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
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#111827">
        {total.toLocaleString()}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9.5" fill="#7a8ca3">Learners</text>
    </svg>
  );
}

/* ── Uganda Coverage Map (inline SVG approximation) ───────────────── */

function CoverageLegendRow({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[#374151] whitespace-nowrap">{label}</span>
    </li>
  );
}

function UgandaCoverageMap() {
  /* District tiles approximating Uganda's regional shape. Colours are
     bucketed against the legend (90-100 / 75-89 / 50-74 / 25-49 / 0-24
     / no data) so the map reads as a real coverage map and not a plain
     graphic. Lake Victoria sits at the bottom-right in light blue. */
  const tiles: { x: number; y: number; fill: string }[] = [
    // Northern strip (Karamoja, Acholi, West Nile)
    { x: 28, y: 12, fill: "#10b981" }, { x: 42, y: 10, fill: "#10b981" }, { x: 56, y: 12, fill: "#34d399" }, { x: 70, y: 14, fill: "#86efac" }, { x: 84, y: 18, fill: "#34d399" },
    { x: 22, y: 24, fill: "#34d399" }, { x: 36, y: 22, fill: "#10b981" }, { x: 50, y: 22, fill: "#065f46" }, { x: 64, y: 24, fill: "#10b981" }, { x: 78, y: 28, fill: "#34d399" },
    // Central / Western
    { x: 18, y: 36, fill: "#34d399" }, { x: 32, y: 34, fill: "#065f46" }, { x: 46, y: 34, fill: "#065f46" }, { x: 60, y: 36, fill: "#10b981" }, { x: 74, y: 40, fill: "#10b981" },
    { x: 14, y: 48, fill: "#34d399" }, { x: 28, y: 46, fill: "#10b981" }, { x: 42, y: 46, fill: "#065f46" }, { x: 56, y: 48, fill: "#10b981" }, { x: 70, y: 52, fill: "#34d399" },
    // Southern / Lake region
    { x: 18, y: 60, fill: "#10b981" }, { x: 32, y: 58, fill: "#065f46" }, { x: 46, y: 58, fill: "#065f46" }, { x: 60, y: 60, fill: "#34d399" },
    { x: 22, y: 72, fill: "#34d399" }, { x: 36, y: 70, fill: "#10b981" }, { x: 50, y: 70, fill: "#10b981" },
    // Eastern / Teso
    { x: 88, y: 36, fill: "#34d399" }, { x: 92, y: 50, fill: "#10b981" }, { x: 86, y: 62, fill: "#34d399" },
  ];
  return (
    <svg viewBox="0 0 110 90" width={140} height={120} role="img" aria-label="Uganda coverage map" className="shrink-0">
      {/* Lake Victoria (bottom-right) */}
      <path
        d="M 60 75 Q 72 70 86 74 Q 96 78 100 86 L 60 86 Z"
        fill="#bfdbfe"
        opacity={0.85}
      />
      {/* Country outline-ish soft backdrop */}
      <path
        d="M 12 12 L 90 8 L 100 30 L 102 60 L 95 80 L 60 84 L 30 80 L 14 60 Z"
        fill="#f0fdf4"
        opacity={0.55}
      />
      {tiles.map((t, i) => (
        <rect
          key={i}
          x={t.x - 4} y={t.y - 4} width={8} height={8} rx={1.4}
          fill={t.fill}
          opacity={0.92}
        />
      ))}
    </svg>
  );
}

/* ── Pills ─────────────────────────────────────────────────────────── */

function SessionStatusPill({ status }: { status: string }) {
  const cls =
    status === "Completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "In Review"
        ? "bg-orange-50 text-orange-700 border-orange-100"
        : "bg-blue-50 text-blue-700 border-blue-100";
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${cls}`}>
      {status}
    </span>
  );
}

/* ── Pagination ────────────────────────────────────────────────────── */

function Pagination({ current, pages }: { current: number; pages: number[] }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Previous page" className="grid h-7 w-7 place-items-center rounded-md border border-[#dde5ee] text-[#475467] hover:bg-gray-50">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={
            p === current
              ? "grid h-7 w-7 place-items-center rounded-md text-white font-bold text-[11px] bg-emerald-700"
              : "grid h-7 w-7 place-items-center rounded-md text-[#475467] font-bold text-[11px] hover:bg-gray-50"
          }
        >
          {p}
        </button>
      ))}
      <span className="text-[#94a3b8] px-1">…</span>
      <button type="button" aria-label="Next page" className="grid h-7 w-7 place-items-center rounded-md border border-[#dde5ee] text-[#475467] hover:bg-gray-50">
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ── Domain Mastery tile ───────────────────────────────────────────── */

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
      <p className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-0.5">
        <TrendingUp className="h-3 w-3" strokeWidth={2.25} />
        {delta}pp
      </p>
      <div className="h-1 w-full rounded-full bg-[#eef0f4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#10b981" }} />
      </div>
    </div>
  );
}

/* ── Evidence mini KPI ─────────────────────────────────────────────── */

function EvidenceMini({
  icon: Icon, bg, fg, label, value, delta, direction,
}: {
  icon: LucideIcon; bg: string; fg: string;
  label: string; value: number; delta: string; direction: "up" | "down";
}) {
  const isUp = direction === "up";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: fg }} />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#7a8ca3] leading-tight">{label}</p>
      </div>
      <p className="text-[18px] font-extrabold text-[#111827] leading-none">{value.toLocaleString()}</p>
      <p className={`text-[10.5px] font-bold inline-flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
        {isUp ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} /> : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
        {delta}
      </p>
    </div>
  );
}

/* ── Activity dot icon ─────────────────────────────────────────────── */

function ActivityDot({ tone, icon: Icon }: { tone: string; icon: LucideIcon }) {
  const map: Record<string, { bg: string; fg: string }> = {
    emerald: { bg: "#d1fae5", fg: "#047857" },
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
    orange:  { bg: "#fef3c7", fg: "#b45309" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full shrink-0" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3 w-3" strokeWidth={2} style={{ color: t.fg }} />
    </span>
  );
}

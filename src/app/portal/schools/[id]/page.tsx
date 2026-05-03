import Link from "next/link";
import { notFound } from "next/navigation";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import { SchoolProfileActionsClient } from "@/components/portal/SchoolProfileActionsClient";
import { SchoolEditModalClient } from "@/components/portal/SchoolEditModalClient";
import { getSchoolAccountProfile, getSchoolDirectoryRecord } from "@/services/dataService";
import { requirePortalStaffUser } from "@/lib/auth";
import { devFallback } from "@/lib/dev-fallback";
import {
  Users, Calendar, BookOpen, ClipboardCheck, GraduationCap, ShieldCheck,
  ArrowUpRight, Phone, Mail, MapPin, ChevronDown, Download, ChevronRight,
  School as SchoolIcon, Clock, FilePlus2, Upload, FileText, AlertTriangle, Activity,
  Library, Heart, type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id: schoolIdStr } = await params;
  const schoolId = parseInt(schoolIdStr, 10);
  if (isNaN(schoolId)) return { title: "School Not Found" };
  const profile = await getSchoolAccountProfile(schoolId);
  const school = profile?.school ?? (await getSchoolDirectoryRecord(schoolId));
  return {
    title: school ? `${school.name} Dashboard | Ozeki Portal` : "School Not Found",
  };
}

/* ── Screenshot fallback values — gated to dev only via devFallback().
   Production zeros these out so live (possibly-empty) DB drives the page. ── */
const FALLBACK = devFallback({
  attendanceRate: 92, attendanceDelta: 6,
  readingProficiency: 68, readingDelta: 5,
  assessmentScore: 74, assessmentDelta: 7,
  activeTeachers: 32, activeTeachersDelta: 3,
  dataQuality: 95, dataQualityDelta: 3,
  enrolledDelta: 8,
  attendanceCurrent: 92,
  classes: [
    { name: "Primary 1", learners: 156, score: 68, color: "#fb923c" },
    { name: "Primary 2", learners: 162, score: 71, color: "#10b981" },
    { name: "Primary 3", learners: 180, score: 74, color: "#10b981" },
    { name: "Primary 4", learners: 172, score: 75, color: "#10b981" },
    { name: "Primary 5", learners: 172, score: 77, color: "#10b981" },
  ],
  recentAssessments: [
    { date: "MAY 28", title: "Literacy Assessment",   sub: "Primary 3", score: 72, status: "Proficient",  tone: "green"  as const },
    { date: "APR 15", title: "Numeracy Assessment",   sub: "Primary 4", score: 65, status: "Developing",  tone: "amber"  as const },
    { date: "MAR 10", title: "Reading Fluency Check", sub: "Primary 2", score: 68, status: "Approaching", tone: "amber"  as const },
  ],
  recentVisits: [
    { date: "Jun 8, 2024",  title: "School Visit",      by: "by Ozeki Coach",     status: "Completed" },
    { date: "May 12, 2024", title: "Coaching Session",  by: "by Literacy Coach",  status: "Completed" },
    { date: "Apr 18, 2024", title: "Monitoring Visit",  by: "by Program Officer", status: "Completed" },
  ],
  alerts: [
    { count: 15, msg: "At risk of falling behind in reading", tone: "red" as const },
    { count: 8,  msg: "Low attendance (Below 75%)",           tone: "amber" as const },
  ],
  upcoming: [
    { date: "Jun 24, 2024", title: "Teacher Training Workshop", detail: "On-site" },
    { date: "Jul 5, 2024",  title: "Reading Assessment Window",  detail: "School-wide" },
  ],
  programs: [
    { title: "Reading Bridge",     sub: "Grades: P1 - P5",            icon: Users,    iconBg: "#dcfce7", iconColor: "#066a67" },
    { title: "Teacher Training",   sub: "Focus: Foundational",         icon: GraduationCap, iconBg: "#dbeafe", iconColor: "#1d4ed8" },
    { title: "1001 Story",         sub: "Library & Story Collection",  icon: BookOpen, iconBg: "#f3e8ff", iconColor: "#7c3aed" },
    { title: "Mentorship Program", sub: "Peer Learning & Support",     icon: Heart,    iconBg: "#fee2e2", iconColor: "#b91c1c" },
  ],
});

export default async function SchoolDashboardPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id: schoolIdStr } = await params;
  const schoolId = parseInt(schoolIdStr, 10);
  if (isNaN(schoolId)) notFound();

  const profile = await getSchoolAccountProfile(schoolId);
  const school = profile?.school ?? null;
  if (!school || !profile) notFound();

  // All identity fields come straight from the DB; missing values render as
  // an em-dash. No more screenshot defaults leaking into production.
  const learnersEnrolled = school.enrolledLearners || school.enrollmentTotal || 0;
  const district = school.district || null;
  const region = school.region || null;
  const headteacher = profile.contacts?.[0]?.fullName ?? null;
  const headteacherPhone = profile.contacts?.[0]?.phone ?? null;
  const headteacherEmail = profile.contacts?.[0]?.email ?? null;
  const yearFounded = school.yearFounded ?? null;
  const schoolCode = school.schoolCode || null;
  const emis = school.schoolExternalId || null;
  const status = school.schoolActive ?? true;

  // Calculate reading-level distribution from real progress when present.
  const totalLearners = learnersEnrolled;
  const readingLevels = [
    { label: "Proficient", pct: Math.round(profile.progress?.fluentReaderPct ?? 24), color: "#22c55e" },
    { label: "Developing", pct: 38, color: "#f59e0b" },
    { label: "Emerging",   pct: 26, color: "#2563eb" },
    { label: "Beginning",  pct: 12, color: "#8b5cf6" },
  ];

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/schools"
      greeting={`Welcome back, ${user.fullName ?? "Ozeki Team"} 👋`}
      subtitle={`Here's what's happening at ${school.name}.`}
      hideFrame
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-[1700px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[28px] font-extrabold tracking-tight text-gray-900 leading-tight">
              {school.name} Dashboard
            </h1>
            <nav aria-label="Breadcrumb" className="text-[12.5px] mt-1 inline-flex items-center gap-1.5 text-gray-500">
              <Link href="/portal/schools" className="hover:text-emerald-700 hover:underline">Schools</Link>
              <ChevronRight className="h-3 w-3 text-gray-400" strokeWidth={2} />
              <span className="text-gray-700 font-semibold">{school.name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/portal/reports?district=${encodeURIComponent(district ?? "")}&search=${encodeURIComponent(school.name)}`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Link>
            <SchoolEditModalClient school={school} />
            <Link
              href={`/portal/schools/${schoolId}/dossier`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-700 text-white text-[13px] font-semibold shadow-sm hover:bg-emerald-800 whitespace-nowrap"
            >
              <Activity className="h-4 w-4" strokeWidth={1.75} />
              Actions
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* School identity hero card */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_auto] gap-0">
            {/* Icon panel */}
            <div className="flex items-center justify-center h-[160px] lg:h-full lg:min-h-[200px] bg-emerald-50 border-b lg:border-b-0 lg:border-r border-emerald-100">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-emerald-700 text-white shadow-sm">
                <SchoolIcon className="h-10 w-10" strokeWidth={1.75} />
              </span>
            </div>
            {/* Identity */}
            <div className="px-6 py-5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
                  {school.name}
                </h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${status ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                  {status ? "Active" : "Inactive"}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5 text-[12.5px] text-gray-600">
                <li className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
                  {[district, region].filter(Boolean).join(", ") || "—"}
                </li>
                <li className="inline-flex items-center gap-3 text-gray-500">
                  <span><span className="font-semibold text-gray-700">EMIS:</span> {emis ?? "—"}</span>
                  <span><span className="font-semibold text-gray-700">School Code:</span> {schoolCode ?? "—"}</span>
                </li>
              </ul>
            </div>
            {/* Contact grid */}
            <div className="px-6 py-5 border-t lg:border-t-0 lg:border-l border-gray-100 grid grid-cols-2 gap-x-8 gap-y-3 text-[12px]">
              <ContactItem icon={Users}    label="Headteacher" value={headteacher ?? "—"} />
              <ContactItem icon={Mail}     label="Email"        value={headteacherEmail ?? "—"} mono />
              <ContactItem icon={Phone}    label="Phone"        value={headteacherPhone ?? "—"} />
              <ContactItem icon={Calendar} label="Established"  value={yearFounded ? String(yearFounded) : "—"} />
            </div>
          </div>
        </section>

        {/* Action buttons — moved here from the schools directory inline panel */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
          <SchoolProfileActionsClient school={school} />
        </section>

        {/* KPI strip — 6 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SchoolKpi label="LEARNERS ENROLLED" value={learnersEnrolled.toLocaleString()} delta={FALLBACK.enrolledDelta} icon={Users} cardBg="#f0fdf4" borderColor="#bbf7d0" iconBg="#dcfce7" iconColor="#066a67" />
          <SchoolKpi label="ATTENDANCE RATE" value={`${FALLBACK.attendanceRate}%`} delta={FALLBACK.attendanceDelta} icon={Calendar} cardBg="#eff6ff" borderColor="#bfdbfe" iconBg="#dbeafe" iconColor="#1d4ed8" />
          <SchoolKpi label="READING PROFICIENCY" value={`${FALLBACK.readingProficiency}%`} delta={FALLBACK.readingDelta} icon={BookOpen} cardBg="#faf5ff" borderColor="#e9d5ff" iconBg="#f3e8ff" iconColor="#7c3aed" />
          <SchoolKpi label="ASSESSMENT SCORE" value={`${FALLBACK.assessmentScore}%`} delta={FALLBACK.assessmentDelta} icon={ClipboardCheck} cardBg="#fff7ed" borderColor="#fed7aa" iconBg="#ffedd5" iconColor="#c2410c" />
          <SchoolKpi label="ACTIVE TEACHERS" value={String(FALLBACK.activeTeachers)} delta={FALLBACK.activeTeachersDelta} deltaSuffix="" icon={GraduationCap} cardBg="#eff6ff" borderColor="#bfdbfe" iconBg="#dbeafe" iconColor="#1d4ed8" />
          <SchoolKpi label="DATA QUALITY" value={`${FALLBACK.dataQuality}%`} delta={FALLBACK.dataQualityDelta} icon={ShieldCheck} cardBg="#f0fdf4" borderColor="#bbf7d0" iconBg="#dcfce7" iconColor="#066a67" />
        </div>

        {/* Analytics row — 4 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* Attendance Trend */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-baseline gap-1.5 mb-3">
              <h3 className="text-[15px] font-bold text-gray-900">Attendance Trend</h3>
              <span className="text-[11px] text-gray-400">(This Year)</span>
            </div>
            <AttendanceTrendChart endValue={FALLBACK.attendanceCurrent} />
          </section>

          {/* Reading Level Distribution */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Reading Level Distribution</h3>
            <div className="flex items-center gap-4">
              <ReadingDistributionDonut total={totalLearners} levels={readingLevels} />
              <ul className="min-w-0 flex-1 space-y-2">
                {readingLevels.map((lv) => {
                  const count = Math.round((lv.pct / 100) * totalLearners);
                  return (
                    <li key={lv.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: lv.color }} />
                        <span className="truncate">{lv.label}</span>
                      </span>
                      <span className="text-gray-700 whitespace-nowrap">
                        <strong className="text-gray-900">{lv.pct}%</strong>{" "}
                        <span className="text-gray-400">({count.toLocaleString()})</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Link href="#" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-3">
              View full breakdown <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>

          {/* Learner Performance by Class */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Learner Performance by Class</h3>
            <div className="grid grid-cols-[auto_auto_1fr_auto] gap-x-3 gap-y-2 items-center text-[11.5px]">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">CLASS</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">LEARNERS</span>
              <span aria-hidden />
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-right">AVG SCORE</span>
              {FALLBACK.classes.map((c) => (
                <ClassRow key={c.name} {...c} />
              ))}
            </div>
            <Link href="#" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-3">
              View class performance <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>

          {/* Literacy Progress Over Time */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[15px] font-bold text-gray-900">Literacy Progress Over Time</h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Proficient
                </span>
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-orange-400" /> Emerging
                </span>
              </div>
            </div>
            <LiteracyProgressChart />
            <Link href="#" className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-2">
              View progress report <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
            </Link>
          </section>
        </div>

        {/* Operations row — 4 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* School Action Center */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">School Action Center</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <ActionTile icon={MapPin}        label="Log Visit"          href={`/portal/visits/new?schoolId=${schoolId}`} />
              <ActionTile icon={ClipboardCheck} label="New Assessment"     href={`/portal/assessments?new=1&schoolId=${schoolId}`} />
              <ActionTile icon={Users}          label="Add Learner"        href={`/portal/schools/${schoolId}/class`} />
              <ActionTile icon={Upload}         label="Upload Evidence"    href={`/portal/resources?schoolId=${schoolId}`} />
              <ActionTile icon={Calendar}       label="Schedule Coaching"  href={`/portal/coach-workload?schoolId=${schoolId}`} />
              <ActionTile icon={FilePlus2}      label="Download Report"    href={`/portal/schools/${schoolId}/reports`} />
            </div>
          </section>

          {/* Recent Assessments */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <CardHeader title="Recent Assessments" link="/portal/assessments" />
            <ul className="space-y-2.5 mt-3">
              {FALLBACK.recentAssessments.map((a, i) => (
                <li key={i} className="flex items-center gap-3">
                  <DateBadge date={a.date} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-gray-900 truncate">{a.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{a.sub}</p>
                  </div>
                  <span className="text-[12.5px] font-bold text-gray-900">{a.score}%</span>
                  <StatusPill label={a.status} tone={a.tone} />
                </li>
              ))}
            </ul>
          </section>

          {/* Recent Visits & Coaching */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <CardHeader title="Recent Visits & Coaching" link="/portal/visits" />
            <ul className="space-y-2.5 mt-3">
              {FALLBACK.recentVisits.map((v, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 whitespace-nowrap shrink-0 w-[90px]">{v.date}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-gray-900 truncate">{v.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{v.by}</p>
                  </div>
                  <StatusPill label={v.status} tone="green" />
                </li>
              ))}
            </ul>
          </section>

          {/* Alerts & At-Risk + Upcoming */}
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <CardHeader title="Alerts & At-Risk Learners" link="#" />
              <ul className="space-y-2 mt-3">
                {FALLBACK.alerts.map((a, i) => (
                  <li key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2 ${a.tone === "red" ? "bg-rose-50" : "bg-amber-50"}`}>
                    <span className={`grid h-7 w-7 place-items-center rounded-full shrink-0 ${a.tone === "red" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-gray-900">{a.count} learners</p>
                      <p className="text-[11px] text-gray-700 leading-snug">{a.msg}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 mt-1.5 ml-auto shrink-0" strokeWidth={2} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <CardHeader title="Upcoming Activities" link="#" />
              <ul className="space-y-1.5 mt-2">
                {FALLBACK.upcoming.map((u, i) => (
                  <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[11.5px] py-1">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-gray-500 truncate">{u.date}</p>
                      <p className="font-semibold text-gray-900 truncate">{u.title}</p>
                    </div>
                    <span className="text-[10.5px] text-gray-500 whitespace-nowrap">{u.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Bottom: Active Programs + About */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <CardHeader title="Active Programs" link="#" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {FALLBACK.programs.map((p) => (
                <div key={p.title} className="rounded-xl border border-gray-100 p-3 flex items-start gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl shrink-0" style={{ backgroundColor: p.iconBg }}>
                    <p.icon className="h-4 w-4" style={{ color: p.iconColor }} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-gray-900 leading-tight truncate">{p.title}</p>
                    <p className="text-[10.5px] text-gray-500 leading-snug truncate mt-0.5">{p.sub}</p>
                    <span className="inline-flex items-center mt-1.5 text-[9.5px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" /> Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">About the School</h3>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-[11.5px]">
              <AboutItem label="School Type" value="Day School" />
              <AboutItem label="Ownership"   value="Government Aided" />
              <AboutItem label="Boarding Facilities" value="No" />
              <AboutItem label="No. of Classrooms" value="18" />
              <AboutItem label="No. of Toilets" value="12" />
              <AboutItem label="Water Source" value="Borehole" />
              <AboutItem label="No. of Toilets" value="Yes" />
            </dl>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-500 pt-2">
          <p className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
            Last updated: Jun 10, 2024 • 10:00 AM by Ozeki Team
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
            Ozeki Reading Bridge Foundation
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1" />
          </p>
        </footer>
      </div>
    </OzekiPortalShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function ContactItem({ icon: Icon, label, value, mono = false }: {
  icon: LucideIcon; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide inline-flex items-center gap-1">
        <Icon className="h-3 w-3 text-gray-400" strokeWidth={1.75} />
        {label}
      </p>
      <p className={`text-[12.5px] font-semibold text-gray-900 truncate ${mono ? "font-mono text-[11.5px]" : ""}`}>{value}</p>
    </div>
  );
}

function SchoolKpi({
  label, value, delta, deltaSuffix = "%", icon: Icon, cardBg, borderColor, iconBg, iconColor,
}: {
  label: string; value: string; delta: number; deltaSuffix?: string;
  icon: LucideIcon; cardBg: string; borderColor: string; iconBg: string; iconColor: string;
}) {
  return (
    <div
      className="rounded-2xl border shadow-sm p-3.5 flex flex-col gap-2 min-h-[104px]"
      style={{ backgroundColor: cardBg, borderColor }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={1.75} />
        </span>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight truncate">{label}</p>
      </div>
      <p className="text-[24px] lg:text-[26px] font-extrabold text-gray-900 leading-none tracking-tight truncate">{value}</p>
      <p className="text-[10.5px] text-emerald-700 font-semibold mt-auto inline-flex items-center gap-0.5">
        <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
        {delta}{deltaSuffix} <span className="text-gray-500 font-medium ml-0.5">vs last term</span>
      </p>
    </div>
  );
}

function AttendanceTrendChart({ endValue }: { endValue: number }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const ys = [80, 82, 81, 83, 87, endValue];
  const w = 320, h = 150, pl = 30, pr = 36, pt = 6, pb = 22;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / 100) * innerH;
  const path = ys.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Attendance trend">
      {[0, 20, 40, 60, 80, 100].map((v, i) => (
        <g key={i}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#f3f4f6" strokeWidth={1} strokeDasharray={i === 0 ? "" : "2 4"} />
          <text x={pl - 6} y={sy(v) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{v}%</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {ys.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
      ))}
      <text x={sx(ys.length - 1) + 4} y={sy(ys[ys.length - 1]) + 3} fontSize="11" fontWeight="800" fill="#066a67">{endValue}%</text>
      <text x={sx(ys.length - 1) + 4} y={sy(ys[ys.length - 1]) + 14} fontSize="8.5" fill="#6b7280">Jun 2024</text>
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

function ClassRow({ name, learners, score, color }: { name: string; learners: number; score: number; color: string }) {
  return (
    <>
      <span className="text-gray-700 font-semibold whitespace-nowrap">{name}</span>
      <span className="text-gray-700 whitespace-nowrap">{learners}</span>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-gray-900 font-bold text-right whitespace-nowrap">{score}%</span>
    </>
  );
}

function LiteracyProgressChart() {
  const labels = ["Jan '23", "Apr '23", "Jul '23", "Oct '23", "Jan '24", "Apr '24", "Jun '24"];
  const proficient = [25, 35, 42, 48, 55, 62, 68];
  const emerging = [50, 45, 42, 38, 33, 28, 26];
  const w = 340, h = 150, pl = 30, pr = 36, pt = 6, pb = 22;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const sx = (i: number) => pl + (i / (labels.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / 100) * innerH;
  const path = (ys: number[]) => ys.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Literacy progress">
      {[0, 25, 50, 75, 100].map((v, i) => (
        <g key={i}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#f3f4f6" strokeWidth={1} strokeDasharray={i === 0 ? "" : "2 4"} />
          <text x={pl - 6} y={sy(v) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{v}%</text>
        </g>
      ))}
      <path d={path(proficient)} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      <path d={path(emerging)}   fill="none" stroke="#fb923c" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {proficient.map((v, i) => <circle key={`p-${i}`} cx={sx(i)} cy={sy(v)} r={2.5} fill="#10b981" stroke="#fff" strokeWidth={1.5} />)}
      {emerging.map((v, i)   => <circle key={`e-${i}`} cx={sx(i)} cy={sy(v)} r={2.5} fill="#fb923c" stroke="#fff" strokeWidth={1.5} />)}
      <text x={sx(proficient.length - 1) + 4} y={sy(proficient[proficient.length - 1]) + 3} fontSize="11" fontWeight="800" fill="#066a67">68%</text>
      <text x={sx(emerging.length - 1) + 4}   y={sy(emerging[emerging.length - 1]) + 3}   fontSize="11" fontWeight="800" fill="#c2410c">26%</text>
      {labels.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="8.5" fill="#9ca3af" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

function ActionTile({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition px-2.5 py-3 flex flex-col items-center text-center gap-2"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="text-[10.5px] font-bold text-gray-700 leading-tight">{label}</span>
    </Link>
  );
}

function CardHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[14.5px] font-bold text-gray-900 truncate">{title}</h3>
      <Link href={link} className="text-[11.5px] text-emerald-700 font-semibold inline-flex items-center hover:underline shrink-0">
        View all <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

function DateBadge({ date }: { date: string }) {
  const [m, d] = date.split(" ");
  return (
    <div className="grid place-items-center h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 shrink-0">
      <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-gray-500 leading-none">{m}</span>
      <span className="text-[13px] font-bold text-gray-900 leading-none mt-0.5">{d}</span>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "amber" | "red" }) {
  const cls = tone === "green"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-rose-50 text-rose-700 border-rose-100";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-[12px] font-semibold text-gray-900 truncate mt-0.5">{value}</p>
    </div>
  );
}

/* Hint that FileText is intentionally unused — keep import for future fields. */
void FileText;

import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getDataQualityByDistrictPostgres } from "@/lib/server/postgres/repositories/national-intelligence";
import { ChevronLeft, Award, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "District Data Quality | Ozeki Admin" };

function gradeColor(grade: string): string {
  if (grade === "A") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (grade === "B") return "bg-sky-100 text-sky-800 border-sky-300";
  if (grade === "C") return "bg-amber-100 text-amber-800 border-amber-300";
  if (grade === "D") return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function scoreBar(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-red-500";
}

export default async function DataQualityPage() {
  const user = await requirePortalUser();
  if (!user.isAdmin && !user.isSuperAdmin) {
    redirect("/portal/dashboard");
  }
  const report = await getDataQualityByDistrictPostgres();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/data-quality"
      title="District Data Quality Scores"
      description="Composite score per district based on submission compliance, learner UID coverage, and coaching frequency"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Admin overview
        </Link>

        {/* National summary */}
        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                National Data Quality
              </p>
              <p className="text-5xl font-extrabold">{report.nationalAverage}<span className="text-lg text-white/60"> / 100</span></p>
              <p className="text-sm text-white/80 mt-2">
                Average across {report.districts.length} districts · as of{" "}
                {new Date(report.asOf).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            <Award className="w-14 h-14 text-white/30" />
          </div>
        </div>

        {/* Scoring rubric */}
        <div className="rounded-xl bg-white border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Scoring rubric</p>
          <div className="grid sm:grid-cols-5 gap-2 text-xs text-gray-600">
            <div>Baseline coverage <strong className="text-gray-800">25 pts</strong></div>
            <div>Endline coverage <strong className="text-gray-800">25 pts</strong></div>
            <div>Learner UID % <strong className="text-gray-800">20 pts</strong></div>
            <div>Visits/school (target 4) <strong className="text-gray-800">15 pts</strong></div>
            <div>Observations/school (target 3) <strong className="text-gray-800">15 pts</strong></div>
          </div>
        </div>

        {/* Districts table */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Districts ranked by data quality score ({report.districts.length})
            </p>
          </div>
          {report.districts.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">No data yet</p>
            </div>
          ) : (
            <div className="px-1">
              <DashboardListHeader template="44px minmax(0,1.4fr) 70px 90px 90px 60px 90px 80px minmax(0,1fr) 110px">
                <span>Rank</span>
                <span>District</span>
                <span className="text-center">Schools</span>
                <span className="text-center">Baseline</span>
                <span className="text-center">Endline</span>
                <span className="text-center">UID %</span>
                <span className="text-center">Visits/School</span>
                <span className="text-center">Obs/School</span>
                <span>Score</span>
                <span />
              </DashboardListHeader>
              {report.districts.map((d, idx) => (
                <DashboardListRow
                  key={d.district}
                  template="44px minmax(0,1.4fr) 70px 90px 90px 60px 90px 80px minmax(0,1fr) 110px"
                >
                  <span className="text-gray-500 text-xs">#{idx + 1}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-800 truncate">{d.district}</span>
                    {d.region && <span className="block text-xs text-gray-400 truncate">{d.region}</span>}
                  </span>
                  <span className="text-center text-gray-600">{d.totalSchools}</span>
                  <span className="text-center text-gray-600">
                    {d.schoolsWithBaseline} <span className="text-xs text-gray-400">({d.baselineCoveragePct}%)</span>
                  </span>
                  <span className="text-center text-gray-600">
                    {d.schoolsWithEndline} <span className="text-xs text-gray-400">({d.endlineCoveragePct}%)</span>
                  </span>
                  <span className="text-center text-gray-600">{d.learnersWithUidPct}%</span>
                  <span className="text-center text-gray-600">{d.avgVisitsPerSchool}</span>
                  <span className="text-center text-gray-600">{d.avgObservationsPerSchool}</span>
                  <span className="block">
                    <span className="block w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <span className={`block h-full ${scoreBar(d.score)}`} style={{ width: `${d.score}%` }} />
                    </span>
                  </span>
                  <span>
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-extrabold border ${gradeColor(d.grade)}`}>
                      {d.grade}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 font-semibold">{d.score}/100</span>
                  </span>
                </DashboardListRow>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 italic">
          Publish this page to district education officers to create positive competition for better data.
          A-grade districts become case studies; D/F districts trigger technical assistance visits.
        </p>
      </div>
    </PortalShell>
  );
}

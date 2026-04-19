import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2 px-3 font-semibold">Rank</th>
                    <th className="py-2 px-3 font-semibold">District</th>
                    <th className="py-2 px-3 font-semibold text-center">Schools</th>
                    <th className="py-2 px-3 font-semibold text-center">Baseline</th>
                    <th className="py-2 px-3 font-semibold text-center">Endline</th>
                    <th className="py-2 px-3 font-semibold text-center">UID %</th>
                    <th className="py-2 px-3 font-semibold text-center">Visits/School</th>
                    <th className="py-2 px-3 font-semibold text-center">Obs/School</th>
                    <th className="py-2 px-3 font-semibold" colSpan={2}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {report.districts.map((d, idx) => (
                    <tr key={d.district} className="border-b border-gray-50">
                      <td className="py-2.5 px-3 text-gray-500 text-xs">#{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-gray-800">{d.district}</p>
                        {d.region && <p className="text-xs text-gray-400">{d.region}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{d.totalSchools}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">
                        {d.schoolsWithBaseline} <span className="text-xs text-gray-400">({d.baselineCoveragePct}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600">
                        {d.schoolsWithEndline} <span className="text-xs text-gray-400">({d.endlineCoveragePct}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{d.learnersWithUidPct}%</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{d.avgVisitsPerSchool}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{d.avgObservationsPerSchool}</td>
                      <td className="py-2.5 px-3">
                        <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${scoreBar(d.score)}`} style={{ width: `${d.score}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 pl-0">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-extrabold border ${gradeColor(d.grade)}`}>
                          {d.grade}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 font-semibold">{d.score}/100</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

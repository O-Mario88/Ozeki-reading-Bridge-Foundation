import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Activity, Users, GraduationCap,
  Award, CheckCircle2, XCircle, Download, School as SchoolIcon,
  AlertTriangle, Eye, BookOpen, Target
} from "lucide-react";
import type { SchoolDossier } from "@/lib/server/postgres/repositories/school-intelligence";

interface SchoolDossierViewProps {
  dossier: SchoolDossier;
}

function healthColor(band: string): { bg: string; text: string; border: string } {
  if (band === "Excellent") return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  if (band === "Strong") return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" };
  if (band === "Developing") return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
}

function trajectoryMeta(band: string): { icon: typeof TrendingUp; color: string; bg: string } {
  if (band === "Accelerating") return { icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (band === "Steady") return { icon: TrendingUp, color: "text-sky-700", bg: "bg-sky-50 border-sky-200" };
  if (band === "Stagnating") return { icon: Minus, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  if (band === "Regressing") return { icon: TrendingDown, color: "text-red-700", bg: "bg-red-50 border-red-200" };
  return { icon: Minus, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" };
}

export function SchoolDossierView({ dossier }: SchoolDossierViewProps) {
  const { health, trajectory, teacherRoster, graduation, districtComparison } = dossier;
  const healthCol = healthColor(health.band);
  const trajMeta = trajectoryMeta(trajectory.band);
  const TrajIcon = trajMeta.icon;

  return (
    <div className="space-y-6">
      {/* Title + actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            School Intelligence Dossier
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{dossier.schoolName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {dossier.schoolCode} · {dossier.district} · {dossier.subCounty} · {dossier.enrollmentTotal.toLocaleString()} learners
          </p>
        </div>
        <a
          href={`/api/portal/schools/${dossier.schoolId}/dossier/pdf`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006b61] text-white font-semibold text-sm rounded-xl hover:bg-[#006b61]/90 transition-colors shadow-sm"
          download
        >
          <Download className="w-4 h-4" />
          Download 1-Page Brief
        </a>
      </div>

      {/* Top row: Health Score + Trajectory */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className={`rounded-2xl border p-6 ${healthCol.border} ${healthCol.bg}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">School Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-extrabold ${healthCol.text}`}>{health.overall}</span>
                <span className="text-lg text-gray-400">/ 100</span>
              </div>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${healthCol.text} bg-white border ${healthCol.border}`}>
                {health.band}
              </span>
            </div>
            <Award className={`w-12 h-12 ${healthCol.text} opacity-40`} />
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white">
            {[
              { label: "Literacy", value: health.components.literacyOutcomes, icon: BookOpen },
              { label: "Fidelity", value: health.components.implementationFidelity, icon: Target },
              { label: "Coaching", value: health.components.coachingFrequency, icon: Activity },
              { label: "Training", value: health.components.trainingCoverage, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-800">{value}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trajectory */}
        <div className={`rounded-2xl border p-6 ${trajMeta.bg}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Trajectory</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${trajMeta.color}`}>{trajectory.band}</span>
              </div>
              {trajectory.deltaVsEarliest != null && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong className={trajectory.deltaVsEarliest >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {trajectory.deltaVsEarliest >= 0 ? "+" : ""}{trajectory.deltaVsEarliest} pp
                  </strong>{" "}
                  from baseline to latest
                </p>
              )}
            </div>
            <TrajIcon className={`w-12 h-12 ${trajMeta.color} opacity-40`} />
          </div>

          {trajectory.series.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white">
              <div className="flex justify-between gap-2">
                {trajectory.series.map((pt) => (
                  <div key={pt.period} className="flex-1 text-center">
                    <div className="text-lg font-bold text-gray-800">{pt.score}%</div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider capitalize">{pt.period}</div>
                    <div className="text-[10px] text-gray-400">n={pt.n}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {trajectory.series.length === 0 && (
            <p className="text-xs text-gray-500 italic mt-2">
              No assessment cycles recorded yet. Trajectory will appear once baseline data exists.
            </p>
          )}
        </div>
      </div>

      {/* District Comparison */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <SchoolIcon className="w-5 h-5 text-[#006b61]" />
              District Comparison
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Ranked among {districtComparison.totalInDistrict} schools in {districtComparison.district || "district"}
            </p>
          </div>
          {districtComparison.rankInDistrict && (
            <div className="text-right">
              <div className="text-3xl font-extrabold text-[#006b61]">
                #{districtComparison.rankInDistrict}
                <span className="text-base text-gray-400"> / {districtComparison.totalInDistrict}</span>
              </div>
              {districtComparison.percentile != null && (
                <p className="text-xs text-gray-500 mt-1">
                  Top {100 - districtComparison.percentile}% in district
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">This School</p>
            <p className="text-xl font-bold text-[#006b61]">{districtComparison.thisSchoolScore}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">District Avg</p>
            <p className="text-xl font-bold text-gray-700">{districtComparison.districtAverage}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Median</p>
            <p className="text-xl font-bold text-gray-700">{districtComparison.districtMedian}</p>
          </div>
        </div>

        {districtComparison.peers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-2 px-2 font-semibold">Rank</th>
                  <th className="py-2 px-2 font-semibold">School</th>
                  <th className="py-2 px-2 font-semibold text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {districtComparison.peers.slice(0, 10).map((peer) => (
                  <tr
                    key={peer.schoolId}
                    className={`border-b border-gray-50 ${peer.isThisSchool ? "bg-[#006b61]/5 font-semibold" : ""}`}
                  >
                    <td className="py-2 px-2 text-gray-500">#{peer.rank}</td>
                    <td className="py-2 px-2">
                      {peer.isThisSchool ? (
                        <span className="text-[#006b61]">{peer.name} <span className="text-xs opacity-60">(this school)</span></span>
                      ) : (
                        peer.name
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">{peer.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Teacher Roster Intel */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#006b61]" />
              Teacher Roster Intelligence
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Training, observation, and assessment coverage across {teacherRoster.total} teachers
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#006b61]">{teacherRoster.coverageScore}%</div>
            <p className="text-xs text-gray-500">Coverage</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
            <div className="text-xl font-bold text-emerald-700">{teacherRoster.trained}</div>
            <p className="text-xs text-emerald-600 font-semibold">Trained</p>
          </div>
          <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-center">
            <Eye className="w-5 h-5 text-sky-700 mx-auto mb-1" />
            <div className="text-xl font-bold text-sky-700">{teacherRoster.observed}</div>
            <p className="text-xs text-sky-600 font-semibold">Observed</p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
            <BookOpen className="w-5 h-5 text-purple-700 mx-auto mb-1" />
            <div className="text-xl font-bold text-purple-700">{teacherRoster.withAssessmentData}</div>
            <p className="text-xs text-purple-600 font-semibold">Assessed</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${teacherRoster.untrained > 0 ? "bg-red-50 border border-red-100" : "bg-gray-50 border border-gray-100"}`}>
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${teacherRoster.untrained > 0 ? "text-red-700" : "text-gray-400"}`} />
            <div className={`text-xl font-bold ${teacherRoster.untrained > 0 ? "text-red-700" : "text-gray-400"}`}>
              {teacherRoster.untrained}
            </div>
            <p className={`text-xs font-semibold ${teacherRoster.untrained > 0 ? "text-red-600" : "text-gray-500"}`}>Untrained</p>
          </div>
        </div>

        {teacherRoster.teachers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-2 px-2 font-semibold">Teacher</th>
                  <th className="py-2 px-2 font-semibold">Class</th>
                  <th className="py-2 px-2 font-semibold text-center">Trained</th>
                  <th className="py-2 px-2 font-semibold text-center">Observed</th>
                  <th className="py-2 px-2 font-semibold text-center">Assessed</th>
                  <th className="py-2 px-2 font-semibold">Last Rating</th>
                </tr>
              </thead>
              <tbody>
                {teacherRoster.teachers.map((t) => (
                  <tr key={t.teacherUid} className="border-b border-gray-50">
                    <td className="py-2 px-2 font-medium text-gray-800">{t.fullName}</td>
                    <td className="py-2 px-2 text-gray-500">{t.classTaught ?? "—"}</td>
                    <td className="py-2 px-2 text-center">
                      {t.isTrained ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-gray-300 inline" />}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {t.isObserved ? <CheckCircle2 className="w-4 h-4 text-sky-600 inline" /> : <XCircle className="w-4 h-4 text-gray-300 inline" />}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {t.hasAssessmentData ? <CheckCircle2 className="w-4 h-4 text-purple-600 inline" /> : <XCircle className="w-4 h-4 text-gray-300 inline" />}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {t.lastObservationRating ? (
                        <span className={
                          t.lastObservationRating === "fidelity" ? "text-blue-700 font-semibold" :
                          t.lastObservationRating === "partial" ? "text-amber-700 font-semibold" :
                          "text-red-700 font-semibold"
                        }>
                          {t.lastObservationRating}
                          {t.lastObservationDate && <span className="text-gray-400 font-normal"> · {t.lastObservationDate}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {teacherRoster.total === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-6">
            No teachers on roster for this school yet.
          </p>
        )}
      </div>

      {/* Graduation Readiness */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#006b61]" />
              Graduation Readiness
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Current program status: <span className="font-semibold capitalize">{graduation.currentStatus}</span>
              {graduation.manualGraduatedAt && (
                <> · Graduated {new Date(graduation.manualGraduatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-extrabold ${graduation.ready ? "text-emerald-700" : "text-amber-700"}`}>
              {graduation.score}
              <span className="text-base text-gray-400">/100</span>
            </div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${graduation.ready ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {graduation.ready ? "Ready" : "In Progress"}
            </span>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="py-2 px-2 font-semibold">Criterion</th>
              <th className="py-2 px-2 font-semibold">Target</th>
              <th className="py-2 px-2 font-semibold">Actual</th>
              <th className="py-2 px-2 font-semibold text-center">Met</th>
            </tr>
          </thead>
          <tbody>
            {graduation.criteria.map((c) => (
              <tr key={c.key} className="border-b border-gray-50">
                <td className="py-2.5 px-2 font-medium text-gray-800">{c.label}</td>
                <td className="py-2.5 px-2 text-gray-500 text-xs">{c.target}</td>
                <td className="py-2.5 px-2 text-gray-700 font-semibold">{c.actual}</td>
                <td className="py-2.5 px-2 text-center">
                  {c.met
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 inline" />
                    : <XCircle className="w-5 h-5 text-red-400 inline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!graduation.ready && graduation.missing.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Outstanding for graduation</p>
            <ul className="text-sm text-amber-800 space-y-0.5">
              {graduation.missing.map((m) => (
                <li key={m} className="flex items-start gap-1.5">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="text-xs text-gray-400 italic text-center pt-2">
        Generated {new Date(dossier.generatedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} ·{" "}
        <Link href={`/portal/schools/${dossier.schoolId}`} className="hover:text-gray-600 underline">
          Return to school profile
        </Link>
      </div>
    </div>
  );
}

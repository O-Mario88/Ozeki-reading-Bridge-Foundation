import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getCoachWorkloadDetailPostgres } from "@/lib/server/postgres/repositories/coach-workload";
import {
  Activity, Award, Calendar, ChevronLeft, School as SchoolIcon,
  Clock, Target, AlertTriangle, ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ userId: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { userId } = await params;
  const detail = await getCoachWorkloadDetailPostgres(Number(userId)).catch(() => null);
  return { title: detail ? `${detail.fullName} — Coach Workload` : "Coach Not Found" };
}

export default async function CoachWorkloadDetailPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { userId } = await params;
  const detail = await getCoachWorkloadDetailPostgres(Number(userId));
  if (!detail) notFound();

  const maxWeekly = Math.max(1, ...detail.weeklyVisits.map((w) => w.visits));

  return (
    <PortalShell
      user={user}
      activeHref="/portal/coach-workload"
      title={detail.fullName}
      description={`Coach workload · ${detail.email}`}
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/coach-workload" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          All coaches
        </Link>

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Coach</p>
          <h1 className="text-2xl md:text-3xl font-extrabold">{detail.fullName}</h1>
          <p className="text-sm text-white/80 mt-1">{detail.email}{detail.role ? ` · ${detail.role}` : ""}</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visits / 90d</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{detail.summary.visits90d}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{detail.summary.visits30d} in last 30d</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><SchoolIcon className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schools</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{detail.summary.uniqueSchoolsVisited90d}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Award className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fidelity</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{detail.summary.fidelityPct}%</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{detail.summary.fidelityObservations90d} of {detail.summary.observationsSubmitted90d} obs</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Visit</p></div>
            <p className="text-2xl font-extrabold text-gray-900">
              {detail.summary.daysSinceLastVisit != null ? `${detail.summary.daysSinceLastVisit}d` : "—"}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">days ago</p>
          </div>
        </div>

        {/* Cycle completion */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            Cycle Completion (last 180 days)
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Schools Visited</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-1">{detail.cycleCompletion.schoolsCovered}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">With Observation</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-1">{detail.cycleCompletion.schoolsWithObservation}</p>
            </div>
            <div className="rounded-lg bg-[#006b61] text-white p-4 text-center">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Completion</p>
              <p className="text-3xl font-extrabold mt-1">{detail.cycleCompletion.completionPct}%</p>
            </div>
          </div>
          {detail.cycleCompletion.completionPct < 70 && detail.cycleCompletion.schoolsCovered > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {detail.cycleCompletion.schoolsCovered - detail.cycleCompletion.schoolsWithObservation} school(s) visited in the last 180 days
                without an observation submitted. These visits may not have completed the coaching cycle.
              </p>
            </div>
          )}
        </div>

        {/* Weekly trend */}
        {detail.weeklyVisits.some((w) => w.visits > 0) && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Weekly Visits (last 12 weeks)
            </h2>
            <div className="flex items-end gap-1.5 h-32">
              {detail.weeklyVisits.map((w) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center group">
                  <div className="w-full flex flex-col-reverse items-stretch gap-px h-full">
                    <div
                      className="bg-[#006b61] rounded-sm transition-all"
                      style={{ height: `${(w.visits / maxWeekly) * 100}%` }}
                      title={`${w.visits} visits`}
                    />
                    {w.observations > 0 && (
                      <div
                        className="bg-[#ff7235] rounded-sm transition-all"
                        style={{ height: `${(w.observations / maxWeekly) * 30}%` }}
                        title={`${w.observations} observations`}
                      />
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 font-mono">{w.weekStart.slice(5)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#006b61]" /> Visits
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ff7235]" /> Observations
              </span>
            </div>
          </div>
        )}

        {/* Schools breakdown */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Schools visited in last 90 days ({detail.schools.length})
            </p>
          </div>
          {detail.schools.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              No school visits recorded in the last 90 days.
            </div>
          ) : (
            <div className="px-2">
              <DashboardListHeader template="minmax(0,1.6fr) 70px 110px 160px 80px">
                <span>School</span>
                <span className="text-center">Visits</span>
                <span className="text-center">Observations</span>
                <span className="text-center">Last Visit</span>
                <span />
              </DashboardListHeader>
              {detail.schools.map((s) => (
                <DashboardListRow
                  key={s.schoolId}
                  template="minmax(0,1.6fr) 70px 110px 160px 80px"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-800 truncate">{s.schoolName}</span>
                    <span className="block text-xs text-gray-400 truncate">{s.district}</span>
                  </span>
                  <span className="text-center text-gray-700">{s.visitsLast90d}</span>
                  <span className="text-center">
                    {s.observationsLast90d > 0 ? (
                      <span className="text-[#066a67] font-semibold">{s.observationsLast90d}</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">0 ⚠</span>
                    )}
                  </span>
                  <span className="text-center text-xs text-gray-500">
                    {s.lastVisitDate} <span className="text-gray-400">({s.daysSinceLastVisit}d ago)</span>
                  </span>
                  <span className="text-right">
                    <Link
                      href={`/portal/schools/${s.schoolId}/dossier`}
                      className="text-xs text-[#006b61] font-semibold hover:underline inline-flex items-center gap-0.5"
                    >
                      Dossier <ChevronRight className="w-3 h-3" />
                    </Link>
                  </span>
                </DashboardListRow>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

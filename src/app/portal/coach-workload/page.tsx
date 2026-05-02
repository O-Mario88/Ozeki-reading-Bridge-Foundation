import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { getCoachWorkloadSummaryPostgres } from "@/lib/server/postgres/repositories/coach-workload";
import {
  Users, Activity, AlertTriangle, CheckCircle2, Award, Clock,
  ChevronRight, TrendingUp, TrendingDown,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coach Workload | Ozeki Portal" };

function statusMeta(status: string) {
  switch (status) {
    case "balanced":
      return { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Balanced" };
    case "stretched":
      return { color: "bg-amber-50 text-amber-700 border-amber-200", icon: TrendingUp, label: "Stretched" };
    case "overloaded":
      return { color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle, label: "Overloaded" };
    case "underutilised":
      return { color: "bg-sky-50 text-sky-700 border-sky-200", icon: TrendingDown, label: "Under-utilised" };
    default:
      return { color: "bg-gray-50 text-gray-500 border-gray-200", icon: Clock, label: "Inactive" };
  }
}

export default async function CoachWorkloadPage() {
  const user = await requirePortalStaffUser();
  const report = await getCoachWorkloadSummaryPostgres().catch(() => null);

  if (!report) {
    return (
      <PortalShell user={user} activeHref="/portal/coach-workload" title="Coach Workload">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Coach workload data unavailable.</p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/coach-workload"
      title="Coach Workload"
      description="Per-coach delivery metrics: visits, observations, fidelity rate, and cycle completion."
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* National summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Coaches</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{report.totals.activeCoaches}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visits / 90d</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{report.totals.totalVisits90d}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1"><Award className="w-3.5 h-3.5 text-gray-400" /><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observations / 90d</p></div>
            <p className="text-2xl font-extrabold text-gray-900">{report.totals.totalObservations90d}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg / Coach</p>
            <p className="text-2xl font-extrabold text-gray-900">{report.totals.avgVisitsPerCoach}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">visits per coach</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Needs Attention</p>
            <div className="flex gap-2 items-baseline">
              <span className="text-xl font-extrabold text-amber-700">{report.totals.underUtilisedCount}</span>
              <span className="text-[10px] text-gray-500">low</span>
              <span className="text-xl font-extrabold text-red-700 ml-1">{report.totals.overloadedCount}</span>
              <span className="text-[10px] text-gray-500">high</span>
            </div>
          </div>
        </div>

        {/* Coach table */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Coaches ({report.coaches.length})</p>
            <p className="text-[10px] text-gray-400">Sorted by visits in last 90 days</p>
          </div>
          {report.coaches.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No coaching activity in the last 90 days.</p>
            </div>
          ) : (
            <div className="px-2">
              <DashboardListHeader template="minmax(0,1.6fr) 130px 80px 90px 90px 100px 130px 70px">
                <span>Coach</span>
                <span className="text-center">Visits 90d</span>
                <span className="text-center">Schools</span>
                <span className="text-center">Obs / Visit</span>
                <span className="text-center">Fidelity</span>
                <span className="text-center">Last Visit</span>
                <span className="text-center">Status</span>
                <span />
              </DashboardListHeader>
              {report.coaches.map((c) => {
                const meta = statusMeta(c.workloadStatus);
                const StatusIcon = meta.icon;
                return (
                  <DashboardListRow
                    key={c.userId}
                    template="minmax(0,1.6fr) 130px 80px 90px 90px 100px 130px 70px"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-800 truncate">{c.fullName}</span>
                      <span className="block text-xs text-gray-400 truncate">{c.email}{c.role ? ` · ${c.role}` : ""}</span>
                    </span>
                    <span className="text-center">
                      <span className="font-bold text-gray-800">{c.visits90d}</span>
                      <span className="text-xs text-gray-400 ml-1">({c.visits30d} in 30d)</span>
                    </span>
                    <span className="text-center text-gray-700">{c.uniqueSchoolsVisited90d}</span>
                    <span className="text-center text-gray-700">{c.avgObsPerVisit}</span>
                    <span className="text-center">
                      {c.observationsSubmitted90d > 0 ? (
                        <span className={`text-sm font-bold ${
                          c.fidelityPct >= 70 ? "text-emerald-700" :
                          c.fidelityPct >= 40 ? "text-amber-700" : "text-red-600"
                        }`}>
                          {c.fidelityPct}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </span>
                    <span className="text-center text-xs text-gray-500">
                      {c.daysSinceLastVisit != null ? `${c.daysSinceLastVisit}d ago` : "Never"}
                    </span>
                    <span className="text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </span>
                    <span className="text-right">
                      <Link
                        href={`/portal/coach-workload/${c.userId}`}
                        className="text-xs text-[#006b61] font-semibold hover:underline inline-flex items-center gap-0.5"
                      >
                        Detail <ChevronRight className="w-3 h-3" />
                      </Link>
                    </span>
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 italic">
          Workload heuristics: 0 visits in 90d = inactive · 1–3 = under-utilised · 4–12 = balanced · 13–20 = stretched · 20+ = overloaded.
          A coach with no visit in 60+ days is flagged under-utilised regardless of historical totals.
        </p>
      </div>
    </PortalShell>
  );
}

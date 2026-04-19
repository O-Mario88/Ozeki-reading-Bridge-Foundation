import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { listAssessmentWindowsPostgres } from "@/lib/server/postgres/repositories/assessment-intelligence";
import { AssessmentScheduleBuilder } from "@/components/portal/AssessmentScheduleBuilder";
import { ScheduleComplianceCard } from "@/components/portal/ScheduleComplianceCard";
import { Calendar, ChevronLeft, Plus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assessment Schedule | Ozeki Portal" };

function stateColor(state: string) {
  if (state === "open") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (state === "upcoming") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-gray-50 text-gray-500 border-gray-200";
}

export default async function AssessmentSchedulePage() {
  const user = await requirePortalStaffUser();
  const windows = await listAssessmentWindowsPostgres();

  const open = windows.filter((w) => w.state === "open");
  const upcoming = windows.filter((w) => w.state === "upcoming");
  const closed = windows.filter((w) => w.state === "closed");

  return (
    <PortalShell
      user={user}
      activeHref="/portal/assessments"
      title="Assessment Schedule"
      description="Term windows for baseline, progress, and endline assessments with submission compliance tracking"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/portal/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Assessments overview
        </Link>

        {/* Currently open windows (with compliance) */}
        {open.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Currently Open
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {open.map((w) => (
                <ScheduleComplianceCard key={w.id} window={w} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming windows */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Upcoming</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {upcoming.map((w) => (
                <div key={w.id} className="rounded-2xl bg-white border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${stateColor(w.state)}`}>
                      {w.state}
                    </span>
                    <span className="text-xs text-gray-400">Term {w.termNumber} · {w.academicYear}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 capitalize mb-1">{w.assessmentType} cycle</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {w.windowOpen} → {w.windowClose}
                  </p>
                  {w.daysUntilOpen != null && (
                    <p className="text-xs text-blue-700 font-semibold">
                      Opens in {w.daysUntilOpen} day{w.daysUntilOpen === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Closed windows */}
        {closed.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Closed</h2>
            <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2 px-3 font-semibold">Cycle</th>
                    <th className="py-2 px-3 font-semibold">Year</th>
                    <th className="py-2 px-3 font-semibold">Term</th>
                    <th className="py-2 px-3 font-semibold">Window</th>
                    <th className="py-2 px-3 font-semibold text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((w) => (
                    <tr key={w.id} className="border-b border-gray-50">
                      <td className="py-2.5 px-3 capitalize font-medium text-gray-800">{w.assessmentType}</td>
                      <td className="py-2.5 px-3 text-gray-500">{w.academicYear}</td>
                      <td className="py-2.5 px-3 text-gray-500">Term {w.termNumber}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{w.windowOpen} → {w.windowClose}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/portal/assessments/schedule?windowId=${w.id}`}
                          className="text-xs text-[#006b61] font-semibold hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {windows.length === 0 && (
          <div className="rounded-2xl bg-white border border-dashed border-gray-200 py-16 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No assessment windows scheduled yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create windows for baseline (Term 1), progress (Term 2), and endline (Term 3) to drive compliance tracking.
            </p>
          </div>
        )}

        {/* Create new window (admin only) */}
        {(user.isAdmin || user.isSuperAdmin) && (
          <section className="pt-4 border-t border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Window
            </h2>
            <AssessmentScheduleBuilder />
          </section>
        )}
      </div>
    </PortalShell>
  );
}

import Link from "next/link";
import { getObservationDashboardStatsPostgres } from "@/lib/server/postgres/repositories/phonics-observations";
import { postObservationRatingLabel } from "@/lib/phonics-observation";

export async function ObservationsDashboardWidget() {
  let stats;
  try {
    stats = await getObservationDashboardStatsPostgres();
  } catch {
    return null;
  }

  if (stats.total === 0 && stats.draft === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
        <p className="text-sm font-medium text-gray-500 mb-1">No Lesson Observations Yet</p>
        <Link href="/portal/observations/new" className="text-sm text-blue-600 hover:underline">
          Record first observation →
        </Link>
      </div>
    );
  }

  const ratingBadge = (rating: string | null) => {
    if (rating === "fidelity") return "bg-blue-100 text-blue-800";
    if (rating === "partial") return "bg-yellow-100 text-yellow-800";
    if (rating === "low") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Lesson Observations</h3>
        <Link href="/portal/observations" className="text-xs text-blue-600 hover:underline">
          View all →
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-gray-900">{stats.submitted}</p>
          <p className="text-xs text-gray-500 mt-0.5">Submitted</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-amber-700">{stats.draft}</p>
          <p className="text-xs text-amber-600 mt-0.5">Drafts</p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-blue-700">{stats.fidelityCount}</p>
          <p className="text-xs text-blue-600 mt-0.5">Fidelity</p>
        </div>
      </div>

      {/* Rating breakdown */}
      {stats.total > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {stats.fidelityCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {stats.fidelityCount} Fidelity
            </span>
          )}
          {stats.partialCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {stats.partialCount} Partial
            </span>
          )}
          {stats.lowCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {stats.lowCount} Low
            </span>
          )}
        </div>
      )}

      {/* Recent observations */}
      {stats.recentObservations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recent</p>
          {stats.recentObservations.slice(0, 4).map((obs) => (
            <Link
              key={obs.id}
              href={`/portal/observations/${obs.id}`}
              className="flex items-center justify-between rounded-md p-2.5 hover:bg-gray-50 transition border border-transparent hover:border-gray-100"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{obs.teacherName}</p>
                <p className="text-xs text-gray-500 truncate">{obs.schoolName} · {obs.classLevel}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className="text-xs text-gray-400">
                  {new Date(obs.observationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </span>
                {obs.overallPostObservationRating && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ratingBadge(obs.overallPostObservationRating)}`}>
                    {postObservationRatingLabel(obs.overallPostObservationRating).split(" ")[0]}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <Link
          href="/portal/observations/new"
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          + Record new observation
        </Link>
      </div>
    </div>
  );
}

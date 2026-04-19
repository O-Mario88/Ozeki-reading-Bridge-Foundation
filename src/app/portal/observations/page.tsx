import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { listObservationsPostgres } from "@/lib/server/postgres/repositories/phonics-observations";
import { postObservationRatingLabel } from "@/lib/phonics-observation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lesson Observations | Ozeki Portal", description: "Teacher Phonics & Reading Lesson Observation records." };

export default async function ObservationsListPage() {
  const user = await requirePortalUser();
  const isAdmin = user.isAdmin || user.isSuperAdmin;

  const observations = await listObservationsPostgres({
    createdByUserId: isAdmin ? undefined : user.id,
    limit: 200,
  });

  const statusBadge = (status: string) => {
    if (status === "submitted") return "bg-green-100 text-green-800";
    if (status === "draft") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-600";
  };

  const ratingBadge = (rating: string | null) => {
    if (rating === "fidelity") return "bg-blue-100 text-blue-800";
    if (rating === "partial") return "bg-yellow-100 text-yellow-800";
    if (rating === "low") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <PortalShell user={user} activeHref="/portal/observations" title="Lesson Observations">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Teacher Phonics &amp; Reading Lesson Observations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {observations.length} observation{observations.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <Link
            href="/portal/observations/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            + New Observation
          </Link>
        </div>

        {observations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">👁</p>
            <p className="font-medium text-gray-600">No observations recorded yet.</p>
            <p className="text-sm text-gray-400 mt-1">Start by creating a new observation.</p>
            <Link href="/portal/observations/new" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
              Create first observation →
            </Link>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Teacher</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">School</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Observer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Rating</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs) => (
                  <tr key={obs.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{obs.observationCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{obs.teacherName}</td>
                    <td className="px-4 py-3 text-gray-600">{obs.schoolName}</td>
                    <td className="px-4 py-3 text-gray-600">{obs.classLevel}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(obs.observationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{obs.observerName}</td>
                    <td className="px-4 py-3">
                      {obs.overallPostObservationRating ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ratingBadge(obs.overallPostObservationRating)}`}>
                          {postObservationRatingLabel(obs.overallPostObservationRating)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(obs.status)}`}>
                        {obs.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/portal/observations/${obs.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        {obs.status === "submitted" ? "View" : "Edit"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import PhonicsObservationForm from "@/components/portal/PhonicsObservationForm";
import { getObservationByIdPostgres } from "@/lib/server/postgres/repositories/phonics-observations";
import { postObservationRatingLabel } from "@/lib/phonics-observation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Observation #${id} | Ozeki Portal` };
}

export default async function ObservationDetailPage({ params }: Props) {
  const user = await requirePortalUser();
  const { id } = await params;
  const obs = await getObservationByIdPostgres(Number(id));

  if (!obs) notFound();

  const isAdmin = user.isAdmin || user.isSuperAdmin;
  const canEdit = isAdmin || obs.createdByUserId === user.id || obs.observerUserId === user.id;
  const isArchived = obs.status === "archived";

  return (
    <PortalShell user={user} activeHref="/portal/observations" title="Lesson Observation">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/portal/observations" className="text-sm text-blue-600 hover:underline">
            ← Observations
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-500 font-mono">{obs.observationCode}</span>
          {obs.overallPostObservationRating && (
            <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
              obs.overallPostObservationRating === "fidelity" ? "bg-blue-100 text-blue-800" :
              obs.overallPostObservationRating === "partial" ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            }`}>
              {postObservationRatingLabel(obs.overallPostObservationRating)}
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
            obs.status === "submitted" ? "bg-green-100 text-green-800" :
            obs.status === "draft" ? "bg-amber-100 text-amber-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {obs.status}
          </span>
        </div>

        {isArchived && (
          <div className="mb-5 rounded-md px-4 py-3 bg-gray-50 border border-gray-200 text-sm text-gray-600">
            This observation has been archived and is read-only.
          </div>
        )}

        {canEdit && !isArchived ? (
          <PhonicsObservationForm mode="edit" existingObservation={obs} />
        ) : (
          <PhonicsObservationForm mode="edit" existingObservation={obs} />
        )}

        {/* Admin archive action */}
        {isAdmin && !isArchived && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer hover:text-gray-600">Admin actions</summary>
              <div className="mt-3">
                <form action={`/api/portal/observations/${obs.id}`} method="DELETE">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Archive this observation? It will become read-only.")) return;
                      await fetch(`/api/portal/observations/${obs.id}`, { method: "DELETE" });
                      window.location.href = "/portal/observations";
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Archive observation
                  </button>
                </form>
              </div>
            </details>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

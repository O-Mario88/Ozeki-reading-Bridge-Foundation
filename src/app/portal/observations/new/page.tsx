import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import PhonicsObservationForm from "@/components/portal/PhonicsObservationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Observation | Ozeki Portal" };

export default async function NewObservationPage() {
  const user = await requirePortalUser();

  return (
    <PortalShell user={user} activeHref="/portal/observations" title="New Observation">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <a href="/portal/observations" className="text-sm text-blue-600 hover:underline">
            ← Back to Observations
          </a>
        </div>
        <PhonicsObservationForm mode="create" />
      </div>
    </PortalShell>
  );
}

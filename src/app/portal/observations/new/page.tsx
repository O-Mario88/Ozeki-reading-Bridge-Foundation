import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { ObservationFormModalShell } from "@/components/portal/ObservationFormModalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Observation | Ozeki Portal" };

export default async function NewObservationPage() {
  const user = await requirePortalUser();
  return (
    <PortalShell user={user} activeHref="/portal/observations" hideFrame>
      {/* Multi-step Lesson Observation form rendered inside a floating
          FormModal — same surgical UX used by every other "New …" form
          in the portal (NewContactModal, EnrollmentFormModal, etc.).
          Closing returns to the Observations list. */}
      <ObservationFormModalShell mode="create" />
    </PortalShell>
  );
}

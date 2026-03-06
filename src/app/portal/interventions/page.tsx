import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Intervention Manager",
  description: "Planning and action tracking across school and district intervention plans.",
};

export default async function PortalInterventionsPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/interventions"
      title="Intervention Manager"
      description="Create plans, assign action owners, and link visit/training/assessment/story evidence for follow-up accountability."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="interventions" />
    </PortalShell>
  );
}

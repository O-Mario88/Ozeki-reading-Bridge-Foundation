import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "National Literacy Intelligence",
  description:
    "Benchmark governance, education data quality, national insights, priority queue, interventions, report packs, and partner exports.",
};

export default async function PortalNationalIntelligencePage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/national-intelligence"
      title="National Literacy Intelligence"
      description="Education operating system for Uganda: benchmarks, quality controls, insights, interventions, and government-grade reporting."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="insights" />
    </PortalShell>
  );
}

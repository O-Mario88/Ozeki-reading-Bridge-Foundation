import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Education Data Quality Center",
  description: "Exception queue, quality summaries, and sweep controls.",
};

export default async function PortalDataQualityPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/data-quality"
      title="Education Data Quality Center"
      description="Automated missingness, validity, consistency, and coverage checks with fix workflow routing."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="data_quality" />
    </PortalShell>
  );
}

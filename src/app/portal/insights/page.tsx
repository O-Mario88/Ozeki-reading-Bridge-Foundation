import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "National Insights",
  description: "Aggregated movement trends, cohort tracking, and aligned drivers.",
};

export default async function PortalInsightsPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/insights"
      title="National Insights"
      description="Trend movement, cohort comparisons, and aligned implementation drivers (descriptive, not causal)."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="insights" />
    </PortalShell>
  );
}

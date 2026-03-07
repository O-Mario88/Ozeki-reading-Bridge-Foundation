import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "National Report Packs",
  description: "Generate quarterly/annual government-grade report presets and exports.",
};

export default async function PortalNationalReportsPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/national-reports"
      title="National Report Packs"
      description="Generate facts-first report packs with AI-guarded narrative and PDF exports."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="reports" />
    </PortalShell>
  );
}

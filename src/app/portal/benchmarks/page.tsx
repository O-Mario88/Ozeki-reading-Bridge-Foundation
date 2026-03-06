import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Benchmark Settings",
  description: "Versioned benchmark profile and rules management.",
};

export default async function PortalBenchmarksPage() {
  const user = await requirePortalSuperAdminUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/benchmarks"
      title="Benchmark Settings"
      description="Create and activate versioned benchmark profiles and grade/language rules."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="benchmarks" />
    </PortalShell>
  );
}

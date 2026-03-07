import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "National Priority Queue",
  description: "Rule-based early warning for at-risk schools and assignment workflow.",
};

export default async function PortalPriorityQueuePage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/priority-queue"
      title="National Priority Queue"
      description="Risk-scored schools and districts with evidence summaries and one-click intervention planning."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab="priority_queue" />
    </PortalShell>
  );
}

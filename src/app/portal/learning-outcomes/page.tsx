import { PortalShell } from "@/components/portal/PortalShell";
import { LearningOutcomesView } from "@/components/portal/learning-outcomes/LearningOutcomesView";
import { requirePortalStaffUser } from "@/lib/auth";
import { getPortalLearningOutcomesSnapshot } from "@/lib/server/postgres/repositories/portal-learning-outcomes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learning Outcomes | Ozeki Portal" };

export default async function PortalLearningOutcomesPage() {
  const user = await requirePortalStaffUser();
  const snapshot = await getPortalLearningOutcomesSnapshot();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/learning-outcomes"
      hideFrame
      subtitle="Here's what's happening in your command center."
    >
      <LearningOutcomesView snapshot={snapshot} />
    </PortalShell>
  );
}

import { PortalGraduationQueueManager } from "@/components/portal/PortalGraduationQueueManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listGraduationQueue, listGraduationReviewSupervisors } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Graduation Queue",
  description: "Review schools that meet Ozeki graduation criteria and confirm exit decisions.",
};

export default async function PortalGraduationQueuePage() {
  const user = await requirePortalStaffUser();
  const queue = listGraduationQueue({ limit: 500, includeSnoozed: false, refresh: true });
  const supervisors = listGraduationReviewSupervisors();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/graduation-queue"
      title="School Graduation Queue"
      description="Condition-based graduation workflow driven by live assessment, story, and lesson-evaluation data."
    >
      <PortalGraduationQueueManager initialQueue={queue} supervisors={supervisors} />
    </PortalShell>
  );
}


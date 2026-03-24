import { notFound } from "next/navigation";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmProfileView } from "@/components/portal/crm/PortalCrmProfileView";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getTrainingCrmProfile } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalTrainingProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const trainingId = Number(id);
  if (!Number.isInteger(trainingId) || trainingId <= 0) {
    notFound();
  }

  const profile = await getTrainingCrmProfile(trainingId);
  if (!profile) {
    notFound();
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/trainings"
      title={profile.title}
      description={profile.subtitle ?? undefined}
      actions={
        <div className="action-row">
          <Link href={`/portal/trainings/participants/new?trainingId=${trainingId}`} className="button">
            Add Participant
          </Link>
          <Link href={`/portal/trainings/${trainingId}/feedback`} className="button button-secondary">
            Participants Feedback
          </Link>
        </div>
      }
    >
      <PortalCrmProfileView profile={profile} />
    </PortalShell>
  );
}

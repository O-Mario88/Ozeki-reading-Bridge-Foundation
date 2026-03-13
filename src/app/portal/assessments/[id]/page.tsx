import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmProfileView } from "@/components/portal/crm/PortalCrmProfileView";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getAssessmentCrmProfile } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalAssessmentProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const assessmentId = Number(id);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    notFound();
  }

  const profile = await getAssessmentCrmProfile(assessmentId);
  if (!profile) {
    notFound();
  }

  return (
    <PortalShell user={user} activeHref="/portal/assessments" title={profile.title} description={profile.subtitle ?? undefined}>
      <PortalCrmProfileView profile={profile} />
    </PortalShell>
  );
}

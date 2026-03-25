import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmProfileView } from "@/components/portal/crm/PortalCrmProfileView";
import { requirePortalStaffUser } from "@/lib/auth";
import { getEvaluationCrmProfile } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalEvaluationProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const evaluationId = Number(id);
  if (!Number.isInteger(evaluationId) || evaluationId <= 0) {
    notFound();
  }

  const profile = await getEvaluationCrmProfile(evaluationId);
  if (!profile) {
    notFound();
  }

  return (
    <PortalShell user={user} activeHref="/portal/schools" title={profile.title} description={profile.subtitle ?? undefined}>
      <PortalCrmProfileView profile={profile} />
    </PortalShell>
  );
}

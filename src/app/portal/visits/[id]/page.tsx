import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmProfileView } from "@/components/portal/crm/PortalCrmProfileView";
import { PhotoEvidenceGallery } from "@/components/portal/evidence/PhotoEvidenceGallery";
import { requirePortalStaffUser } from "@/lib/auth";
import { getVisitCrmProfile } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalVisitProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId) || visitId <= 0) {
    notFound();
  }

  const profile = await getVisitCrmProfile(visitId);
  if (!profile) {
    notFound();
  }

  return (
    <PortalShell user={user} activeHref="/portal/visits" title={profile.title} description={profile.subtitle ?? undefined}>
      <PortalCrmProfileView profile={profile} />
      <div className="mt-6">
        <PhotoEvidenceGallery
          parentType="coaching_visit"
          parentId={visitId}
          allowUpload
        />
      </div>
    </PortalShell>
  );
}

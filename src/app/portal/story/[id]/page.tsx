import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmProfileView } from "@/components/portal/crm/PortalCrmProfileView";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getStoryProjectCrmProfile } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalStoryProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    notFound();
  }

  const profile = await getStoryProjectCrmProfile(storyId);
  if (!profile) {
    notFound();
  }

  return (
    <PortalShell user={user} activeHref="/portal/story" title={profile.title} description={profile.subtitle ?? undefined}>
      <PortalCrmProfileView profile={profile} />
    </PortalShell>
  );
}

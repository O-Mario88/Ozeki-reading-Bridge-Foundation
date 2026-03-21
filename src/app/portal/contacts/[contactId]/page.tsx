import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmProfileView } from "@/components/portal/crm/PortalCrmProfileView";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getContactCrmProfile } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default async function PortalContactProfilePage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { contactId } = await params;
  const id = Number(contactId);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const profile = await getContactCrmProfile(id);
  if (!profile) {
    notFound();
  }

  return (
    <PortalShell user={user} activeHref="/portal/contacts" title={profile.title} description={profile.subtitle ?? undefined}>
      <PortalCrmProfileView profile={profile} contactId={id} />
    </PortalShell>
  );
}

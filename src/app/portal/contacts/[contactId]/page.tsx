import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { ContactProfileView } from "@/components/portal/contact-profile/ContactProfileView";
import { requirePortalStaffUser } from "@/lib/auth";
import { getContactProfileSnapshot } from "@/lib/server/postgres/repositories/contact-profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact Profile | Ozeki Portal" };

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

  const snapshot = await getContactProfileSnapshot(id);
  if (!snapshot) {
    notFound();
  }

  // The page handles its own page-title row (Contact Profile + breadcrumb),
  // so the shell only renders the welcome strip + sidebar chrome. The
  // subtitle is contextual: "Here's what's happening at <primary school>".
  const subtitle = snapshot.identity.primarySchoolName
    ? `Here's what's happening at ${snapshot.identity.primarySchoolName}.`
    : "Here's what's happening across your contact network.";

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      hideFrame
      subtitle={subtitle}
    >
      <ContactProfileView snapshot={snapshot} />
    </PortalShell>
  );
}

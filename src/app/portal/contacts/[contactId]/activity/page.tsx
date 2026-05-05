import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { MobileActivityInvolvementView } from "@/components/portal/contact-profile/MobileActivityInvolvementView";
import { ContactProfileView } from "@/components/portal/contact-profile/ContactProfileView";
import { requirePortalStaffUser } from "@/lib/auth";
import { canExportData } from "@/lib/permissions";
import { getContactProfileSnapshot } from "@/lib/server/postgres/repositories/contact-profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity & Involvement | Ozeki Portal" };

interface PageProps {
  params: Promise<{ contactId: string }>;
}

/**
 * Mobile-first sub-route of the contact profile. Shows the screenshot's
 * Activity & Involvement screen on phones; on desktop, since the regular
 * Contact Profile already includes the Activity Timeline + Coaching &
 * Evaluations + Meetings & Engagements cards, we just render the same
 * desktop view rather than building a parallel desktop activity layout.
 */
export default async function PortalContactActivityPage({ params }: PageProps) {
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
      <MobileActivityInvolvementView snapshot={snapshot} />
      <div className="hidden lg:block">
        <ContactProfileView snapshot={snapshot} canExport={canExportData(user)} />
      </div>
    </PortalShell>
  );
}

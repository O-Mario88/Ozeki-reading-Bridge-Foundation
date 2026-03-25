import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmListView } from "@/components/portal/crm/PortalCrmListView";
import { requirePortalStaffUser } from "@/lib/auth";
import { listContactCrmRows } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contacts",
  description: "CRM-style school-contact profiles linked to schools, trainings, visits, and assessments.",
};

export default async function PortalContactsPage() {
  const user = await requirePortalStaffUser();
  const view = await listContactCrmRows();

  return (
    <PortalShell user={user} activeHref="/portal/contacts" title={view.title} description={view.subtitle}>
      <PortalCrmListView view={view} />
    </PortalShell>
  );
}

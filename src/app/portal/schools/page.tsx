import { PortalSchoolsManager } from "@/components/portal/PortalSchoolsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listSchoolDirectoryRecords } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools Directory",
  description: "Manage school records, contacts, and location references.",
};

export default async function PortalSchoolsPage() {
  const user = await requirePortalUser();
  const schools = listSchoolDirectoryRecords();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="Schools Directory"
      description="Maintain unique School IDs, contacts, and location details for operations and reporting."
    >
      <PortalSchoolsManager initialSchools={schools} />
    </PortalShell>
  );
}

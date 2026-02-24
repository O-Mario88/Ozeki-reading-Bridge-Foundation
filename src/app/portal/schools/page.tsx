import { PortalSchoolsManager } from "@/components/portal/PortalSchoolsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listSchoolDirectoryRecords } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools Directory",
  description: "Manage school records, contacts, and location references.",
};

export default async function PortalSchoolsPage() {
  const user = await requirePortalStaffUser();
  const schools = listSchoolDirectoryRecords();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="Schools Directory"
      description="Maintain unique School IDs, contacts, and location details for operations and reporting."
      actions={
        <div className="action-row">
          <Link href="/portal/reports?module=all" className="button button-ghost">
            Open Schools Report
          </Link>
        </div>
      }
    >
      <PortalSchoolsManager initialSchools={schools} />
    </PortalShell>
  );
}

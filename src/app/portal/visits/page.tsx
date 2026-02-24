import { PortalModuleManager } from "@/components/portal/PortalModuleManager";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listPortalRecords,
  listPortalUsersForFilters,
  listSchoolDirectoryRecords,
} from "@/lib/db";
import { portalModuleConfigByModule } from "@/lib/portal-config";
import { requirePortalUser } from "@/lib/portal-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School Visits",
  description: "Staff portal visit logs and coaching workflow.",
};

export default async function PortalVisitsPage() {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule.visit;
  const records = listPortalRecords({ module: "visit" }, user);
  const schools = listSchoolDirectoryRecords();
  const users = listPortalUsersForFilters(user);

  return (
    <PortalShell
      user={user}
      activeHref={config.route}
      title={config.pageTitle}
      description={config.description}
      actions={
        <div className="action-row">
          <Link href="/portal/reports?module=visit" className="button button-ghost">
            Open Visit Report
          </Link>
        </div>
      }
    >
      <PortalModuleManager
        config={config}
        initialRecords={records}
        initialSchools={schools}
        initialUsers={users}
        currentUser={user}
      />
    </PortalShell>
  );
}

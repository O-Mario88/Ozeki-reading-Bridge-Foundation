import { PortalModuleManager } from "@/components/portal/PortalModuleManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listPortalRecords, listPortalUsersForFilters } from "@/lib/db";
import { portalModuleConfigByModule } from "@/lib/portal-config";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School Visits",
  description: "Staff portal visit logs and coaching workflow.",
};

export default async function PortalVisitsPage() {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule.visit;
  const records = listPortalRecords({ module: "visit" }, user);
  const users = listPortalUsersForFilters(user);

  return (
    <PortalShell
      user={user}
      activeHref={config.route}
      title={config.pageTitle}
      description={config.description}
    >
      <PortalModuleManager
        config={config}
        initialRecords={records}
        initialUsers={users}
        currentUser={user}
      />
    </PortalShell>
  );
}

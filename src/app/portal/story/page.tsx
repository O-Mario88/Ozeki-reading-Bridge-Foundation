import { PortalModuleManager } from "@/components/portal/PortalModuleManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listPortalRecords, listPortalUsersForFilters } from "@/lib/db";
import { portalModuleConfigByModule } from "@/lib/portal-config";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "1001 Story",
  description: "Staff portal for 1001 Story activity logs and support workflows.",
};

export default async function PortalStoryPage() {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule.story;
  const records = listPortalRecords({ module: "story" }, user);
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

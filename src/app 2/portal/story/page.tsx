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
  title: "1001 Story",
  description: "Staff portal for 1001 Story activity logs and support workflows.",
};

export default async function PortalStoryPage() {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule.story;
  const records = listPortalRecords({ module: "story" }, user);
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
          <Link href="/portal/reports?module=story" className="button button-ghost">
            Open 1001 Story Report
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

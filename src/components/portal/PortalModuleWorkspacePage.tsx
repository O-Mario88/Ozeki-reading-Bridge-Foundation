import Link from "next/link";
import { PortalModuleManager } from "@/components/portal/PortalModuleManager";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listPortalRecordsAsync,
  listPortalUsersForFilters,
  listSchoolDirectoryRecords,
} from "@/services/dataService";
import { portalModuleConfigByModule } from "@/lib/portal-config";
import { requirePortalUser } from "@/lib/portal-auth";
import type { PortalRecordModule } from "@/lib/types";

interface PortalModuleWorkspacePageProps {
  module: Extract<PortalRecordModule, "training" | "visit" | "assessment" | "story">;
  reportHref: string;
  reportLabel: string;
}

export async function PortalModuleWorkspacePage({
  module,
  reportHref,
  reportLabel,
}: PortalModuleWorkspacePageProps) {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule[module];
  const records = await listPortalRecordsAsync({ module }, user);
  const schools = await listSchoolDirectoryRecords();
  const users = await listPortalUsersForFilters(user);

  return (
    <PortalShell
      user={user}
      activeHref={config.route}
      title={`${config.pageTitle} Workspace`}
      description={config.description}
      actions={
        <div className="action-row">
          <Link href={config.route} className="button button-ghost">
            Open {config.pageTitle} Profiles
          </Link>
          <Link href={reportHref} className="button button-ghost">
            {reportLabel}
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

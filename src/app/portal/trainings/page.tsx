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
  title: "Trainings",
  description: "Staff portal training logs and review workflow.",
};

export default async function PortalTrainingsPage() {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule.training;
  const records = listPortalRecords({ module: "training" }, user);
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
          <Link href="/portal/reports?module=training" className="button button-ghost">
            Open Training Report
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

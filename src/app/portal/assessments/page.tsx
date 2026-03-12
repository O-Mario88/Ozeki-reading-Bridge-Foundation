import { PortalModuleManager } from "@/components/portal/PortalModuleManager";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listPortalRecordsAsync,
  listPortalUsersForFilters,
  listSchoolDirectoryRecords,
} from "@/lib/db";
import { portalModuleConfigByModule } from "@/lib/portal-config";
import { requirePortalUser } from "@/lib/portal-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessments",
  description: "Staff portal learner assessment logs and review workflow.",
};

export default async function PortalAssessmentsPage() {
  const user = await requirePortalUser();
  const config = portalModuleConfigByModule.assessment;
  const records = await listPortalRecordsAsync({ module: "assessment" }, user);
  const schools = await listSchoolDirectoryRecords();
  const users = listPortalUsersForFilters(user);

  return (
    <PortalShell
      user={user}
      activeHref={config.route}
      title={config.pageTitle}
      description={config.description}
      actions={
        <div className="action-row">
          <Link href="/portal/reports?module=learner-assessment" className="button button-ghost">
            Open Assessments Report
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

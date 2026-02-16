import { PortalResourcesManager } from "@/components/portal/PortalResourcesManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listPortalResources } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Resources",
  description: "Upload resource files or external links and map public download buttons.",
};

export default async function PortalResourcesPage() {
  const user = await requirePortalStaffUser();
  const resources = listPortalResources(user, 260).map((resource) => ({
    ...resource,
    downloadUrl: resource.externalUrl || `/api/resources/${resource.id}/download`,
  }));

  return (
    <PortalShell
      user={user}
      activeHref="/portal/resources"
      title="Document Upload Manager"
      description="Upload files, choose a document area (Resources, Compliance, Financial, Safeguarding, etc.), and map public download buttons automatically."
    >
      <PortalResourcesManager initialResources={resources} />
    </PortalShell>
  );
}

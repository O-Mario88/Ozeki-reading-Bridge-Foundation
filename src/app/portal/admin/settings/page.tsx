import { PortalShell } from "@/components/portal/PortalShell";
import { OrganizationProfileManager } from "@/components/portal/admin/OrganizationProfileManager";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Settings",
  description: "System-level governance and document branding settings.",
};

export default async function PortalAdminSettingsPage() {
  const user = await requirePortalSuperAdminUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/settings"
      title="Admin Settings"
      description="Manage organization identity metadata used by shared PDF generation."
    >
      <OrganizationProfileManager />
    </PortalShell>
  );
}

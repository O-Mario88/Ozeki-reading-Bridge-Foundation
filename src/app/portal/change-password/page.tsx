import { PortalForcePasswordChange } from "@/components/portal/PortalForcePasswordChange";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Change Password",
  description: "Set a new password for your ORBF portal account.",
};

export default async function PortalChangePasswordPage() {
  const user = await requirePortalUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/change-password"
      title="Change Password"
      description="Set a new password to continue using the portal."
    >
      <PortalForcePasswordChange />
    </PortalShell>
  );
}

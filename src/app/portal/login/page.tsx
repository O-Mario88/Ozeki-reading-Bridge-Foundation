import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { getCurrentPortalUser, getPortalHomePath } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Portal Sign In",
  description: "Secure staff portal sign-in for operations and M&E data submission.",
};

export default async function PortalLoginPage() {
  const user = await getCurrentPortalUser();

  if (user) {
    redirect(getPortalHomePath(user));
  }

  // Note: the PWA install button used to live here. It now lives behind
  // InstallAppGate, mounted in OzekiPortalShell, which only surfaces it
  // after 10 minutes of authenticated portal activity. Showing it on the
  // login page would contradict the "must have logged in and used backend
  // for ~10 minutes" install rule.
  return (
    <div className="portal-login-page">
      <div className="portal-login-page-inner">
        <PortalLoginForm />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { InstallAppButton } from "@/components/InstallAppButton";
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

  return (
    <div className="portal-login-page">
      <div className="portal-login-page-inner">
        <PortalLoginForm />
        {/* Install-on-phone CTA — renders only on mobile browsers when the
            app isn't already installed. Tapping triggers the native install
            prompt on Android/Chrome, or shows the Add-to-Home-Screen
            instructions on iOS Safari (Apple has no programmatic API). */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <InstallAppButton />
        </div>
      </div>
    </div>
  );
}

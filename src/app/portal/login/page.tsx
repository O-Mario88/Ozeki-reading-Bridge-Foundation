import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { getCurrentPortalUser, getPortalHomePath } from "@/lib/portal-auth";

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
      </div>
    </div>
  );
}

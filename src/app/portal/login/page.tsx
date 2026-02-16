import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { getCurrentPortalUser, getPortalHomePath } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Portal Sign In",
  description:
    "Secure staff portal sign-in for operations and M&E data submission.",
};

export default async function PortalLoginPage() {
  const user = await getCurrentPortalUser();

  if (user) {
    redirect(getPortalHomePath(user));
  }

  return (
    <>
      <PageHero
        kicker="Staff and volunteer portal"
        title="Ozeki Staff Portal Sign-in"
        description="For Ozeki staff only. Use your email or phone and password to submit field data."
      />

      <section className="section">
        <div className="container card">
          <PortalLoginForm />
        </div>
      </section>
    </>
  );
}

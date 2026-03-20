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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-white">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px"
        }}
      />
      {/* Soft gradient accent from Ozeki system colors */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-[440px] px-6 relative z-10">
        <PortalLoginForm />
      </div>
    </div>
  );
}

import { ExternalLoginShell } from "@/components/external/ExternalLoginShell";

export const metadata = { title: "Donor sign-in · Ozeki Reading Bridge" };

export default function DonorLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <ExternalLoginShell
        role="donor"
        roleLabel="Donor"
        helperText="See exactly which children, teachers, and schools your support is reaching — with photos, GPS-verified visits, and live cost-per-impact figures."
        showOrganization
      />
    </main>
  );
}

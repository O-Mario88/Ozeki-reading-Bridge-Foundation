import { ExternalLoginShell } from "@/components/external/ExternalLoginShell";

export const metadata = { title: "Government sign-in · Ozeki Reading Bridge" };

export default function GovernmentLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <ExternalLoginShell
        role="district_officer"
        roleLabel="District / Government"
        helperText="See your district's roster, schedule interventions, and review fidelity scores for schools in your jurisdiction."
        showOrganization
        showDistrict
      />
    </main>
  );
}

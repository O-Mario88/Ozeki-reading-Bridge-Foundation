import { ExternalLoginShell } from "@/components/external/ExternalLoginShell";

export const metadata = { title: "Partner sign-in · Ozeki Reading Bridge" };

export default function PartnerLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <ExternalLoginShell
        role="partner"
        roleLabel="Partner"
        helperText="Coordinate with our team, view shared reach metrics, and embed live impact widgets on your own site."
        showOrganization
      />
    </main>
  );
}

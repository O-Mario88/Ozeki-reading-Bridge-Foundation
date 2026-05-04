import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";

export const dynamic = "force-dynamic";

export default async function GovernmentDashboardPage() {
  const user = await requireExternalUser("district_officer");
  return (
    <ExternalShell user={user} roleLabel="District / Government" title={`District officer · ${user.district ?? "Unassigned"}`}>
      <p className="text-sm text-gray-700">
        Hi {user.fullName.split(" ")[0]} — once your district assignment is confirmed, you'll see
        your district roster, intervention scheduling tools, and school fidelity scores here.
      </p>
    </ExternalShell>
  );
}

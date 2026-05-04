import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
  const user = await requireExternalUser("parent");
  return (
    <ExternalShell user={user} roleLabel="Parent" title="Your child's reading journey">
      <p className="text-sm text-gray-700">
        Hi {user.fullName.split(" ")[0]} — once your child is linked to your account by their school,
        you'll see their reading-stage progress here, plus a printable reading passport.
      </p>
    </ExternalShell>
  );
}

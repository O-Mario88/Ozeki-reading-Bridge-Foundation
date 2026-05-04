import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await requireExternalUser("teacher");
  return (
    <ExternalShell user={user} roleLabel="Teacher" title="Your training portal">
      <p className="text-sm text-gray-700">
        Hi {user.fullName.split(" ")[0]} — your training history, coaching feedback, and verifiable
        credentials will appear here once your school account is linked.
      </p>
    </ExternalShell>
  );
}

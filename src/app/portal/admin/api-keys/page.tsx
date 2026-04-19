import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { ApiKeysManager } from "@/components/portal/admin/ApiKeysManager";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "API Keys | Ozeki Admin" };

export default async function ApiKeysAdminPage() {
  const user = await requirePortalUser();
  if (!user.isAdmin && !user.isSuperAdmin) {
    redirect("/portal/dashboard");
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/api-keys"
      title="National Intelligence API Keys"
      description="Authenticated read-only access for Ministry, UNICEF, university partners, and research teams"
    >
      <div className="max-w-5xl mx-auto px-4 py-6">
        <ApiKeysManager />
      </div>
    </PortalShell>
  );
}

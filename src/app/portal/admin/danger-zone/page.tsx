import { redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DangerZoneWipe } from "@/components/portal/admin/DangerZoneWipe";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danger Zone | Ozeki Admin" };

export default async function DangerZonePage() {
  const user = await requirePortalUser();
  if (!user.isSuperAdmin) {
    redirect("/portal/dashboard");
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/danger-zone"
      title="Danger Zone"
      description="Irreversible actions. Super-admin only."
    >
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-red-900 mb-1">You are in the Danger Zone</h2>
              <p className="text-sm text-red-800">
                Actions here cannot be undone. Every operation below deletes data
                from the production database. Make sure you have the RDS snapshot
                for this moment before proceeding.
              </p>
            </div>
          </div>
        </div>

        <DangerZoneWipe />
      </div>
    </PortalShell>
  );
}

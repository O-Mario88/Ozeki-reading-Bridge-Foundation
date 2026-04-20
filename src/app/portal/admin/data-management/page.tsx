import { redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DataManagementPanel } from "@/components/portal/admin/DataManagementPanel";
import { getCategoryCountsPostgres } from "@/lib/server/postgres/repositories/data-management";
import { Database, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data Management | Ozeki Admin" };

export default async function DataManagementPage() {
  const user = await requirePortalUser();
  if (!user.isSuperAdmin) {
    redirect("/portal/dashboard");
  }
  const initialCategories = await getCategoryCountsPostgres().catch(() => []);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/admin/data-management"
      title="Data Management"
      description="Selectively clear test data by category. Super-admin only."
    >
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-red-900 mb-1">You are in Data Management</h2>
              <p className="text-sm text-red-800">
                Each &ldquo;Clear&rdquo; action truncates the tables in that category and cannot be undone.
                Configuration + reference tables (settings, currency rates, Uganda geo hierarchy,
                audited PDFs, portal users) are always preserved.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-gray-400" />
            How this works
          </h3>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
            <li>Each card shows current row count + number of tables in the category.</li>
            <li>Clearing requires typing the category name exactly to confirm.</li>
            <li>Clears run inside a single transaction — any error rolls back.</li>
            <li>A single audit_logs entry is written after each clear so there&apos;s a forensic record.</li>
          </ul>
        </div>

        <DataManagementPanel initialCategories={initialCategories} />
      </div>
    </PortalShell>
  );
}

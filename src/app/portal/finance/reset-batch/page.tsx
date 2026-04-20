import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceResetPanel } from "@/components/portal/FinanceResetPanel";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance Reset | Ozeki Portal (super-admin)" };

export default async function FinanceResetPage() {
  const user = await requirePortalUser();
  if (!user.isSuperAdmin) redirect("/portal/finance");

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title="Finance Reset Batch"
      description="One-time remediation for duplicate invoices / receipts / ledger rows (audit 2026-04)."
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Finance overview
        </Link>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-amber-900">Hybrid reset — preserves audit history</h2>
              <p className="text-sm text-amber-800 mt-1">
                This tool archives (not deletes) duplicate ledger rows, stale pre-payment draft
                receipts, and orphan IPN receipts, then recomputes invoice balances against the
                remaining non-archived payments. Every row keeps its full audit trail; archived
                rows are simply excluded from active dashboards, transparency KPIs, and reports.
              </p>
              <p className="text-sm text-amber-800 mt-2">
                Always <strong>dry-run first</strong> to see the projected counts. The real batch
                requires typing a confirmation phrase and is a one-shot audit-logged action.
              </p>
            </div>
          </div>
        </div>

        <FinanceResetPanel />
      </div>
    </PortalShell>
  );
}

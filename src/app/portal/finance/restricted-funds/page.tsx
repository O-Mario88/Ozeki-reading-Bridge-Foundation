import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { getRestrictedFundsBurnPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import {
  AlertTriangle, Clock, CheckCircle2, ChevronLeft, Lock, Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Restricted Funds Burn Rate | Ozeki Finance" };

function fmt(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`;
}

function statusMeta(status: string) {
  switch (status) {
    case "expired":
      return { color: "bg-red-50 text-red-800 border-red-200", icon: AlertTriangle, label: "Expired" };
    case "critical":
      return { color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle, label: "Critical" };
    case "warning":
      return { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, label: "Warning" };
    default:
      return { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Healthy" };
  }
}

export default async function RestrictedFundsPage() {
  const user = await requirePortalStaffUser();
  const funds = await getRestrictedFundsBurnPostgres();

  const alertCount = funds.filter((f) => f.status === "critical" || f.status === "expired").length;
  const totalRemaining = funds.reduce((a, f) => a + f.remaining, 0);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title="Restricted Funds"
      description="Burn rate and remaining balance for each restricted donation — alerts when funds are close to expiring unspent"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Finance overview
        </Link>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Restricted Funds</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{funds.length}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Unspent Balance</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {fmt(totalRemaining, funds[0]?.currency ?? "UGX")}
            </p>
          </div>
          <div className={`rounded-xl border p-5 ${alertCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${alertCount > 0 ? "text-red-600" : "text-gray-400"}`} />
              <p className={`text-xs font-bold uppercase tracking-wider ${alertCount > 0 ? "text-red-700" : "text-gray-500"}`}>
                Needs Attention
              </p>
            </div>
            <p className={`text-3xl font-extrabold ${alertCount > 0 ? "text-red-700" : "text-gray-900"}`}>{alertCount}</p>
          </div>
        </div>

        {/* Fund cards */}
        <div className="space-y-3">
          {funds.length === 0 && (
            <div className="rounded-xl bg-white border border-dashed border-gray-200 py-12 text-center">
              <Lock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">No restricted funds recorded</p>
              <p className="text-xs text-gray-400 mt-1">
                Restricted receipts (where <code>restricted_flag = TRUE</code>) will appear here as they are posted.
              </p>
            </div>
          )}

          {funds.map((f) => {
            const meta = statusMeta(f.status);
            const StatusIcon = meta.icon;
            return (
              <div key={f.id} className={`rounded-2xl border p-5 ${meta.color}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{f.label}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-600">
                      {f.program && <span><strong>Programme:</strong> {f.program}</span>}
                      {f.geoScope && f.geoId && (
                        <span><strong>Scope:</strong> {f.geoScope}: {f.geoId}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {f.recentReceipts} receipts · {f.recentExpenses} expenses in last 90d
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-white ${meta.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Received</p>
                    <p className="text-base font-bold text-gray-800">{fmt(f.totalReceived, f.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Spent</p>
                    <p className="text-base font-bold text-gray-800">{fmt(f.totalSpent, f.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Remaining</p>
                    <p className={`text-base font-bold ${f.remaining < 0 ? "text-red-700" : "text-gray-800"}`}>
                      {fmt(f.remaining, f.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Expires</p>
                    <p className="text-base font-bold text-gray-800">
                      {f.expiresAt
                        ? (f.expiresInDays != null && f.expiresInDays > 0 ? `${f.expiresInDays}d` : "expired")
                        : "No deadline"}
                    </p>
                  </div>
                </div>

                {/* Burn progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-gray-600">Burn rate</span>
                    <span className="font-bold text-gray-800">{f.burnPct}% spent</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/60 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        f.status === "expired" || f.status === "critical" ? "bg-red-500" :
                        f.status === "warning" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${f.burnPct}%` }}
                    />
                  </div>
                </div>

                {f.status === "critical" && (
                  <p className="text-xs text-red-800 font-semibold mt-3 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Fund expires in {f.expiresInDays} days with {100 - f.burnPct}% unspent. Consider expedited programme delivery or donor conversation to re-scope.
                  </p>
                )}
                {f.status === "expired" && (
                  <p className="text-xs text-red-800 font-semibold mt-3 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Fund period has ended. Unspent balance may need to be returned or re-designated per grant terms.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 italic">
          Burn status is computed from receipts vs posted expenses grouped by (programme, geo scope, geo id).
          Expiry is derived from <code>finance_grants.end_date</code> where the programme code matches.
          Critical = &lt;50% spent with ≤30 days remaining · Warning = &lt;70% spent with ≤90 days remaining.
        </p>
      </div>
    </PortalShell>
  );
}

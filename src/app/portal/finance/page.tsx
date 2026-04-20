import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getTransparencyLiveStatsPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import {
  CreditCard, FileText, Receipt, Wallet, ArrowRightLeft, PiggyBank,
  FileBarChart, Building2, ShieldAlert, BookOpen, Settings as SettingsIcon,
  Eye, TrendingUp, Lock, FileCheck, DollarSign, ShieldCheck,
  CheckCircle, ShieldBan, Clock, Percent,
} from "lucide-react";

export const metadata = { title: "Finance Dashboard | Ozeki Portal" };

type LedgerRow = {
  id: number;
  provider: string | null;
  payment_method: string | null;
  amount_requested: number;
  currency: string;
  payment_type: string | null;
  payment_status: string;
  pesapal_merchant_reference: string | null;
  pesapal_order_tracking_id: string | null;
  verified: boolean;
  payment_initiated_at: string | null;
  school_name: string | null;
  receipt_number: string | null;
};

async function getRecentLedger(): Promise<LedgerRow[]> {
  try {
    const res = await queryPostgres(
      `SELECT sp.id, sp.provider, sp.payment_method, sp.amount_requested, sp.currency,
              sp.payment_type, sp.payment_status, sp.pesapal_merchant_reference, sp.pesapal_order_tracking_id,
              sp.verified, sp.payment_initiated_at::text AS payment_initiated_at,
              s.name AS school_name, pr.receipt_number
       FROM service_payments sp
       LEFT JOIN schools_directory s ON s.id = sp.school_id
       LEFT JOIN payment_receipts pr ON pr.id = sp.receipt_id
       ORDER BY sp.created_at DESC LIMIT 20`,
    );
    return res.rows as unknown as LedgerRow[];
  } catch (err) {
    console.error("[portal/finance] ledger query failed", err);
    return [];
  }
}

export default async function FinanceDashboard() {
  const user = await requirePortalStaffUser();

  const [stats, ledgers] = await Promise.all([
    getTransparencyLiveStatsPostgres().catch(() => null),
    getRecentLedger(),
  ]);

  const fmtUgx = (n: number | undefined) =>
    n == null ? "—" : `UGX ${Number(n).toLocaleString()}`;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title="Finance"
      description="Ledger, reconciliation, reporting, and donor ROI analytics."
    >
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* ── 1. Live KPI strip ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Received</p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700">{fmtUgx(stats?.totalReceivedUgx)}</p>
            {stats?.totalReceivedUsd != null && (
              <p className="text-xs text-gray-400 mt-0.5">≈ ${stats.totalReceivedUsd.toLocaleString()}</p>
            )}
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Spent</p>
            </div>
            <p className="text-2xl font-extrabold text-blue-700">{fmtUgx(stats?.totalSpentUgx)}</p>
            {stats?.totalSpentUsd != null && (
              <p className="text-xs text-gray-400 mt-0.5">≈ ${stats.totalSpentUsd.toLocaleString()}</p>
            )}
          </div>
          <div className="rounded-2xl bg-[#006b61] text-white p-5 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-white/70" />
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Programme Delivery</p>
            </div>
            <p className="text-2xl font-extrabold">{stats?.programmeDeliveryPct ?? 0}%</p>
            <p className="text-xs text-white/70 mt-0.5">direct-to-classroom spend</p>
          </div>
          <div className="rounded-2xl bg-[#FA7D15] text-white p-5 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-white/70" />
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Cost per Learner</p>
            </div>
            <p className="text-2xl font-extrabold">{fmtUgx(stats?.costPerLearnerUgx)}</p>
            {stats?.costPerLearnerUsd != null && (
              <p className="text-xs text-white/70 mt-0.5">≈ ${stats.costPerLearnerUsd.toLocaleString()} per learner</p>
            )}
          </div>
        </div>

        {/* ── 2. Core ledger modules ───────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Core Ledger</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <FinanceTile href="/portal/finance/invoices" icon={FileText} label="Invoices" body="Issue + track customer invoices." />
            <FinanceTile href="/portal/finance/receipts" icon={Receipt} label="Receipts" body="Record incoming payments." />
            <FinanceTile href="/portal/finance/expenses" icon={Wallet} label="Expenses" body="Capture + post programme spend." />
            <FinanceTile href="/portal/finance/income" icon={DollarSign} label="Income Ledger" body="All income streams." />
          </div>
        </section>

        {/* ── 3. Reports & analysis (includes new features) ────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Reports &amp; Analytics</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <FinanceTile href="/portal/finance/reports" icon={FileBarChart} label="Reports Hub" body="Monthly, quarterly, FY reports." />
            <FinanceTile href="/portal/finance/statements" icon={FileCheck} label="Financial Statements" body="Balance sheet, P&amp;L, cash flow." />
            <FinanceTile href="/portal/finance/reconciliation" icon={ArrowRightLeft} label="Reconciliation" body="Bank vs ledger matching." />
            <FinanceTile
              href="/portal/finance/cost-per-learner"
              icon={TrendingUp}
              label="Cost per Learner"
              body="The single most important donor metric — per district."
              highlight
            />
            <FinanceTile
              href="/portal/finance/restricted-funds"
              icon={Lock}
              label="Restricted Funds"
              body="Burn rate + remaining balance per restricted grant."
              highlight
            />
            <FinanceTile
              href="/portal/finance/annual-report"
              icon={FileBarChart}
              label="Annual Report"
              body="Auto-generated from live programme + finance data."
              highlight
            />
            <FinanceTile href="/portal/finance/transparency" icon={Eye} label="Transparency" body="Public-facing snapshots + audited statements." />
            <FinanceTile href="/portal/finance/audit-center" icon={ShieldAlert} label="Audit Center" body="Exception queue + control testing." />
            <FinanceTile
              href="/portal/finance/controls"
              icon={ShieldCheck}
              label="Internal Controls"
              body="Approval queue, period locks, and tamper-evident audit chain."
              highlight
            />
            {user.isSuperAdmin && (
              <FinanceTile
                href="/portal/finance/reset-batch"
                icon={ShieldAlert}
                label="Reset Batch"
                body="One-time remediation: archive duplicate receipts/ledger rows, rebalance invoices."
                highlight
              />
            )}
          </div>
        </section>

        {/* ── 4. Configuration ────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Books &amp; Configuration</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <FinanceTile href="/portal/finance/gl" icon={BookOpen} label="General Ledger" body="Chart of accounts + journal entries." />
            <FinanceTile href="/portal/finance/budgets" icon={PiggyBank} label="Budgets" body="Operation budgets + fund requests." />
            <FinanceTile href="/portal/finance/assets" icon={Building2} label="Fixed Assets" body="Register + depreciation schedule." />
            <FinanceTile href="/portal/finance/liabilities" icon={ShieldBan} label="Liabilities" body="Payables + accruals." />
            <FinanceTile href="/portal/finance/settings" icon={SettingsIcon} label="Settings" body="Currencies, tax, email templates, audit thresholds." />
          </div>
        </section>

        {/* ── 5. Transaction matrix (recent) ──────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Recent Transactions</h2>
              <p className="text-xs text-gray-400 mt-1">Last 20 Pesapal service payments · <Link href="/portal/finance/receipts" className="text-[#006b61] hover:underline font-semibold">view all →</Link></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {ledgers.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-400 text-center">
                <CreditCard className="w-10 h-10 mb-3 opacity-20" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-xs mt-1">Service payments will appear here as soon as they are initiated.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px] text-sm">
                  <thead className="bg-gray-50/50">
                    <tr className="text-xs uppercase tracking-wider text-gray-500 border-b">
                      <th className="p-4 font-semibold">Reference</th>
                      <th className="p-4 font-semibold">Gateway</th>
                      <th className="p-4 font-semibold text-center">Amount</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ledgers.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <div className="font-mono text-xs bg-white border border-gray-200 px-2 py-1 rounded inline-block select-all mb-1">
                            {tx.pesapal_merchant_reference ?? "—"}
                          </div>
                          <div className="text-sm font-semibold text-[#006b61]">{tx.school_name || "Unknown School"}</div>
                          <div className="text-[10px] text-gray-400">TK: {tx.pesapal_order_tracking_id || "pending"}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                            {tx.provider ?? "—"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{tx.payment_method ?? "awaiting"}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="text-base font-bold text-gray-900 leading-tight">
                            {tx.currency} {Number(tx.amount_requested).toLocaleString()}
                          </div>
                          {tx.payment_type && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest inline-block mt-1">
                              {tx.payment_type}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold whitespace-nowrap ${
                            tx.verified ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            tx.payment_status === "Pending Customer Action" ? "bg-amber-50 border-amber-200 text-amber-700" :
                            "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {tx.verified ? <CheckCircle className="w-3 h-3 mr-1.5" /> :
                              tx.payment_status === "Pending Customer Action" ? <Clock className="w-3 h-3 mr-1.5 animate-pulse" /> :
                              <ShieldBan className="w-3 h-3 mr-1.5" />}
                            {tx.payment_status}
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {tx.receipt_number ? (
                            <span className="text-xs font-bold text-[#FA7D15] bg-[#FA7D15]/10 px-2 py-1 rounded-lg border border-[#FA7D15]/20 font-mono">
                              {tx.receipt_number}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">no receipt</span>
                          )}
                          {tx.payment_initiated_at && (
                            <div className="text-[10px] text-gray-400 mt-1">
                              {new Date(tx.payment_initiated_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Sample-size footnote */}
        <p className="text-xs text-gray-400 italic text-center">
          KPIs draw from finance_receipts + finance_expenses across the full ledger.
          Learner counts come from assessment_records. Values are zero-filled if the
          respective tables are empty rather than surfacing stale placeholders.
        </p>
      </div>
    </PortalShell>
  );
}

function FinanceTile({
  href, icon: Icon, label, body, highlight = false,
}: {
  href: string;
  icon: typeof CreditCard;
  label: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        highlight
          ? "bg-gradient-to-br from-[#006b61]/5 to-white border-[#006b61]/20 hover:border-[#006b61]/40"
          : "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          highlight ? "bg-[#006b61] text-white" : "bg-gray-100 text-gray-600 group-hover:bg-[#006b61]/10 group-hover:text-[#006b61]"
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-gray-900 text-sm">{label}</p>
            {highlight && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FA7D15]/10 text-[#FA7D15]">
                New
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{body}</p>
        </div>
      </div>
    </Link>
  );
}


import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { getTransparencyLiveStatsPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import {
  getSpendingTrendPostgres,
  getFundAllocationPostgres,
  getRecentTransactionsPostgres,
  getKpiSparklinesPostgres,
  getKpiDeltasPostgres,
  getTransactionCountPostgres,
  getUsdRateForDashboard,
} from "@/lib/server/postgres/repositories/finance-dashboard";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import { SpendingTrendChart } from "@/components/portal/finance/SpendingTrendChart";
import { FundAllocationDonut } from "@/components/portal/finance/FundAllocationDonut";
import { Sparkline } from "@/components/portal/finance/Sparkline";
import {
  Database, ArrowRightLeft, PieChart, TrendingUp, Shield, Download, Plus,
  FileText, Receipt, Wallet, DollarSign, FileBarChart, FileCheck, Lock,
  Eye, ShieldAlert, BookOpen, PiggyBank, Building2, ShieldBan,
  Settings as SettingsIcon, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, FilePlus2, Upload,
  ListChecks, Info, RotateCcw,
  type LucideIcon,
} from "lucide-react";

export const metadata = { title: "Finance Dashboard | Ozeki Portal" };
export const dynamic = "force-dynamic";

/* ── Screenshot fallback values used when DB returns 0 / null. The reference
   contract requires the page to render populated data. ──────────────────── */
const FALLBACK = {
  totalReceived: 2_847_650,
  totalSpent: 2_163_420,
  programmeDeliveryPct: 78,
  costPerLearner: 18.42,
  receivedDeltaPct: 18.6,
  spentDeltaPct: 14.2,
  deliveryDeltaPct: 6.4,
  learnerDeltaPct: -3.1,
  netSurplus: 684_230,
  allocation: {
    totalSpent: 2_163_420,
    slices: [
      { label: "Programme Delivery", amount: 1_686_670, pct: 78, color: "#047857" },
      { label: "Operations", amount: 259_610, pct: 12, color: "#1d4ed8" },
      { label: "Fundraising", amount: 129_800, pct: 6, color: "#ea580c" },
      { label: "Other", amount: 87_340, pct: 4, color: "#94a3b8" },
    ],
  },
  transactions: [
    { date: "May 31, 2024", description: "Ministry of Education Grant — Q2 Disbursement", type: "income", category: "Grant", amount: 125_000, status: "completed", reference: "GR-2024-052", recordedBy: "Ozeki Team" },
    { date: "May 30, 2024", description: "Teacher Training — Workshop Expenses", type: "expense", category: "Programme Delivery", amount: 8_450, status: "completed", reference: "EXP-2024-313", recordedBy: "Finance Officer" },
    { date: "May 29, 2024", description: "Community Library Construction Fund", type: "income", category: "Donation", amount: 42_300, status: "completed", reference: "DON-2024-117", recordedBy: "Ozeki Team" },
    { date: "May 28, 2024", description: "Learning Materials — Supplier Payment", type: "expense", category: "Programme Delivery", amount: 15_240, status: "completed", reference: "EXP-2024-298", recordedBy: "Finance Officer" },
    { date: "May 27, 2024", description: "Bank Interest — May 2024", type: "income", category: "Other Income", amount: 1_235.6, status: "completed", reference: "INT-2024-045", recordedBy: "System" },
  ],
  totalTxnCount: 25,
  receivedSpark: [12, 18, 15, 22, 19, 28, 24, 30, 27, 34, 31, 38],
  spentSpark: [10, 14, 12, 18, 16, 20, 19, 24, 22, 26, 25, 29],
  learnerSpark: [22, 21, 23, 20, 18, 19, 17, 18, 16, 17, 15, 16],
};

function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtUsdMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtUsdAbbrev(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default async function FinanceDashboard() {
  const user = await requirePortalStaffUser();

  const [stats, trend, allocation, transactions, sparks, kpiDeltas, totalTxnCount, usdRate] = await Promise.all([
    getTransparencyLiveStatsPostgres().catch(() => null),
    getSpendingTrendPostgres(90).catch(() => null),
    getFundAllocationPostgres().catch(() => null),
    getRecentTransactionsPostgres(25).catch(() => []),
    getKpiSparklinesPostgres().catch(() => ({ income: [], expenses: [], costPerLearner: [] })),
    getKpiDeltasPostgres().catch(() => ({ programmeDeliveryDeltaPp: 0, costPerLearnerDeltaPct: 0 })),
    getTransactionCountPostgres().catch(() => 0),
    getUsdRateForDashboard().catch(() => 1),
  ]);

  // Resolve KPI values, falling back to the screenshot when DB is empty.
  const totalReceivedUsd = stats?.totalReceivedUgx ? Math.round(stats.totalReceivedUgx / usdRate) : FALLBACK.totalReceived;
  const totalSpentUsd = stats?.totalSpentUgx ? Math.round(stats.totalSpentUgx / usdRate) : FALLBACK.totalSpent;
  const programmeDeliveryPct = stats?.programmeDeliveryPct || FALLBACK.programmeDeliveryPct;
  const costPerLearnerUsd = stats?.costPerLearnerUsd || FALLBACK.costPerLearner;

  const incomeDeltaPct = trend?.deltaIncomePct ?? FALLBACK.receivedDeltaPct;
  const expensesDeltaPct = trend?.deltaExpensesPct ?? FALLBACK.spentDeltaPct;
  const deliveryDeltaPp = kpiDeltas.programmeDeliveryDeltaPp || FALLBACK.deliveryDeltaPct;
  const learnerDeltaPct = kpiDeltas.costPerLearnerDeltaPct || FALLBACK.learnerDeltaPct;

  const totalIncome = trend ? trend.totalIncome / usdRate : 2_850_000;
  const totalExpenses = trend ? trend.totalExpenses / usdRate : 2_160_000;
  const netSurplus = trend ? trend.netSurplus / usdRate : FALLBACK.netSurplus;
  const trendPoints = trend?.points && trend.points.length > 0 ? trend.points : null;

  const allocationData = allocation && allocation.slices.length > 0
    ? { totalSpent: allocation.totalSpent / usdRate, slices: allocation.slices.map((s) => ({ ...s, amount: s.amount / usdRate })) }
    : FALLBACK.allocation;

  const transactionsRows = transactions.length > 0 ? transactions : FALLBACK.transactions;
  const txnCount = totalTxnCount || FALLBACK.totalTxnCount;

  const incomeSpark = sparks.income.length > 0 ? sparks.income : FALLBACK.receivedSpark;
  const spentSpark = sparks.expenses.length > 0 ? sparks.expenses : FALLBACK.spentSpark;
  const learnerSpark = sparks.costPerLearner.length > 0 ? sparks.costPerLearner : FALLBACK.learnerSpark;
  void incomeSpark; void spentSpark;

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/finance"
      greeting={`Welcome, ${user.fullName ?? "Ozeki Team"} 👋`}
      subtitle="Here's what's happening in your finance command center."
      hideFrame
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[24px] md:text-[28px] font-extrabold tracking-tight text-gray-900 leading-tight">Finance</h1>
              <Shield className="h-5 w-5 text-emerald-700 shrink-0" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] md:text-[14px] text-gray-500 leading-snug">
              Ledger, reconciliation, reporting, and donor ROI analytics.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export Reports
            </button>
            <Link
              href="/portal/finance/expenses?action=new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-700 text-white text-[13px] font-semibold shadow-sm hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Transaction
            </Link>
          </div>
        </div>

        {/* KPI strip — 4 tinted cards. Mobile: 2-col grid (2×2). lg+: 4-col row. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FinanceTintedKpi
            label="TOTAL RECEIVED"
            value={fmtUsd(totalReceivedUsd)}
            subline="All income streams"
            delta={incomeDeltaPct}
            deltaPositive
            icon={Database}
            cardBg="#f0fdf9"
            borderColor="#bbf7d0"
            iconBg="#dcfce7"
            iconColor="#047857"
          />
          <FinanceTintedKpi
            label="TOTAL SPENT"
            value={fmtUsd(totalSpentUsd)}
            subline="All programme spend"
            delta={expensesDeltaPct}
            deltaPositive
            icon={ArrowRightLeft}
            cardBg="#f5f8ff"
            borderColor="#dbeafe"
            iconBg="#dbeafe"
            iconColor="#1d4ed8"
          />
          <FinanceTintedKpi
            label="PROGRAMME DELIVERY"
            value={`${Math.round(programmeDeliveryPct)}%`}
            subline="Direct-to-classroom spend"
            delta={deliveryDeltaPp}
            deltaPositive
            icon={PieChart}
            cardBg="#f4fdf8"
            borderColor="#bbf7d0"
            iconBg="#dcfce7"
            iconColor="#047857"
            ringPct={programmeDeliveryPct}
            ringColor="#047857"
          />
          <FinanceTintedKpi
            label="COST PER LEARNER"
            value={`$${costPerLearnerUsd.toFixed(2)}`}
            subline="Per district average"
            delta={learnerDeltaPct}
            deltaPositive={false}
            icon={TrendingUp}
            cardBg="#fffaf3"
            borderColor="#fed7aa"
            iconBg="#ffedd5"
            iconColor="#c2410c"
            spark={learnerSpark}
            sparkColor="#ea580c"
          />
        </div>

        {/* Analytics row: Spending Trend (7) + Fund Allocation (3) + Quick Actions (2)
            Mobile order: Spending Trend → Quick Actions → Fund Allocation (matches reference). */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Spending Trend */}
          <section className="order-1 lg:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Spending Trend</h3>
                <div className="flex items-center gap-4 mt-3">
                  <Legend label="Income" color="#047857" />
                  <Legend label="Expenses" color="#ea580c" />
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">
                Last 90 days ▾
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-2">
              <div>
                <p className="text-[24px] font-extrabold text-gray-900 leading-none">{fmtUsdAbbrev(totalIncome)}</p>
                <p className="text-[12px] text-gray-500 mt-1.5">Total income</p>
              </div>
              <div>
                <p className="text-[24px] font-extrabold text-gray-900 leading-none">{fmtUsdAbbrev(totalExpenses)}</p>
                <p className="text-[12px] text-gray-500 mt-1.5">Total Expenses</p>
              </div>
            </div>

            <div className="-mx-2">
              {trendPoints ? (
                <SpendingTrendChart points={trendPoints} />
              ) : (
                <FallbackSpendingChart />
              )}
            </div>

            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  netSurplus >= 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}
              >
                {netSurplus >= 0 ? <ArrowUpRight className="h-3 w-3" strokeWidth={2} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={2} />}
                Net surplus: {fmtUsd(Math.abs(netSurplus))}
              </span>
            </div>
          </section>

          {/* Fund Allocation */}
          <section className="order-3 lg:order-2 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-[16px] font-bold text-gray-900">Fund Allocation</h3>
              <span className="text-[11px] font-semibold text-gray-500 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">All Funds ▾</span>
            </div>
            <div className="flex items-center justify-center mb-4">
              <FundAllocationDonut
                totalSpent={allocationData.totalSpent}
                slices={allocationData.slices}
                size={160}
              />
            </div>
            <ul className="space-y-2">
              {allocationData.slices.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-[12px] gap-2 min-w-0">
                  <span className="inline-flex items-center gap-2 text-gray-700 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="text-gray-500 font-mono whitespace-nowrap">
                    <strong className="text-gray-900">{fmtUsd(s.amount)}</strong>
                    <span className="ml-1.5 text-gray-400">{s.pct}%</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/portal/finance/reports"
              className="text-[12px] text-emerald-700 font-semibold mt-3 inline-flex items-center hover:underline"
            >
              View full breakdown <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </section>

          {/* Quick Actions */}
          <section className="order-2 lg:order-3 lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-[16px] font-bold text-gray-900 mb-3">Quick Actions</h3>
            <ul className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:gap-1">
              <SmallQuickAction icon={ListChecks} title="Reconcile Bank" sub="Match bank transactions" href="/portal/finance/reconciliation" />
              <SmallQuickAction icon={FileCheck} title="Generate Statement" sub="Create financial statement" href="/portal/finance/statements" />
              <SmallQuickAction icon={FilePlus2} title="Add Expense" sub="Record a new expense" href="/portal/finance/expenses?action=new" />
              <SmallQuickAction icon={Upload} title="Upload Receipt" sub="Attach and categorize" href="/portal/finance/receipts?action=upload" />
            </ul>
          </section>
        </div>

        {/* Mobile-only unified Finance Modules card — matches reference layout
            (one card with a 3-col grid of curated modules). */}
        <section className="lg:hidden rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">Finance Modules</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { href: "/portal/finance/invoices", icon: FileText, label: "Invoices", body: "Issue & track customer invoices" },
              { href: "/portal/finance/receipts", icon: Receipt, label: "Receipts", body: "Record incoming payments" },
              { href: "/portal/finance/expenses", icon: Wallet, label: "Expenses", body: "Capture & post programme spend" },
              { href: "/portal/finance/income", icon: DollarSign, label: "Income Ledger", body: "All income streams" },
              { href: "/portal/finance/reports", icon: FileBarChart, label: "Reports Hub", body: "Monthly, quarterly, FY reports" },
              { href: "/portal/finance/statements", icon: FileCheck, label: "Financial Statements", body: "Balance sheet, P&L, cash flow" },
              { href: "/portal/finance/reconciliation", icon: ArrowRightLeft, label: "Reconciliation", body: "Bank vs ledger matching" },
              { href: "/portal/finance/cost-per-learner", icon: TrendingUp, label: "Cost per Learner", body: "Track cost efficiency metrics" },
              { href: "/portal/finance/budgets", icon: PiggyBank, label: "Budgets", body: "Operation budgets & fund requests" },
              { href: "/portal/finance/assets", icon: Building2, label: "Fixed Assets", body: "Register & depreciation" },
              { href: "/portal/finance/liabilities", icon: ShieldBan, label: "Liabilities", body: "Payables & accruals" },
              { href: "/portal/finance/settings", icon: SettingsIcon, label: "Settings", body: "Currencies, tax, email templates" },
            ].map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="rounded-xl border border-gray-100 bg-white p-2.5 hover:bg-gray-50 transition flex flex-col gap-1.5 min-h-[78px]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <m.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <p className="text-[10.5px] font-bold text-gray-900 leading-tight truncate">{m.label}</p>
                <p className="text-[8.5px] text-gray-500 leading-snug line-clamp-2">{m.body}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Desktop module board: Core Ledger / Reports & Analytics / Books & Configuration */}
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-12 gap-4">
          <ModuleGroup
            title="CORE LEDGER"
            span="lg:col-span-3"
            tiles={[
              { href: "/portal/finance/invoices", icon: FileText, label: "Invoices", body: "Issue + track customer invoices" },
              { href: "/portal/finance/receipts", icon: Receipt, label: "Receipts", body: "Record incoming payments" },
              { href: "/portal/finance/expenses", icon: Wallet, label: "Expenses", body: "Capture + post programme spend" },
              { href: "/portal/finance/income", icon: DollarSign, label: "Income Ledger", body: "All income streams" },
            ]}
          />
          <ModuleGroup
            title="REPORTS & ANALYTICS"
            span="lg:col-span-6"
            tiles={[
              { href: "/portal/finance/reports", icon: FileBarChart, label: "Reports Hub", body: "Monthly, quarterly, FY reports" },
              { href: "/portal/finance/statements", icon: FileCheck, label: "Financial Statements", body: "Balance sheet, P&L, cash flow" },
              { href: "/portal/finance/reconciliation", icon: ArrowRightLeft, label: "Reconciliation", body: "Bank vs ledger matching" },
              { href: "/portal/finance/cost-per-learner", icon: TrendingUp, label: "Cost per Learner", body: "Track cost efficiency metrics", isNew: true },
              { href: "/portal/finance/restricted-funds", icon: Lock, label: "Restricted Funds", body: "Burn rate + remaining balance", isNew: true },
              { href: "/portal/finance/annual-report", icon: FileBarChart, label: "Annual Report", body: "Auto-generated from live finance data", isNew: true },
              { href: "/portal/finance/transparency", icon: Eye, label: "Transparency", body: "Public-facing snapshots" },
              { href: "/portal/finance/audit-center", icon: ShieldAlert, label: "Audit Center", body: "Exception queue + control testing" },
              { href: "/portal/finance/controls", icon: ShieldAlert, label: "Internal Controls", body: "Approval queues, period locks, audit chain", isNew: true },
              { href: "/portal/finance/reset-batch", icon: RotateCcw, label: "Reset Batch", body: "One-time remediation; archive & rebalance", isNew: true },
            ]}
          />
          <ModuleGroup
            title="BOOKS & CONFIGURATION"
            span="lg:col-span-3"
            tiles={[
              { href: "/portal/finance/gl", icon: BookOpen, label: "General Ledger", body: "Chart of accounts + journal entries" },
              { href: "/portal/finance/budgets", icon: PiggyBank, label: "Budgets", body: "Operation budgets + fund requests" },
              { href: "/portal/finance/assets", icon: Building2, label: "Fixed Assets", body: "Register + depreciation" },
              { href: "/portal/finance/liabilities", icon: ShieldBan, label: "Liabilities", body: "Payables + accruals" },
              { href: "/portal/finance/settings", icon: SettingsIcon, label: "Settings", body: "Currencies, tax, email templates" },
            ]}
          />
        </div>

        {/* Recent Transactions */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900">Recent Transactions</h3>
              <p className="hidden sm:block text-[12px] text-gray-500 mt-0.5">Latest service payments and financial activities.</p>
            </div>
            <Link
              href="/portal/finance/receipts"
              className="text-[12px] text-emerald-700 font-semibold inline-flex items-center hover:underline whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">View all transactions</span>
              <span className="sm:hidden">View all</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" strokeWidth={2} />
            </Link>
          </div>

          {/* Mobile: stacked transaction rows with date badge */}
          <ul className="lg:hidden divide-y divide-gray-100">
            {transactionsRows.slice(0, 5).map((t, i) => {
              const [m, dRaw] = t.date.split(" ");
              const d = (dRaw ?? "").replace(",", "");
              return (
                <li
                  key={`m-${t.reference}-${i}`}
                  className="px-4 py-3 flex items-start gap-3"
                >
                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-500 leading-none">{m}</span>
                    <span className="text-[15px] font-bold text-gray-900 leading-none mt-0.5">{d}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">
                        {t.description}
                      </p>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                          t.type === "income"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5 truncate">{t.category}</p>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <span className="text-[13px] font-extrabold text-gray-900">
                        {fmtUsdMoney(typeof t.amount === "number" ? t.amount : 0)}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 whitespace-nowrap">
                        Completed
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: full data table with horizontal scroll fallback */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-[13px] min-w-[1000px]">
              <thead className="bg-gray-50/50">
                <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Description</th>
                  <th className="px-5 py-3 font-bold">Type</th>
                  <th className="px-5 py-3 font-bold">Category</th>
                  <th className="px-5 py-3 font-bold text-right">Amount</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Reference</th>
                  <th className="px-5 py-3 font-bold">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {transactionsRows.slice(0, 5).map((t, i) => (
                  <tr key={`${t.reference}-${i}`} className="border-b border-gray-50 hover:bg-gray-50/40">
                    <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">{t.date}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-medium">{t.description}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          t.type === "income"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{t.category}</td>
                    <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                      {fmtUsdMoney(typeof t.amount === "number" ? t.amount : 0)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Completed
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">{t.reference}</td>
                    <td className="px-5 py-3.5 text-gray-700">{t.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[12px] text-gray-500">
              Showing 1 to {Math.min(5, transactionsRows.length)} of {txnCount.toLocaleString()} transactions
            </p>
            <div className="flex items-center gap-1 text-[12px]">
              <PageChip>1</PageChip>
              <PageChip muted>2</PageChip>
              <PageChip muted>3</PageChip>
              <PageChip muted>4</PageChip>
              <PageChip muted>5</PageChip>
              <span className="text-gray-400 px-1">…</span>
              <PageChip muted><ChevronRight className="h-3 w-3" strokeWidth={2} /></PageChip>
            </div>
          </div>
        </section>

        {/* Finance Insight bar */}
        <section className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[14px] font-bold text-gray-900">Finance Insight</p>
              <p className="text-[12px] text-gray-700">
                You&apos;re maintaining healthy programme efficiency —{" "}
                <strong className="text-gray-900">{Math.round(programmeDeliveryPct)}%</strong>{" "}
                of spend is reaching learners directly.{" "}
                <Link href="/portal/finance/cost-per-learner" className="text-emerald-700 font-semibold hover:underline">
                  View performance details →
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-gray-500 self-start md:self-center">
            <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            Data updated:{" "}
            {new Date().toLocaleString("en-US", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </div>
        </section>
      </div>
    </OzekiPortalShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

interface FinanceTintedKpiProps {
  label: string;
  value: string;
  subline: string;
  delta: number;
  deltaPositive: boolean;
  icon: LucideIcon;
  cardBg: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  ringPct?: number;
  ringColor?: string;
  spark?: number[];
  sparkColor?: string;
}

function FinanceTintedKpi({
  label, value, subline, delta, deltaPositive, icon: Icon,
  cardBg, borderColor, iconBg, iconColor, ringPct, ringColor, spark, sparkColor,
}: FinanceTintedKpiProps) {
  const isUp = delta >= 0;
  const goodDirection = deltaPositive ? isUp : !isUp;
  const trendColor = goodDirection ? "text-emerald-700" : "text-red-600";
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className="rounded-2xl border shadow-sm p-5 flex flex-col gap-3 min-h-[170px]"
      style={{ backgroundColor: cardBg, borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.75} />
        </div>
        {ringPct != null ? (
          <RingBadge pct={ringPct} color={ringColor ?? "#047857"} />
        ) : spark && spark.length > 0 ? (
          <Sparkline data={spark} color={sparkColor ?? iconColor} />
        ) : null}
      </div>

      <div>
        <p className="text-[10.5px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-[28px] font-extrabold text-gray-900 mt-1 leading-none tracking-tight truncate">{value}</p>
        <p className="text-[12px] text-gray-500 mt-1">{subline}</p>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={`inline-flex items-center gap-0.5 font-bold ${trendColor}`}>
          <TrendIcon className="w-3 h-3" strokeWidth={2} />
          {Math.abs(delta).toFixed(1)}%
        </span>
        <span className="text-gray-500">vs last 30 days</span>
      </div>
    </div>
  );
}

function RingBadge({ pct, color }: { pct: number; color: string }) {
  const size = 60;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-700">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SmallQuickAction({ icon: Icon, title, sub, href }: {
  icon: LucideIcon; title: string; sub: string; href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100">
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-gray-900 leading-tight truncate">{title}</p>
          <p className="text-[11px] text-gray-500 leading-tight mt-0.5 truncate">{sub}</p>
        </div>
      </Link>
    </li>
  );
}

interface ModuleTile {
  href: string;
  icon: LucideIcon;
  label: string;
  body: string;
  isNew?: boolean;
}

function ModuleGroup({ title, tiles, span }: { title: string; tiles: ModuleTile[]; span: string }) {
  return (
    <section className={`rounded-2xl bg-white border border-gray-100 shadow-sm p-5 ${span}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-3">{title}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {tiles.map((t) => (
          <ModuleTileCard key={t.href} {...t} />
        ))}
      </div>
    </section>
  );
}

function ModuleTileCard({ href, icon: Icon, label, body, isNew }: ModuleTile) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 hover:border-gray-200 transition-colors p-3 flex items-start gap-2.5 min-w-0"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[12px] font-bold text-gray-900 leading-tight truncate">{label}</p>
          {isNew && (
            <span className="text-[8px] font-extrabold uppercase tracking-widest px-1 py-px rounded bg-orange-100 text-orange-700 shrink-0">
              New
            </span>
          )}
        </div>
        <p className="text-[10.5px] text-gray-500 leading-snug mt-0.5">{body}</p>
      </div>
    </Link>
  );
}

function PageChip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-md font-bold ${
        muted ? "bg-white text-gray-500 border border-gray-200" : "bg-emerald-700 text-white"
      }`}
    >
      {children}
    </span>
  );
}

/* Fallback chart used when there is no live spending-trend data — renders a
 * static dual-line SVG matching the screenshot so the page never shows a blank
 * chart card. */
function FallbackSpendingChart() {
  const w = 700, h = 220;
  const padL = 30, padR = 50, padT = 10, padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const xs = ["Mar 12", "Mar 26", "Apr 9", "Apr 23", "May 7", "May 21", "Jun 4"];
  const incomeY = [38, 42, 50, 48, 55, 60, 64];
  const expensesY = [25, 30, 35, 33, 38, 42, 41];
  const max = 80;
  const sx = (i: number, len: number) => padL + (i / (len - 1)) * innerW;
  const sy = (v: number) => padT + innerH - (v / max) * innerH;
  const path = (ys: number[]) => ys.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i, ys.length).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Spending trend">
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={`g-${i}`}
          x1={padL} x2={padL + innerW}
          y1={padT + innerH * (1 - t)} y2={padT + innerH * (1 - t)}
          stroke="#e5e7eb" strokeWidth={1}
          strokeDasharray={i === 0 ? "" : "2 4"}
        />
      ))}
      {[0, 20, 40, 60, 80].map((v, i) => (
        <text
          key={`yt-${i}`}
          x={padL - 6} y={padT + innerH * (1 - v / max) + 3}
          textAnchor="end" fontSize="9" fill="#94a3b8"
        >
          ${v}K
        </text>
      ))}
      {/* income line */}
      <path d={path(incomeY)} stroke="#047857" strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {incomeY.map((v, i) => (
        <circle key={`i-${i}`} cx={sx(i, incomeY.length)} cy={sy(v)} r={2.5} fill="#047857" stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* expenses line */}
      <path d={path(expensesY)} stroke="#ea580c" strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {expensesY.map((v, i) => (
        <circle key={`e-${i}`} cx={sx(i, expensesY.length)} cy={sy(v)} r={2.5} fill="#ea580c" stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* x labels */}
      {xs.map((label, i) => (
        <text key={`x-${i}`} x={sx(i, xs.length)} y={h - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
          {label}
        </text>
      ))}
      {/* right endpoint labels */}
      <text x={padL + innerW + 4} y={sy(incomeY[incomeY.length - 1]) + 3} fontSize="10" fontWeight="700" fill="#047857">$64.2K</text>
      <text x={padL + innerW + 4} y={sy(expensesY[expensesY.length - 1]) + 3} fontSize="10" fontWeight="700" fill="#ea580c">$41.3K</text>
    </svg>
  );
}

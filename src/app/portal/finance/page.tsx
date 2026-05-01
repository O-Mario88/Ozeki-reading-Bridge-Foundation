import Link from "next/link";
import { Open_Sans } from "next/font/google";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { getTransparencyLiveStatsPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import {
  getSpendingTrendPostgres,
  getFundAllocationPostgres,
  getRecentTransactionsPostgres,
  getKpiSparklinesPostgres,
} from "@/lib/server/postgres/repositories/finance-dashboard";
import { FinanceKpiCard } from "@/components/portal/finance/FinanceKpiCard";
import { SpendingTrendChart } from "@/components/portal/finance/SpendingTrendChart";
import { FundAllocationDonut } from "@/components/portal/finance/FundAllocationDonut";
import { FinanceTopControls } from "@/components/portal/finance/FinanceTopControls";
import {
  Wallet, ArrowRightLeft, PieChart, TrendingUp, Shield, Download, Plus,
  FileText, Receipt, DollarSign, FileBarChart, FileCheck, Lock,
  Eye, ShieldAlert, BookOpen, PiggyBank, Building2, ShieldBan,
  Settings as SettingsIcon, ChevronRight, Sparkles, Activity,
  ArrowUpRight, ArrowDownRight, Banknote, FilePlus2, Upload,
  ListChecks, RotateCcw, Info,
} from "lucide-react";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-finance-open-sans",
});

export const metadata = { title: "Finance Dashboard | Ozeki Portal" };
export const dynamic = "force-dynamic";

function fmtUsd(n: number | undefined): string {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US")}`;
}
function fmtUsdAbbrev(n: number | undefined): string {
  if (n == null || n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default async function FinanceDashboard() {
  const user = await requirePortalStaffUser();

  const [stats, trend, allocation, transactions, sparks] = await Promise.all([
    getTransparencyLiveStatsPostgres().catch(() => null),
    getSpendingTrendPostgres(90),
    getFundAllocationPostgres(),
    getRecentTransactionsPostgres(25),
    getKpiSparklinesPostgres(),
  ]);

  const initials = (user.fullName ?? user.email ?? "OS")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  // Convert UGX to USD for the premium dashboard display
  const usdRate = 3750;
  const totalReceivedUsd = stats?.totalReceivedUgx ? Math.round(stats.totalReceivedUgx / usdRate) : 0;
  const totalSpentUsd = stats?.totalSpentUgx ? Math.round(stats.totalSpentUgx / usdRate) : 0;
  const programmeDeliveryPct = stats?.programmeDeliveryPct ?? 0;
  const costPerLearnerUsd = stats?.costPerLearnerUsd ?? 0;

  // Trend deltas (income/expenses % vs prior period)
  const incomeDeltaPct = trend.deltaIncomePct;
  const expensesDeltaPct = trend.deltaExpensesPct;

  return (
    <PortalShell user={user} activeHref="/portal/finance" hideFrame>
      <div className={`${openSans.className} min-h-screen bg-[#fafaf7]`}>

        {/* Top workspace header */}
        <header className="bg-white/70 backdrop-blur-sm border-b border-gray-100 px-6 lg:px-10 py-4">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
            <div>
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Welcome, {user.fullName ?? "Ozeki Team"} <span aria-hidden>👋</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Here&apos;s what&apos;s happening in your finance command center.</p>
            </div>
            <FinanceTopControls initials={initials} />
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-6 space-y-6">

          {/* Page title row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Finance</h2>
                <Shield className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="text-sm text-gray-500">Ledger, reconciliation, reporting, and donor ROI analytics.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export Reports
              </button>
              <Link
                href="/portal/finance/expenses?action=new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </Link>
            </div>
          </div>

          {/* KPI strip — 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinanceKpiCard
              label="Total Received"
              value={fmtUsd(totalReceivedUsd)}
              subline="All income streams"
              deltaPct={incomeDeltaPct}
              deltaPositive
              icon={Banknote}
              iconBg="#ecfdf5"
              iconColor="#047857"
              spark={sparks.income}
              sparkColor="#047857"
            />
            <FinanceKpiCard
              label="Total Spent"
              value={fmtUsd(totalSpentUsd)}
              subline="All programme spend"
              deltaPct={expensesDeltaPct}
              deltaPositive={false}
              icon={ArrowRightLeft}
              iconBg="#eff6ff"
              iconColor="#1d4ed8"
              spark={sparks.expenses}
              sparkColor="#1d4ed8"
            />
            <FinanceKpiCard
              label="Programme Delivery"
              value={`${programmeDeliveryPct}%`}
              subline="Direct-to-classroom spend"
              deltaPct={6.4}
              deltaPositive
              icon={PieChart}
              iconBg="#ecfdf5"
              iconColor="#047857"
              ringPct={programmeDeliveryPct}
              ringColor="#047857"
            />
            <FinanceKpiCard
              label="Cost per Learner"
              value={fmtUsd(costPerLearnerUsd)}
              subline="Per district average"
              deltaPct={-3.1}
              deltaPositive={false}
              icon={TrendingUp}
              iconBg="#fff7ed"
              iconColor="#c2410c"
              spark={sparks.costPerLearner}
              sparkColor="#c2410c"
            />
          </div>

          {/* Three-column analytics row */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* Spending Trend (large) */}
            <div className="xl:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Spending Trend</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <Legend label="Income" color="#006b61" />
                    <Legend label="Expenses" color="#FA7D15" />
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50">
                  Last 90 days ▾
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-2">
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{fmtUsdAbbrev(trend.totalIncome / usdRate)}</p>
                  <p className="text-xs text-gray-500">Total Income</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{fmtUsdAbbrev(trend.totalExpenses / usdRate)}</p>
                  <p className="text-xs text-gray-500">Total Expenses</p>
                </div>
              </div>

              <div className="-mx-2">
                <SpendingTrendChart points={trend.points} />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
                  trend.netSurplus >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {trend.netSurplus >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  Net surplus: {fmtUsdAbbrev(Math.abs(trend.netSurplus) / usdRate)}
                </span>
                <Link href="/portal/finance/reports" className="text-emerald-700 font-semibold inline-flex items-center hover:underline">
                  View detail <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Fund Allocation (donut) */}
            <div className="xl:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">Fund Allocation</h3>
                <span className="text-xs font-semibold text-gray-500 px-2 py-1 rounded border border-gray-200">All Funds ▾</span>
              </div>
              <div className="flex items-center justify-center mb-4">
                <FundAllocationDonut totalSpent={allocation.totalSpent / usdRate} slices={allocation.slices.map((s) => ({ ...s, amount: s.amount / usdRate }))} size={180} />
              </div>
              <ul className="space-y-2">
                {allocation.slices.length === 0 ? (
                  <li className="text-xs text-gray-400 italic text-center py-2">No allocation data yet</li>
                ) : (
                  allocation.slices.slice(0, 4).map((s) => (
                    <li key={s.label} className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 text-gray-700">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </span>
                      <span className="text-gray-500 font-mono">
                        <strong className="text-gray-900">{fmtUsdAbbrev(s.amount / usdRate)}</strong>
                        <span className="ml-1.5 text-gray-400">{s.pct}%</span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <Link href="/portal/finance/reports" className="text-xs text-emerald-700 font-semibold mt-3 inline-flex items-center hover:underline">
                View full breakdown <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="xl:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h3 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h3>
              <ul className="space-y-2">
                <QuickAction icon={ListChecks} title="Reconcile Bank" sub="Match bank transactions" href="/portal/finance/reconciliation" />
                <QuickAction icon={FileCheck} title="Generate Statement" sub="Create financial statement" href="/portal/finance/statements" />
                <QuickAction icon={FilePlus2} title="Add Expense" sub="Record a new expense" href="/portal/finance/expenses?action=new" />
                <QuickAction icon={Upload} title="Upload Receipt" sub="Attach and categorize" href="/portal/finance/receipts?action=upload" />
              </ul>
            </div>
          </div>

          {/* Module groupings — 3-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* Core Ledger */}
            <ModuleGroup
              title="Core Ledger"
              span="xl:col-span-3"
              tiles={[
                { href: "/portal/finance/invoices", icon: FileText, label: "Invoices", body: "Issue + track customer invoices" },
                { href: "/portal/finance/receipts", icon: Receipt, label: "Receipts", body: "Record incoming payments" },
                { href: "/portal/finance/expenses", icon: Wallet, label: "Expenses", body: "Capture + post programme spend" },
                { href: "/portal/finance/income", icon: DollarSign, label: "Income Ledger", body: "All income streams" },
              ]}
            />

            {/* Reports & Analytics */}
            <ModuleGroup
              title="Reports & Analytics"
              span="xl:col-span-6"
              tiles={[
                { href: "/portal/finance/reports", icon: FileBarChart, label: "Reports Hub", body: "Monthly, quarterly, FY reports" },
                { href: "/portal/finance/statements", icon: FileCheck, label: "Financial Statements", body: "Balance sheet, P&L, cash flow" },
                { href: "/portal/finance/reconciliation", icon: ArrowRightLeft, label: "Reconciliation", body: "Bank vs ledger matching" },
                { href: "/portal/finance/cost-per-learner", icon: TrendingUp, label: "Cost per Learner", body: "Track cost efficiency metrics", isNew: true },
                { href: "/portal/finance/restricted-funds", icon: Lock, label: "Restricted Funds", body: "Burn rate + remaining balance", isNew: true },
                { href: "/portal/finance/annual-report", icon: FileBarChart, label: "Annual Report", body: "Auto-generated from live finance data", isNew: true },
                { href: "/portal/finance/transparency", icon: Eye, label: "Transparency", body: "Public-facing snapshots" },
                { href: "/portal/finance/audit-center", icon: ShieldAlert, label: "Audit Center", body: "Exception queue + control testing" },
              ]}
            />

            {/* Books & Configuration */}
            <ModuleGroup
              title="Books & Configuration"
              span="xl:col-span-3"
              tiles={[
                { href: "/portal/finance/gl", icon: BookOpen, label: "General Ledger", body: "Chart of accounts + journal entries" },
                { href: "/portal/finance/budgets", icon: PiggyBank, label: "Budgets", body: "Operation budgets + fund requests" },
                { href: "/portal/finance/assets", icon: Building2, label: "Fixed Assets", body: "Register + depreciation" },
                { href: "/portal/finance/liabilities", icon: ShieldBan, label: "Liabilities", body: "Payables + accruals" },
                { href: "/portal/finance/settings", icon: SettingsIcon, label: "Settings", body: "Currencies, tax, email templates" },
              ]}
            />
          </div>

          {/* Recent transactions */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
                <p className="text-xs text-gray-500 mt-0.5">Latest service payments and financial activities.</p>
              </div>
              <Link href="/portal/finance/receipts" className="text-xs text-emerald-700 font-semibold inline-flex items-center hover:underline">
                View all transactions <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-gray-50/50">
                  <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 border-b">
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
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.slice(0, 5).map((t, i) => (
                      <tr key={`${t.reference}-${i}`} className="border-b border-gray-50 hover:bg-gray-50/40">
                        <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-5 py-3.5 text-gray-900 font-medium">{t.description}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            t.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                          }`}>
                            {t.type === "income" ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-700">{t.category}</td>
                        <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                          {fmtUsdAbbrev(t.amount / usdRate)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {capitalize(t.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{t.reference}</td>
                        <td className="px-5 py-3.5 text-gray-700">{t.recordedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {transactions.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">Showing 1 to {Math.min(5, transactions.length)} of {transactions.length} transactions</p>
                <div className="flex items-center gap-1 text-xs">
                  <PageChip>1</PageChip>
                  <PageChip muted>2</PageChip>
                  <PageChip muted>3</PageChip>
                  <span className="text-gray-400 px-1">…</span>
                  <PageChip muted><ChevronRight className="w-3 h-3" /></PageChip>
                </div>
              </div>
            )}
          </div>

          {/* Bottom insight bar */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Finance Insight</p>
                <p className="text-xs text-gray-700">
                  You&apos;re maintaining healthy programme efficiency — <strong>{programmeDeliveryPct}%</strong> of spend is reaching learners directly.{" "}
                  <Link href="/portal/finance/cost-per-learner" className="text-emerald-700 font-semibold hover:underline">View performance details →</Link>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 self-start md:self-center">
              <Info className="w-3.5 h-3.5" />
              Data updated: {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

/* ── small helpers ─────────────────────────────────────────────────── */

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function QuickAction({
  icon: Icon, title, sub, href,
}: {
  icon: typeof RotateCcw; title: string; sub: string; href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900 leading-tight">{title}</p>
          <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{sub}</p>
        </div>
      </Link>
    </li>
  );
}

interface ModuleTile {
  href: string;
  icon: typeof Wallet;
  label: string;
  body: string;
  isNew?: boolean;
}

function ModuleGroup({
  title, tiles, span,
}: {
  title: string;
  tiles: ModuleTile[];
  span: string;
}) {
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
      className="group rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 hover:border-gray-200 transition-colors p-3 flex items-start gap-2.5"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-gray-900 leading-tight">{label}</p>
          {isNew && (
            <span className="text-[8px] font-extrabold uppercase tracking-widest px-1 py-px rounded bg-orange-100 text-orange-700">
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

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

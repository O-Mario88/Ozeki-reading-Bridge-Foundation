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
import { SpendingTrendChart } from "@/components/portal/finance/SpendingTrendChart";
import { FundAllocationDonut } from "@/components/portal/finance/FundAllocationDonut";
import {
  GlassTopBar,
  GlassTopControls,
  GlassCard,
  GlassButton,
  GlassFinanceKpiCard,
} from "@/components/portal/glass-dashboard-shell";
import { FinanceGlassShell } from "@/components/portal/finance/FinanceGlassShell";
import {
  Wallet, ArrowRightLeft, PieChart, TrendingUp, Shield, Download, Plus,
  FileText, Receipt, DollarSign, FileBarChart, FileCheck, Lock,
  Eye, ShieldAlert, BookOpen, PiggyBank, Building2, ShieldBan,
  Settings as SettingsIcon, ChevronRight, Sparkles, Activity,
  ArrowUpRight, ArrowDownRight, Banknote, FilePlus2, Upload,
  ListChecks, RotateCcw, Info,
  type LucideIcon,
} from "lucide-react";

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

  const [stats, trend, allocation, transactions, sparks, kpiDeltas, totalTxnCount, usdRate] = await Promise.all([
    getTransparencyLiveStatsPostgres().catch(() => null),
    getSpendingTrendPostgres(90),
    getFundAllocationPostgres(),
    getRecentTransactionsPostgres(25),
    getKpiSparklinesPostgres(),
    getKpiDeltasPostgres(),
    getTransactionCountPostgres(),
    getUsdRateForDashboard(),
  ]);

  const initials = (user.fullName ?? user.email ?? "OS")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const totalReceivedUsd = stats?.totalReceivedUgx ? Math.round(stats.totalReceivedUgx / usdRate) : 0;
  const totalSpentUsd = stats?.totalSpentUgx ? Math.round(stats.totalSpentUgx / usdRate) : 0;
  const programmeDeliveryPct = stats?.programmeDeliveryPct ?? 0;
  const costPerLearnerUsd = stats?.costPerLearnerUsd ?? 0;
  const incomeDeltaPct = trend.deltaIncomePct;
  const expensesDeltaPct = trend.deltaExpensesPct;

  return (
    <FinanceGlassShell user={user} activeHref="/portal/finance">
      <div className="space-y-5">

        {/* Desktop top bar with welcome + controls — mobile uses shell header */}
        <div className="hidden lg:block">
          <GlassTopBar
            greeting={`Welcome, ${user.fullName ?? "Ozeki Team"}`}
            subtitle="Here's what's happening in your finance command center."
            controls={<GlassTopControls initials={initials} />}
          />
        </div>

        {/* Page title row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[24px] md:text-[32px] font-extrabold tracking-tight text-[#111111] leading-tight">
                Finance
              </h2>
              <Shield className="h-5 w-5 text-[#0F8F6B] shrink-0" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] md:text-[14px] text-[#6B6E76] leading-snug">
              Ledger, reconciliation, reporting, and donor ROI analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 -mx-1 px-1 overflow-x-auto no-scrollbar md:overflow-visible">
            <GlassButton variant="secondary" size="md" className="shrink-0 whitespace-nowrap">
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Export Reports</span>
              <span className="sm:hidden">Export</span>
            </GlassButton>
            <GlassButton
              variant="primary"
              size="md"
              href="/portal/finance/expenses?action=new"
              className="shrink-0 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">New Transaction</span>
              <span className="sm:hidden">New</span>
            </GlassButton>
          </div>
        </div>

        {/* KPI strip — 4 cards. Mobile: 2-col grid. md+: 4-col. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassFinanceKpiCard
            label="Total Received"
            value={fmtUsd(totalReceivedUsd)}
            subline="All income streams"
            deltaPct={incomeDeltaPct}
            deltaPositive
            icon={Banknote}
            spark={sparks.income}
          />
          <GlassFinanceKpiCard
            label="Total Spent"
            value={fmtUsd(totalSpentUsd)}
            subline="All programme spend"
            deltaPct={expensesDeltaPct}
            deltaPositive={false}
            icon={ArrowRightLeft}
            spark={sparks.expenses}
          />
          <GlassFinanceKpiCard
            label="Programme Delivery"
            value={`${programmeDeliveryPct}%`}
            subline="Direct-to-classroom spend"
            deltaPct={kpiDeltas.programmeDeliveryDeltaPp}
            deltaPositive
            icon={PieChart}
            ringPct={programmeDeliveryPct}
          />
          <GlassFinanceKpiCard
            label="Cost per Learner"
            value={fmtUsd(costPerLearnerUsd)}
            subline="Per district average"
            deltaPct={kpiDeltas.costPerLearnerDeltaPct}
            deltaPositive={false}
            icon={TrendingUp}
            spark={sparks.costPerLearner}
          />
        </div>

        {/* Three-column analytics row. lg: 7+5 (spending wide, allocation
            beside it, quick actions wraps to next row). 2xl: full 7+3+2. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Spending Trend */}
          <GlassCard className="lg:col-span-7 2xl:col-span-7 p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-[18px] font-bold text-[#111111] tracking-tight">Spending Trend</h3>
                <div className="flex items-center gap-4 mt-3">
                  <Legend label="Income" color="#0F8F6B" />
                  <Legend label="Expenses" color="#202124" />
                </div>
              </div>
              <span className="px-3 h-8 inline-flex items-center rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[12px] font-semibold text-[#222]">
                Last 90 days ▾
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-2">
              <div>
                <p className="text-[24px] font-extrabold text-[#111111] leading-none">
                  {fmtUsdAbbrev(trend.totalIncome / usdRate)}
                </p>
                <p className="text-[12px] text-[#6B6E76] mt-1.5">Total Income</p>
              </div>
              <div>
                <p className="text-[24px] font-extrabold text-[#111111] leading-none">
                  {fmtUsdAbbrev(trend.totalExpenses / usdRate)}
                </p>
                <p className="text-[12px] text-[#6B6E76] mt-1.5">Total Expenses</p>
              </div>
            </div>

            <div className="-mx-2">
              <SpendingTrendChart points={trend.points} />
            </div>

            <div className="mt-3 flex items-center gap-2 text-[12px]">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${
                  trend.netSurplus >= 0
                    ? "bg-[#0F8F6B]/10 text-[#0F8F6B] border-[#0F8F6B]/20"
                    : "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20"
                }`}
              >
                {trend.netSurplus >= 0
                  ? <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                  : <ArrowDownRight className="h-3 w-3" strokeWidth={2} />}
                Net surplus: {fmtUsdAbbrev(Math.abs(trend.netSurplus) / usdRate)}
              </span>
              <Link
                href="/portal/finance/reports"
                className="text-[#111111] font-semibold inline-flex items-center hover:underline"
              >
                View detail <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </GlassCard>

          {/* Fund Allocation */}
          <GlassCard className="lg:col-span-5 2xl:col-span-3 p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-[18px] font-bold text-[#111111] tracking-tight">Fund Allocation</h3>
              <span className="px-3 h-7 inline-flex items-center rounded-full border border-white/70 bg-white/65 text-[11px] font-semibold text-[#222]">
                All Funds ▾
              </span>
            </div>
            <div className="flex items-center justify-center mb-4">
              <FundAllocationDonut
                totalSpent={allocation.totalSpent / usdRate}
                slices={allocation.slices.map((s) => ({ ...s, amount: s.amount / usdRate }))}
                size={180}
              />
            </div>
            <ul className="space-y-2">
              {allocation.slices.length === 0 ? (
                <li className="text-[11px] text-[#6B6E76] italic text-center py-2">No allocation data yet</li>
              ) : (
                allocation.slices.slice(0, 4).map((s) => (
                  <li key={s.label} className="flex items-center justify-between text-[12px]">
                    <span className="inline-flex items-center gap-2 text-[#35383F]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                    <span className="text-[#6B6E76] font-mono">
                      <strong className="text-[#111111]">{fmtUsdAbbrev(s.amount / usdRate)}</strong>
                      <span className="ml-1.5 text-[#6B6E76]">{s.pct}%</span>
                    </span>
                  </li>
                ))
              )}
            </ul>
            <Link
              href="/portal/finance/reports"
              className="text-[12px] text-[#111111] font-semibold mt-3 inline-flex items-center hover:underline"
            >
              View full breakdown <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="lg:col-span-12 2xl:col-span-2 p-6">
            <h3 className="text-[18px] font-bold text-[#111111] mb-3 tracking-tight">Quick Actions</h3>
            <ul className="space-y-1">
              <SmallQuickAction icon={ListChecks} title="Reconcile Bank" sub="Match bank transactions" href="/portal/finance/reconciliation" />
              <SmallQuickAction icon={FileCheck} title="Generate Statement" sub="Create financial statement" href="/portal/finance/statements" />
              <SmallQuickAction icon={FilePlus2} title="Add Expense" sub="Record a new expense" href="/portal/finance/expenses?action=new" />
              <SmallQuickAction icon={Upload} title="Upload Receipt" sub="Attach and categorize" href="/portal/finance/receipts?action=upload" />
            </ul>
          </GlassCard>
        </div>

        {/* Module groupings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <ModuleGroup
            title="Core Ledger"
            span="lg:col-span-6 2xl:col-span-3"
            tiles={[
              { href: "/portal/finance/invoices", icon: FileText, label: "Invoices", body: "Issue + track customer invoices" },
              { href: "/portal/finance/receipts", icon: Receipt, label: "Receipts", body: "Record incoming payments" },
              { href: "/portal/finance/expenses", icon: Wallet, label: "Expenses", body: "Capture + post programme spend" },
              { href: "/portal/finance/income", icon: DollarSign, label: "Income Ledger", body: "All income streams" },
            ]}
          />
          <ModuleGroup
            title="Reports & Analytics"
            span="lg:col-span-12 2xl:col-span-6"
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
          <ModuleGroup
            title="Books & Configuration"
            span="lg:col-span-6 2xl:col-span-3"
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
        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-[#14141414] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold text-[#111111] tracking-tight">Recent Transactions</h3>
              <p className="text-[12px] text-[#6B6E76] mt-0.5">Latest service payments and financial activities.</p>
            </div>
            <Link
              href="/portal/finance/receipts"
              className="text-[12px] text-[#111111] font-semibold inline-flex items-center hover:underline"
            >
              View all transactions <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[14px] min-w-[1000px]">
              <thead className="bg-white/30">
                <tr className="text-left text-[10px] uppercase tracking-widest text-[#6B6E76] border-b border-[#14141414]">
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
                    <td colSpan={8} className="px-5 py-12 text-center text-[#6B6E76]">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 5).map((t, i) => (
                    <tr
                      key={`${t.reference}-${i}`}
                      className="border-b border-[#14141408] hover:bg-white/40 transition"
                    >
                      <td className="px-5 py-3.5 text-[#35383F] whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-5 py-3.5 text-[#111111] font-medium">{t.description}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            t.type === "income"
                              ? "bg-[#0F8F6B]/10 text-[#0F8F6B] border-[#0F8F6B]/20"
                              : "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20"
                          }`}
                        >
                          {t.type === "income" ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#35383F]">{t.category}</td>
                      <td className="px-5 py-3.5 text-right text-[#111111] font-bold">
                        {fmtUsdAbbrev(t.amount / usdRate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0F8F6B]/10 text-[#0F8F6B] border border-[#0F8F6B]/20">
                          {capitalize(t.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#6B6E76] font-mono text-[12px]">{t.reference}</td>
                      <td className="px-5 py-3.5 text-[#35383F]">{t.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {transactions.length > 0 && (
            <div className="px-5 py-3 border-t border-[#14141414] flex items-center justify-between">
              <p className="text-[12px] text-[#6B6E76]">
                Showing 1 to {Math.min(5, transactions.length)} of {totalTxnCount.toLocaleString()} transactions
              </p>
              <div className="flex items-center gap-1 text-[12px]">
                <PageChip>1</PageChip>
                <PageChip muted>2</PageChip>
                <PageChip muted>3</PageChip>
                <span className="text-[#6B6E76] px-1">…</span>
                <PageChip muted><ChevronRight className="h-3 w-3" strokeWidth={2} /></PageChip>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Bottom insight bar */}
        <GlassCard className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/70 bg-white/80 text-[#111111] shadow-[0_6px_16px_rgba(10,10,10,0.06)]">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[14px] font-bold text-[#111111]">Finance Insight</p>
              <p className="text-[12px] text-[#35383F]">
                You&apos;re maintaining healthy programme efficiency —{" "}
                <strong className="text-[#111111]">{programmeDeliveryPct}%</strong>{" "}
                of spend is reaching learners directly.{" "}
                <Link href="/portal/finance/cost-per-learner" className="text-[#111111] font-semibold hover:underline">
                  View performance details →
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#6B6E76] self-start md:self-center">
            <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            Data updated:{" "}
            {new Date().toLocaleString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </div>
        </GlassCard>
      </div>
    </FinanceGlassShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#35383F]">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SmallQuickAction({
  icon: Icon, title, sub, href,
}: {
  icon: typeof RotateCcw; title: string; sub: string; href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start gap-3 px-2 py-2 rounded-2xl hover:bg-white/55 transition-colors"
      >
        <div className="grid h-8 w-8 place-items-center rounded-xl border border-white/70 bg-white/70 text-[#111111] shadow-[0_4px_10px_rgba(10,10,10,0.05)] shrink-0">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#111111] leading-tight">{title}</p>
          <p className="text-[11px] text-[#6B6E76] leading-tight mt-0.5">{sub}</p>
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

function ModuleGroup({
  title, tiles, span,
}: {
  title: string;
  tiles: ModuleTile[];
  span: string;
}) {
  return (
    <section
      className={`rounded-[34px] border border-white/70 bg-white/55 backdrop-blur-2xl shadow-[0_22px_60px_rgba(10,10,10,0.10)] p-5 ${span}`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6B6E76] mb-3">{title}</p>
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
      className="group rounded-2xl border border-white/65 bg-white/55 hover:bg-white/80 transition-colors p-3 flex items-start gap-2.5"
    >
      <div className="grid h-8 w-8 place-items-center rounded-xl border border-white/70 bg-white/70 text-[#111111] shadow-[0_4px_10px_rgba(10,10,10,0.05)] shrink-0">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] font-bold text-[#111111] leading-tight">{label}</p>
          {isNew && (
            <span className="text-[8px] font-extrabold uppercase tracking-widest px-1 py-px rounded bg-[#111111] text-white">
              New
            </span>
          )}
        </div>
        <p className="text-[10.5px] text-[#6B6E76] leading-snug mt-0.5">{body}</p>
      </div>
    </Link>
  );
}

function PageChip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-md font-bold ${
        muted
          ? "bg-white/65 text-[#35383F] border border-white/70"
          : "bg-[#111111] text-white"
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

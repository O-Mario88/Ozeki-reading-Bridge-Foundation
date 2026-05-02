import Link from "next/link";
import { ReactNode } from "react";
import { PortalUser } from "@/lib/types";
import { FinanceGlassShell } from "./FinanceGlassShell";

type FinanceShellProps = {
  user: PortalUser;
  activeHref: string;
  title: string;
  children: ReactNode;
};

const financeNavItems = [
  { href: "/portal/finance", label: "Overview" },
  { href: "/portal/finance/invoices", label: "Invoices" },
  { href: "/portal/finance/receipts", label: "Receipts" },
  { href: "/portal/finance/income", label: "Income" },
  { href: "/portal/finance/expenses", label: "Expenses" },
  { href: "/portal/finance/reconciliation", label: "Reconciliation" },
  { href: "/portal/finance/audit-center", label: "Audit Center" },
  { href: "/portal/finance/budgets", label: "Budgets" },
  { href: "/portal/finance/statements", label: "Statements" },
  { href: "/portal/finance/transparency", label: "Transparency" },
];

/**
 * Finance workspace shell — wraps the glassprism `FinanceGlassShell` so
 * finance sub-pages keep the dark-frame / pale-gray-canvas / frosted-menu
 * look while the rest of the portal moved to the green Ozeki theme. The
 * tab strip is a horizontal-scroll glass-pill bar with a black active pill.
 */
export function FinanceShell({
  user,
  activeHref,
  title,
  children,
}: FinanceShellProps) {
  return (
    <FinanceGlassShell user={user} activeHref={activeHref}>
      <div className="space-y-5">
        {/* Workspace header */}
        <header>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#6B6E76]">
            Finance Workspace
          </p>
          <h1 className="text-[24px] md:text-[28px] lg:text-[30px] font-extrabold text-[#111111] tracking-tight leading-tight mt-1">
            {title}
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#6B6E76] leading-snug mt-1 max-w-2xl">
            Manage immutable posting rules and audit-safe operations.
          </p>
        </header>

        {/* Tab pills — horizontal scroll on mobile, normal flex on desktop */}
        <nav
          aria-label="Finance sections"
          className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1"
        >
          {financeNavItems.map((item) => {
            const isActive =
              activeHref === item.href ||
              (item.href !== "/portal/finance" &&
                activeHref.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={
                  isActive
                    ? "shrink-0 inline-flex items-center h-10 px-5 rounded-full bg-[#111111] text-white text-[13px] font-semibold whitespace-nowrap shadow-[0_14px_30px_rgba(10,10,10,0.18)]"
                    : "shrink-0 inline-flex items-center h-10 px-5 rounded-full border border-white/70 bg-white/65 backdrop-blur-xl text-[13px] font-semibold text-[#222] whitespace-nowrap hover:bg-white transition"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </FinanceGlassShell>
  );
}

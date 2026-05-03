import Link from "next/link";
import { ReactNode } from "react";
import { PortalUser } from "@/lib/types";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";

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
 * Finance workspace shell — uses the same green Ozeki shell as the rest of
 * the portal so finance sub-pages share the unified design system.
 */
export function FinanceShell({
  user,
  activeHref,
  title,
  children,
}: FinanceShellProps) {
  return (
    <OzekiPortalShell user={user} activeHref={activeHref} hideFrame>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Workspace header */}
        <header>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#066a67]">
            Finance Workspace
          </p>
          <h1 className="text-[22px] md:text-[26px] lg:text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight mt-1">
            {title}
          </h1>
          <p className="text-[13px] md:text-[14px] text-gray-500 leading-snug mt-1 max-w-2xl">
            Manage immutable posting rules and audit-safe operations.
          </p>
        </header>

        {/* Tab strip — horizontal scroll on mobile */}
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
                    ? "shrink-0 inline-flex items-center h-9 px-4 rounded-full bg-[#066a67] text-white text-[12.5px] font-semibold whitespace-nowrap shadow-sm"
                    : "shrink-0 inline-flex items-center h-9 px-4 rounded-full border border-gray-200 bg-white text-[12.5px] font-semibold text-gray-700 whitespace-nowrap hover:bg-gray-50 transition"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </OzekiPortalShell>
  );
}

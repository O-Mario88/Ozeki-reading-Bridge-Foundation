import Link from "next/link";

type PortalFinanceNavProps = {
  activeHref: string;
};

const financeItems = [
  { href: "/portal/finance", label: "Dashboard" },
  { href: "/portal/finance/invoices", label: "Invoices" },
  { href: "/portal/finance/receipts", label: "Receipts" },
  { href: "/portal/finance/money-in", label: "Income" },
  { href: "/portal/finance/money-out", label: "Expenses" },
  { href: "/portal/finance/reconciliation", label: "Reconciliation" },
  { href: "/portal/finance/audit-center", label: "Audit Center" },
  { href: "/portal/finance/budgets", label: "Budgets" },
  { href: "/portal/finance/statements", label: "Statements" },
  { href: "/portal/finance/transparency", label: "Transparency" },
  { href: "/portal/finance/settings", label: "Settings" },
];

export function PortalFinanceNav({ activeHref }: PortalFinanceNavProps) {
  return (
    <section className="card">
      <h2>Finance Navigation</h2>
      <div className="action-row">
        {financeItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={item.href === activeHref ? "button" : "button button-ghost"}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

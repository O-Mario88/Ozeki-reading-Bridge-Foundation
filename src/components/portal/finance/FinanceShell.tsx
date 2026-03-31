"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { PortalUser } from "@/lib/types";

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

function getUserInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FinanceShell({
  user,
  activeHref,
  title,
  children,
}: FinanceShellProps) {
  return (
    <div className="finance-shell">
      {/* Main Content */}
      <div className="finance-main" style={{ marginLeft: 0 }}>
        {/* Top Bar */}
        <header className="finance-topbar">
          <div className="finance-topbar-left">
            <Link
              href="/portal/dashboard"
              className="finance-btn finance-btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                fontSize: 13,
                gap: 6,
                textDecoration: "none",
              }}
            >
              ← Portal
            </Link>
            <h1 className="finance-topbar-title">{title}</h1>
          </div>

          <div className="finance-topbar-right">
            <div
              className="finance-topbar-avatar"
              title={user.fullName}
              aria-label={`User: ${user.fullName}`}
            >
              {getUserInitials(user.fullName)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div
          className="finance-content"
          style={{ padding: 0, backgroundColor: "#f9fafb", minHeight: "100vh" }}
        >
          <div
            style={{
              backgroundColor: "#111827",
              padding: "2.5rem 2.5rem 6.5rem 2.5rem",
              color: "white",
              position: "relative",
              zIndex: 1,
            }}
          >
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                margin: 0,
                color: "var(--fin-primary)",
              }}
            >
              Finance Workspace
            </h1>
            <p
              style={{
                color: "#9ca3af",
                margin: "0.25rem 0 2.5rem",
                fontSize: "0.9rem",
              }}
            >
              Welcome back! Manage immutable posting rules and audit-safe
              operations.
            </p>

            {/* Tab List */}
            <div
              style={{
                display: "flex",
                gap: "2rem",
                borderBottom: "1px solid #374151",
                whiteSpace: "nowrap",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {financeNavItems.map((item) => {
                const isActive =
                  activeHref === item.href ||
                  (activeHref.startsWith(item.href) &&
                    item.href !== "/portal/finance");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      color: isActive ? "var(--fin-primary)" : "#9ca3af",
                      fontWeight: isActive ? 600 : 500,
                      paddingBottom: "1rem",
                      borderBottom: isActive
                        ? "2px solid #ea580c"
                        : "2px solid transparent",
                      textDecoration: "none",
                      transition: "all 0.2s",
                      position: "relative",
                      top: "1px",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: "0 2.5rem 2.5rem",
              marginTop: "-3.5rem",
              position: "relative",
              zIndex: 10,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

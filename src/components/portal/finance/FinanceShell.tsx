"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { PortalUser } from "@/lib/types";

type FinanceShellProps = {
    user: PortalUser;
    activeHref: string;
    title: string;
    children: ReactNode;
};

const financeNavItems = [
    { href: "/portal/finance", label: "Dashboard" },
    { href: "/portal/finance/invoices", label: "Invoices" },
    { href: "/portal/finance/receipts", label: "Receipts" },
    { href: "/portal/finance/money-in", label: "Money In" },
    { href: "/portal/finance/money-out", label: "Money Out" },
    { href: "/portal/finance/reconciliation", label: "Reconciliation" },
    { href: "/portal/finance/audit-center", label: "Audit Center" },
    { href: "/portal/finance/budgets", label: "Budgets" },
    { href: "/portal/finance/statements", label: "Statements" },
    { href: "/portal/finance/transparency", label: "Transparency" },
    { href: "/portal/finance/settings", label: "Settings" },
];

function getUserInitials(name: string) {
    return name
        .split(" ")
        .map((p) => p[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function FinanceShell({ user, activeHref, title, children }: FinanceShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="finance-shell">
            {/* Overlay for mobile */}
            <div
                className={`finance-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <aside className={`finance-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Finance navigation">
                <div className="finance-sidebar-brand">
                    <h2>Finance</h2>
                    <p>Ozeki Reading Bridge Foundation</p>
                </div>

                <nav className="finance-sidebar-nav">
                    {financeNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`finance-nav-item ${item.href === activeHref ? "active" : ""}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="finance-sidebar-footer">
                    <Link href="/portal/dashboard">
                        ← Back to Portal
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="finance-main">
                {/* Top Bar */}
                <header className="finance-topbar">
                    <div className="finance-topbar-left">
                        <button
                            type="button"
                            className="finance-sidebar-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle sidebar menu"
                        >
                            ☰
                        </button>
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
                <div className="finance-content">
                    {children}
                </div>
            </div>
        </div>
    );
}

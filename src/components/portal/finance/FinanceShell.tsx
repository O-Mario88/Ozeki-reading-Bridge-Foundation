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
    { href: "/portal/finance", label: "Dashboard", icon: "📊" },
    { href: "/portal/finance/invoices", label: "Invoices", icon: "📄" },
    { href: "/portal/finance/receipts", label: "Receipts", icon: "🧾" },
    { href: "/portal/finance/money-in", label: "Money In", icon: "💰" },
    { href: "/portal/finance/money-out", label: "Money Out", icon: "💸" },
    { href: "/portal/finance/reconciliation", label: "Reconciliation", icon: "🔄" },
    { href: "/portal/finance/budgets", label: "Budgets", icon: "📈" },
    { href: "/portal/finance/statements", label: "Statements", icon: "📋" },
    { href: "/portal/finance/transparency", label: "Transparency", icon: "🔍" },
    { href: "/portal/finance/settings", label: "Settings", icon: "⚙️" },
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
                    <h2>Ozeki Accounts</h2>
                    <p>Finance Management</p>
                </div>

                <nav className="finance-sidebar-nav">
                    {financeNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`finance-nav-item ${item.href === activeHref ? "active" : ""}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="finance-nav-icon" aria-hidden="true">{item.icon}</span>
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
                        <div className="finance-search" role="search">
                            <span aria-hidden="true">🔍</span>
                            <input type="text" placeholder="Search finance…" aria-label="Search finance" />
                        </div>
                        <button type="button" className="finance-topbar-icon-btn" aria-label="Notifications">
                            🔔
                        </button>
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

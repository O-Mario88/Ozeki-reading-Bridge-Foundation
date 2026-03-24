"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { PortalLogoutButton } from "@/components/PortalLogoutButton";
import { PortalUser, PortalUserRole } from "@/lib/types";
import "@/app/portal-dashboard.css";

type PortalNavItem = {
  href: string;
  label: string;
  icon: string;
  superAdminOnly?: boolean;
  roles?: PortalUserRole[];
  section: "menu" | "features" | "cms" | "system";
};

const primaryNavItems: PortalNavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", icon: "📊", roles: ["Staff", "Admin", "Accountant"], section: "menu" },
  { href: "/portal/national-intelligence", label: "Insights", icon: "💡", roles: ["Staff", "Admin", "Accountant"], section: "menu" },
  { href: "/portal/schools", label: "Schools", icon: "🏫", roles: ["Staff", "Admin", "Volunteer", "Accountant"], section: "menu" },
  { href: "/portal/contacts", label: "CRM", icon: "👥", roles: ["Staff", "Admin", "Accountant"], section: "menu" },
  { href: "/portal/finance", label: "Finance", icon: "💰", roles: ["Accountant", "Admin"], section: "menu" },

  // Features
  { href: "/portal/assessments", label: "Assessments", icon: "📝", roles: ["Staff", "Admin", "Volunteer", "Accountant"], section: "features" },
  { href: "/portal/visits", label: "Visits/Coaching", icon: "🚶", roles: ["Staff", "Admin", "Accountant", "Volunteer"], section: "features" },
  { href: "/portal/trainings", label: "Trainings", icon: "🎓", roles: ["Staff", "Admin", "Accountant", "Volunteer"], section: "features" },
  { href: "/portal/interventions", label: "Interventions", icon: "🎯", roles: ["Staff", "Admin", "Accountant"], section: "features" },
  { href: "/portal/stories", label: "1001 Story", icon: "📖", roles: ["Staff", "Admin", "Volunteer", "Accountant"], section: "features" },
  { href: "/portal/reports", label: "Reports", icon: "📄", roles: ["Staff", "Volunteer", "Admin", "Accountant"], section: "features" },
  { href: "/portal/graduation-queue", label: "Graduation Queue", icon: "🎓", roles: ["Staff", "Admin", "Accountant"], section: "features" },

  // CMS
  { href: "/portal/blog", label: "Blog", icon: "✏️", roles: ["Staff", "Admin"], section: "cms" },
  { href: "/portal/events", label: "Events", icon: "📅", roles: ["Staff", "Admin"], section: "cms" },
  { href: "/portal/testimonials", label: "Testimonials", icon: "💬", roles: ["Staff", "Admin"], section: "cms" },
  { href: "/portal/gallery", label: "Gallery", icon: "🖼️", roles: ["Staff", "Admin"], section: "cms" },
  { href: "/portal/about", label: "About Page", icon: "ℹ️", roles: ["Staff", "Admin"], section: "cms" },

  // System
  { href: "/portal/superadmin", label: "User Management", icon: "👤", superAdminOnly: true, section: "system" },
  { href: "/portal/data-quality", label: "Data Quality", icon: "🛡️", roles: ["Staff", "Admin"], section: "system" },
  { href: "/portal/support", label: "Support Requests", icon: "🎧", roles: ["Staff", "Admin"], section: "system" },
  { href: "/portal/admin/settings", label: "Admin/Settings", icon: "⚙️", superAdminOnly: true, section: "system" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface PortalShellProps {
  user: PortalUser;
  activeHref: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  shellClassName?: string;
  children: ReactNode;
}

export function PortalShell({
  user,
  activeHref,
  title,
  description,
  actions,
  shellClassName,
  children,
}: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = primaryNavItems.filter((item) => {
    if (item.superAdminOnly && !user.isSuperAdmin) return false;
    if (user.isSuperAdmin) return true; // Super User sees everything
    if (item.roles && !item.roles.includes(user.role)) return false;
    return true;
  });

  const menuItems = navItems.filter((i) => i.section === "menu");
  const featureItems = navItems.filter((i) => i.section === "features");
  const cmsItems = navItems.filter((i) => i.section === "cms");
  const systemItems = navItems.filter((i) => i.section === "system");

  const roleLabel = [
    user.role,
    user.isSupervisor ? "Supervisor" : "",
    user.isME ? "M&E" : "",
    user.isAdmin ? "Admin" : "",
    user.isSuperAdmin ? "Super Admin" : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className={`ds-portal-shell ${shellClassName ?? ""}`.trim()}>
      <div className="ds-shell-container">
        {/* Light Sidebar */}
        <aside className={`ds-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="ds-sidebar-brand">
          <div className="ds-sidebar-brand-icon">ORB</div>
          <span className="ds-sidebar-brand-name">ORBF Portal</span>
        </div>

        {menuItems.length > 0 && (
          <nav className="ds-sidebar-section">
            <p className="ds-sidebar-section-label">Menu</p>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ds-nav-item${activeHref === item.href ? " active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="ds-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {featureItems.length > 0 && (
          <nav className="ds-sidebar-section">
            <p className="ds-sidebar-section-label">Features</p>
            {featureItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ds-nav-item${activeHref === item.href ? " active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="ds-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {cmsItems.length > 0 && (
          <nav className="ds-sidebar-section">
            <p className="ds-sidebar-section-label">Content / Website</p>
            {cmsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ds-nav-item${activeHref === item.href ? " active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="ds-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {systemItems.length > 0 && (
          <nav className="ds-sidebar-section">
            <p className="ds-sidebar-section-label">System</p>
            {systemItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ds-nav-item${activeHref === item.href ? " active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="ds-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ds-sidebar-user">
          <div className="ds-sidebar-avatar-sm">{getInitials(user.fullName)}</div>
          <div className="ds-sidebar-user-info">
            <p className="ds-sidebar-user-name">{user.fullName}</p>
            <p className="ds-sidebar-user-role">{roleLabel}</p>
          </div>
          <PortalLogoutButton />
        </div>
      </aside>

      <div
        className={`ds-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
        role="button"
        tabIndex={-1}
        aria-label="Close sidebar"
      />

      {/* Main Content */}
      <div className="ds-main">
        {/* Top Navbar */}
        <header className="ds-topbar">
          <button
            type="button"
            className="ds-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <form action="/portal/schools" method="get" className="ds-topbar-search">
            <input
              name="query"
              placeholder="Search schools, reports, records..."
              aria-label="Global search"
            />
          </form>

          <div className="ds-topbar-actions">
            <details className="ds-create-menu">
              <summary className="ds-topbar-icon-btn" title="Create new">✚</summary>
              <div className="ds-create-menu-list">
                <Link href="/portal/visits?new=1">New Visit</Link>
                <Link href="/portal/assessments?new=1">New Assessment</Link>
                <Link href="/portal/trainings?new=1">New Training</Link>
                <Link href="/portal/national-intelligence">New Intervention</Link>
                <Link href="/portal/resources">Upload Evidence</Link>
              </div>
            </details>

            <Link href="/portal/support" className="ds-topbar-icon-btn" title="Notifications">
              🔔
              <span className="ds-topbar-badge" />
            </Link>

            <Link href="/portal/profiles" className="ds-topbar-avatar" title={user.fullName}>
              {getInitials(user.fullName)}
            </Link>
          </div>
        </header>

        {/* Page Header + Content */}
        <div className="ds-content">
          <div className="ds-page-header">
            <h1 className="ds-page-title">{title}</h1>
            {description && <p className="ds-page-subtitle">{description}</p>}
            <p className="ds-breadcrumb">
              <Link href="/portal/dashboard">Dashboard</Link>
              {title !== "Staff Dashboard" && title !== "Dashboard" && (
                <>{" / "}{title}</>
              )}
            </p>
          </div>

          {actions && <div style={{ marginBottom: "1rem" }}>{actions}</div>}
          {children}
        </div>
      </div>
      </div>
    </div>
  );
}

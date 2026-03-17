import Link from "next/link";
import { ReactNode } from "react";
import { PortalLogoutButton } from "@/components/PortalLogoutButton";
import { PortalUser, PortalUserRole } from "@/lib/types";

type PortalNavItem = {
  href: string;
  label: string;
  staffOnly?: boolean;
  superAdminOnly?: boolean;
  roles?: PortalUserRole[];
};

const primaryNavItems: PortalNavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", staffOnly: true },
  { href: "/portal/national-intelligence", label: "Insights", staffOnly: true },
  { href: "/portal/schools", label: "Schools", staffOnly: true },
  { href: "/portal/assessments", label: "Assessments", staffOnly: true },
  { href: "/portal/visits", label: "Visits/Coaching", staffOnly: true },
  { href: "/portal/trainings", label: "Trainings", staffOnly: true },
  { href: "/portal/interventions", label: "Interventions", staffOnly: true },
  { href: "/portal/reports", label: "Reports", roles: ["Staff", "Volunteer", "Admin"] },
  { href: "/portal/admin/settings", label: "Admin/Settings", superAdminOnly: true },
];

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
  const navItems = primaryNavItems.filter((item) => {
    if (item.superAdminOnly && !user.isSuperAdmin) {
      return false;
    }
    if (item.staffOnly && user.role === "Volunteer") {
      return false;
    }
    if (item.roles && !item.roles.includes(user.role) && !user.isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <section className="section portal-section">
      <div className={`container portal-shell portal-shell-layout ${shellClassName ?? ""}`.trim()}>
        <aside className="portal-sidebar card">
          <p className="portal-overline">NLIP Workspace</p>
          <h2 className="portal-sidebar-title">Navigation</h2>
          <nav className="portal-nav portal-nav-vertical" aria-label="Portal navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={activeHref === item.href ? "portal-nav-item active" : "portal-nav-item"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="portal-main-column">
          <header className="portal-topbar card">
            <form action="/portal/schools" method="get" className="portal-topbar-search">
              <input
                name="query"
                placeholder="Search schools, reports, records..."
                aria-label="Global search"
              />
            </form>
            <div className="portal-topbar-actions">
              <details className="portal-create-menu">
                <summary className="button">Create</summary>
                <div className="portal-create-menu-list">
                  <Link href="/portal/visits?new=1">Visit</Link>
                  <Link href="/portal/assessments?new=1">Assessment</Link>
                  <Link href="/portal/trainings?new=1">Training</Link>
                  <Link href="/portal/national-intelligence">Intervention</Link>
                  <Link href="/portal/resources">Evidence</Link>
                </div>
              </details>
              <Link href="/portal/support" className="button button-ghost">
                Notifications
              </Link>
              <Link href="/portal/profiles" className="button button-ghost">
                {user.fullName}
              </Link>
              <PortalLogoutButton />
            </div>
          </header>

          <header className="portal-header card">
            <div className="portal-header-top">
              <div>
                <p className="portal-overline">Ozeki Staff Portal</p>
                <h1>{title}</h1>
                {description ? <p>{description}</p> : null}
              </div>
              <div className="portal-user-box">
                <p>
                  <strong>{user.fullName}</strong>
                </p>
                <p>
                  {user.role}
                  {user.isSupervisor ? " • Supervisor" : ""}
                  {user.isME ? " • M&E" : ""}
                  {user.isAdmin ? " • Admin" : ""}
                  {user.isSuperAdmin ? " • Super Admin" : ""}
                </p>
              </div>
            </div>
          </header>

          {actions ? <div className="portal-page-actions">{actions}</div> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

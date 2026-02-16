import Link from "next/link";
import { ReactNode } from "react";
import { PortalLogoutButton } from "@/components/PortalLogoutButton";
import { PortalUser } from "@/lib/types";

type PortalNavItem = {
  href: string;
  label: string;
};

const portalNavItems: PortalNavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/trainings", label: "Trainings" },
  { href: "/portal/visits", label: "Visits" },
  { href: "/portal/assessments", label: "Assessments" },
  { href: "/portal/story", label: "1001 Story" },
  { href: "/portal/schools", label: "Schools" },
  { href: "/portal/reports", label: "Reports" },
];

interface PortalShellProps {
  user: PortalUser;
  activeHref: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PortalShell({
  user,
  activeHref,
  title,
  description,
  actions,
  children,
}: PortalShellProps) {
  return (
    <section className="section portal-section">
      <div className="container portal-shell">
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
              </p>
              <PortalLogoutButton />
            </div>
          </div>

          <nav className="portal-nav" aria-label="Portal navigation">
            {portalNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.href === activeHref ? "portal-nav-item active" : "portal-nav-item"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        {actions ? <div className="portal-page-actions">{actions}</div> : null}
        {children}
      </div>
    </section>
  );
}

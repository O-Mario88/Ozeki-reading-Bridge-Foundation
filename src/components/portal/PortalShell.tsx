import Link from "next/link";
import { ReactNode } from "react";
import { PortalLogoutButton } from "@/components/PortalLogoutButton";
import { PortalUser } from "@/lib/types";

type PortalNavItem = {
  href: string;
  label: string;
  staffOnly?: boolean;
  superAdminOnly?: boolean;
};

const portalNavItems: PortalNavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", staffOnly: true },
  { href: "/portal/profiles", label: "Profiles" },
  { href: "/portal/analytics", label: "Data Dashboard", staffOnly: true },
  { href: "/portal/trainings", label: "Trainings" },
  { href: "/portal/visits", label: "Visits" },
  { href: "/portal/assessments", label: "Assessments" },
  { href: "/portal/story", label: "1001 Story" },
  { href: "/portal/resources", label: "Resources", staffOnly: true },
  { href: "/portal/blog", label: "Blog Posts", staffOnly: true },
  { href: "/portal/events", label: "Events", staffOnly: true },
  { href: "/portal/testimonials", label: "Testimonials" },
  { href: "/portal/schools", label: "Schools", staffOnly: true },
  { href: "/portal/reports", label: "Reports", staffOnly: true },
  { href: "/portal/superadmin", label: "Super Admin", superAdminOnly: true },
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
  const navItems = portalNavItems.filter((item) => {
    if (item.superAdminOnly && !user.isSuperAdmin) {
      return false;
    }
    if (item.staffOnly && user.role === "Volunteer") {
      return false;
    }
    return true;
  });

  return (
    <section className="section portal-section">
      <div className={`container portal-shell ${shellClassName ?? ""}`.trim()}>
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
              <PortalLogoutButton />
            </div>
          </div>

          <nav className="portal-nav" aria-label="Portal navigation">
            {navItems.map((item) => (
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

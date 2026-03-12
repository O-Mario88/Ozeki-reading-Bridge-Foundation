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

const portalNavItems: PortalNavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", staffOnly: true },
  { href: "/portal/profiles", label: "Profiles" },
  { href: "/portal/analytics", label: "Data Dashboard" },
  { href: "/portal/reports", label: "Report Profile", roles: ["Staff", "Volunteer", "Admin"] },
  { href: "/portal/trainings", label: "Trainings" },
  { href: "/portal/visits", label: "Visits" },
  { href: "/portal/assessments", label: "Assessments" },
  { href: "/portal/story", label: "1001 Story" },
  { href: "/portal/stories", label: "Story Library", staffOnly: true },
  { href: "/portal/blog", label: "Blog", staffOnly: true },
  { href: "/portal/about", label: "About Content", staffOnly: true },
  { href: "/portal/gallery", label: "Gallery", staffOnly: true },
  { href: "/portal/resources", label: "Resources", staffOnly: true },
  { href: "/portal/newsletter", label: "Newsletter", roles: ["Staff", "Admin"] },
  { href: "/portal/newsletter/builder", label: "Newsletter Builder", roles: ["Staff", "Admin"] },

  { href: "/portal/events", label: "Events", staffOnly: true },
  { href: "/portal/schools", label: "Schools", staffOnly: true },
  { href: "/portal/graduation-queue", label: "Graduation Queue", staffOnly: true },
  { href: "/portal/support", label: "Support Tickets", staffOnly: true },
  { href: "/portal/data-quality", label: "Data Quality", roles: ["Staff", "Admin"] },
  { href: "/portal/finance", label: "Finance", roles: ["Admin"] },
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
    if (item.roles && !item.roles.includes(user.role) && !user.isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <section className="section portal-section">
      <div className={`container portal-shell portal-shell-compact ${shellClassName ?? ""}`.trim()}>
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

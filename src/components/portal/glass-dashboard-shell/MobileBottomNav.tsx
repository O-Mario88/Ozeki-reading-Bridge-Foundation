import Link from "next/link";
import {
  LayoutDashboard,
  School as SchoolIcon,
  CreditCard,
  FileText,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import type { PortalUserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: PortalUserRole[];
  superAdminOnly?: boolean;
}

const items: NavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/schools", label: "Schools", icon: SchoolIcon },
  // Finance is locked to Super Admin per the onboarding-tier spec, mirroring
  // the sidebar nav rule. Plain Admins / Staff / Volunteers see four tabs.
  { href: "/portal/finance", label: "Finance", icon: CreditCard, superAdminOnly: true },
  { href: "/portal/reports", label: "Reports", icon: FileText },
  { href: "/portal/support", label: "Support", icon: Headphones },
];

interface Props {
  activeHref: string;
  user: { role: PortalUserRole; isSuperAdmin?: boolean };
}

/**
 * Fixed bottom navigation, mobile-only (`<lg`). Always 5 items max — items
 * the current user can't access fall back to a portal-wide default.
 *
 * Active item flips to a black pill icon + black label; everything else stays
 * monochrome gray. Labels never wrap.
 */
export function MobileBottomNav({ activeHref, user }: Props) {
  const visible = items.filter((item) => {
    if (item.superAdminOnly) return Boolean(user.isSuperAdmin);
    if (!item.roles) return true;
    if (user.isSuperAdmin) return true;
    return item.roles.includes(user.role);
  });

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur-xl shadow-[0_-12px_30px_rgba(10,10,10,0.08)] pb-[env(safe-area-inset-bottom)]"
      style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
    >
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-2">
        {visible.map((item) => {
          const isActive = activeHref === item.href || activeHref.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                prefetch={false}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={
                    isActive
                      ? "grid h-9 w-9 place-items-center rounded-full bg-[#066a67] text-white shadow-[0_8px_18px_rgba(6,106,103,0.32)]"
                      : "grid h-9 w-9 place-items-center rounded-full text-[#6B6E76]"
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span
                  className={
                    isActive
                      ? "w-full truncate text-center text-[11px] font-bold leading-none text-[#066a67]"
                      : "w-full truncate text-center text-[11px] font-medium leading-none text-[#6B6E76]"
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

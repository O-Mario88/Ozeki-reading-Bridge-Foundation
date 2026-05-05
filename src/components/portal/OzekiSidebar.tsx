import Link from "next/link";
import Image from "next/image";
import {
  glassNavItems,
  filterNavForUser,
  isHrefActive,
  type GlassNavSection,
} from "@/components/portal/glass-dashboard-shell/nav-config";
import type { PortalUser } from "@/lib/types";
import { PortalLogoutButton } from "@/components/PortalLogoutButton";

interface Props {
  user: PortalUser;
  activeHref: string;
  /** When true, drops the `hidden lg:flex` so it can be shown inside the
   *  mobile slide-over. */
  forceVisible?: boolean;
}

const sectionOrder: { key: GlassNavSection; label: string }[] = [
  { key: "menu", label: "MENU" },
  { key: "features", label: "READING OPERATIONS" },
  { key: "cms", label: "CONTENT / WEBSITE" },
  { key: "system", label: "SYSTEM" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Deep-green vertical sidebar — matches the reference dashboard screenshot.
 * Renders the full nav (sections MAIN / PROGRAMS / CONTENT & RESOURCES /
 * SYSTEM) plus the brand lockup at the top and the user pod + sign-out at
 * the bottom. Hidden below `lg` by default; pass `forceVisible` to show it
 * inside the mobile slide-over.
 */
export function OzekiSidebar({ user, activeHref, forceVisible = false }: Props) {
  const allowed = filterNavForUser(glassNavItems, user);

  const roleLabel = [
    user.role,
    user.isSupervisor ? "Supervisor" : "",
    user.isME ? "M&E" : "",
    user.isAdmin ? "Admin" : "",
    user.isSuperAdmin ? "Super Admin" : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const wrapperCls = forceVisible
    ? "flex flex-col h-full w-full bg-[#044f4d] text-white overflow-hidden"
    : "hidden lg:flex flex-col h-screen w-[248px] xl:w-[260px] bg-[#044f4d] text-white border-r border-black/10 overflow-hidden sticky top-0";

  return (
    <aside aria-label="Primary navigation" className={wrapperCls}>
      {/* Brand — real Ozeki Reading Bridge Foundation logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-white/10">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shrink-0 overflow-hidden">
          <Image
            src="/photos/logo.png"
            alt="Ozeki Reading Bridge Foundation"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold leading-none tracking-tight text-white">OZEKI</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 leading-tight mt-1">
            Reading Bridge<br />Foundation
          </p>
        </div>
      </div>

      {/* Nav (scrollable) */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {sectionOrder.map(({ key, label }) => {
          const items = allowed.filter((i) => i.section === key);
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                {label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isHrefActive(item.href, activeHref);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-current={isActive ? "page" : undefined}
                        className={
                          isActive
                            ? "flex items-center gap-3 h-10 rounded-lg px-3 bg-gradient-to-r from-[#ff7235] to-[#e85f24] text-white text-[13px] font-semibold shadow-[0_4px_14px_-2px_rgba(255,114,53,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]"
                            : "flex items-center gap-3 h-10 rounded-lg px-3 text-white/75 text-[13px] font-medium hover:bg-[#ff7235]/15 hover:text-[#ffd8c4] transition"
                        }
                      >
                        <Icon
                          className={isActive ? "h-[17px] w-[17px] text-white shrink-0" : "h-[17px] w-[17px] text-white/70 shrink-0"}
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User pod */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#044f4d] text-[12px] font-bold text-white shrink-0">
            {getInitials(user.fullName ?? user.email ?? "OS")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-white truncate leading-tight">
              {user.fullName ?? user.email}
            </p>
            {roleLabel && (
              <p className="text-[10.5px] text-white/55 truncate leading-tight mt-0.5">
                {roleLabel}
              </p>
            )}
          </div>
          <PortalLogoutButton />
        </div>
      </div>
    </aside>
  );
}

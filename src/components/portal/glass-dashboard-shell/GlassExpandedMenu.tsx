import Link from "next/link";
import { Sparkles, Minus } from "lucide-react";
import {
  glassNavItems,
  filterNavForUser,
  getSectionMeta,
  findActiveSection,
  isHrefActive,
  type GlassNavSection,
} from "./nav-config";
import type { PortalUser } from "@/lib/types";
import { PortalLogoutButton } from "@/components/PortalLogoutButton";

interface Props {
  user: PortalUser;
  activeHref: string;
}

const sectionOrder: GlassNavSection[] = ["menu", "features", "cms", "system"];

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
 * The big frosted menu panel from the reference. Renders all 4 sections; the
 * section that contains the active route is highlighted with a black pill on
 * the section header AND its current item gets a white sub-pill.
 *
 * On small screens this collapses inside a slide-over (handled by the shell).
 */
export function GlassExpandedMenu({ user, activeHref }: Props) {
  const allowed = filterNavForUser(glassNavItems, user);
  const activeSection = findActiveSection(activeHref);

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
    <aside
      aria-label="Primary navigation"
      className="flex flex-col rounded-[40px] border border-white/70 bg-white/55 backdrop-blur-2xl shadow-[0_30px_90px_rgba(10,10,10,0.14)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-7 pt-7 pb-5">
        <Sparkles className="h-5 w-5 text-[#111111]" strokeWidth={1.75} />
        <h2 className="text-[22px] font-bold text-[#111111] tracking-tight">Menu</h2>
      </div>

      <span className="mx-7 h-px bg-[#14141414]" aria-hidden />

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {sectionOrder.map((section) => {
          const items = allowed.filter((i) => i.section === section);
          if (items.length === 0) return null;

          const meta = getSectionMeta(section);
          const SectionIcon = meta.icon;
          const isSectionActive = section === activeSection;

          return (
            <div key={section} className="mb-2">
              {/* Section header — black pill if its area is active */}
              <div
                className={
                  isSectionActive
                    ? "flex items-center justify-between gap-3 h-14 rounded-full bg-[#111111] px-5 text-white shadow-[0_18px_38px_rgba(10,10,10,0.22)]"
                    : "flex items-center justify-between gap-3 h-12 rounded-full px-5 text-[#222]"
                }
              >
                <span className="inline-flex items-center gap-3 min-w-0">
                  <SectionIcon
                    className={isSectionActive ? "h-[18px] w-[18px] text-white" : "h-[18px] w-[18px] text-[#202124]"}
                    strokeWidth={1.75}
                  />
                  <span
                    className={
                      isSectionActive
                        ? "text-[16px] font-semibold tracking-tight"
                        : "text-[15px] font-semibold tracking-tight text-[#222]"
                    }
                  >
                    {meta.label}
                  </span>
                </span>
                {isSectionActive && (
                  <Minus className="h-4 w-4 opacity-70" strokeWidth={2} />
                )}
              </div>

              {/* Sub-items: render with subtle indent + connector */}
              <div className="mt-1 ml-2 pl-4 border-l border-[#14141418] flex flex-col gap-1 py-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isHrefActive(item.href, activeHref);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={
                        isActive
                          ? "flex items-center gap-3 h-12 rounded-full bg-white/85 px-4 text-[14px] font-semibold text-[#111111] shadow-[0_12px_30px_rgba(10,10,10,0.08)]"
                          : "flex items-center gap-3 h-11 rounded-full px-4 text-[14px] font-medium text-[#35383F] hover:bg-white/55 transition"
                      }
                    >
                      <Icon
                        className="h-[16px] w-[16px] text-[#202124] shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mx-5 mb-5 mt-2 flex items-center gap-3 rounded-[28px] border border-white/70 bg-white/65 px-4 py-3 shadow-[0_10px_28px_rgba(10,10,10,0.06)] backdrop-blur-xl">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#111111] text-[12px] font-bold text-white shrink-0">
          {getInitials(user.fullName ?? user.email ?? "OS")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#111111] truncate leading-tight">
            {user.fullName ?? user.email}
          </p>
          {roleLabel && (
            <p className="text-[11px] text-[#6B6E76] truncate leading-tight mt-0.5">
              {roleLabel}
            </p>
          )}
        </div>
        <PortalLogoutButton />
      </div>
    </aside>
  );
}

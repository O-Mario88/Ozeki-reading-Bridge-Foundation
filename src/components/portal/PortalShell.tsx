import { ReactNode } from "react";
import "@/app/portal-dashboard.css";
import { PortalUser } from "@/lib/types";
import { GlassDashboardShell } from "./glass-dashboard-shell";

interface PortalShellProps {
  user: PortalUser;
  activeHref: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  shellClassName?: string;
  /** When true, the page handles its own header — shell renders only nav chrome. */
  hideFrame?: boolean;
  children: ReactNode;
}

/**
 * Legacy PortalShell preserved for the ~77 portal pages that still consume it.
 * The internals now delegate to `GlassDashboardShell` so every page using
 * this shell inherits the glassprism theme: charcoal frame, pale gray rounded
 * canvas, slim icon rail, frosted expanded menu, fixed mobile bottom nav.
 *
 * The dark navy `ds-sidebar` / `ds-topbar` chrome is gone. The page-level
 * `title` / `description` / `actions` props now render inside the glass main
 * slot in monochrome typography. The wrapper carries the `glass-portal-shell`
 * class so legacy `.button` / `.button-ghost` / `.action-row` markup picks
 * up the glassprism re-skin defined in globals.css.
 */
export function PortalShell({
  user,
  activeHref,
  title,
  description,
  actions,
  shellClassName,
  hideFrame = false,
  children,
}: PortalShellProps) {
  return (
    <GlassDashboardShell user={user} activeHref={activeHref}>
      <div
        className={`glass-portal-shell space-y-5 ${shellClassName ?? ""}`.trim()}
      >
        {!hideFrame && (title || description || actions) && (
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="min-w-0">
              {title && (
                <h1 className="text-[22px] md:text-[28px] lg:text-[30px] font-extrabold text-[#111111] tracking-tight leading-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-[13px] md:text-[14px] text-[#6B6E76] leading-snug mt-1 max-w-2xl">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="action-row -mx-1 px-1 overflow-x-auto md:overflow-visible no-scrollbar">
                {actions}
              </div>
            )}
          </header>
        )}
        {children}
      </div>
    </GlassDashboardShell>
  );
}

import { ReactNode } from "react";
import { glassFont } from "./fonts";
import { GlassIconRail } from "./GlassIconRail";
import { GlassExpandedMenu } from "./GlassExpandedMenu";
import { GlassMobileNav } from "./GlassMobileNav";
import type { PortalUser } from "@/lib/types";

interface Props {
  user: PortalUser;
  activeHref: string;
  children: ReactNode;
}

/**
 * Outer shell for portal dashboard pages — implements the glassprism
 * reference: dark outer frame, pale gray rounded canvas, slim icon rail,
 * frosted expanded menu, and main content area. All page chrome (top bar,
 * page header) is rendered by the page itself in the `children` slot.
 *
 * Auth + role filtering are honoured via PortalUser flags.
 */
export function GlassDashboardShell({ user, activeHref, children }: Props) {
  return (
    <div
      className={`${glassFont.variable} min-h-screen bg-[#1F1F1F] p-3 sm:p-5 lg:p-6 font-[var(--font-glass-dashboard)] text-[#111111]`}
    >
      <div className="min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-48px)] overflow-hidden rounded-[28px] sm:rounded-[40px] lg:rounded-[48px] bg-[#D8D9DE] shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid lg:grid-cols-[96px_minmax(360px,420px)_minmax(0,1fr)] gap-5 lg:gap-7 p-4 sm:p-6 lg:p-7">

          {/* Icon rail (lg+) */}
          <GlassIconRail user={user} activeHref={activeHref} />

          {/* Expanded menu (lg+, hidden on mobile — opened via slide-over) */}
          <div className="hidden lg:block">
            <GlassExpandedMenu user={user} activeHref={activeHref} />
          </div>

          {/* Mobile slide-over containing the same expanded menu */}
          <GlassMobileNav>
            <GlassExpandedMenu user={user} activeHref={activeHref} />
          </GlassMobileNav>

          {/* Main content */}
          <main className="min-w-0 pt-12 lg:pt-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

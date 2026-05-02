import { ReactNode } from "react";
import { glassFont } from "./fonts";
import { OzekiSidebar } from "@/components/portal/OzekiSidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import type { PortalUser } from "@/lib/types";

interface Props {
  user: PortalUser;
  activeHref: string;
  /** Optional right-side icon for the mobile header (defaults to a bell). */
  mobileRightSlot?: ReactNode;
  children: ReactNode;
}

/**
 * Portal dashboard shell — replicates the reference dashboard screenshot.
 *
 * Desktop (`lg+`): deep-green fixed sidebar (Ozeki branding + nav + user
 *                  pod) on the left, off-white canvas on the right.
 * Mobile (`<lg`):  light gray page → mobile header (hamburger + brand) →
 *                  stacked main content → fixed mobile bottom nav (5 items),
 *                  safe-area aware. The mobile slide-over carries the same
 *                  desktop sidebar so role-filtered nav stays consistent.
 *
 * Wrapped pages (PortalShell, FinanceShell) render their own page-level
 * header inside `children` — the shell itself is purely chrome.
 */
export function GlassDashboardShell({ user, activeHref, mobileRightSlot, children }: Props) {
  return (
    <div
      className={`${glassFont.variable} font-[var(--font-glass-dashboard)] text-[#0f172a]`}
    >
      {/* Mobile layout (<lg) */}
      <div className="lg:hidden min-h-screen bg-[#f4f6f5]">
        <div className="px-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
          <MobileHeader user={user} activeHref={activeHref} rightSlot={mobileRightSlot} />
        </div>
        <main className="px-4 pt-4 space-y-5 pb-[calc(7rem_+_env(safe-area-inset-bottom))]">
          {children}
        </main>
        <MobileBottomNav activeHref={activeHref} user={user} />
      </div>

      {/* Desktop layout (lg+) — deep-green sidebar + white canvas */}
      <div className="hidden lg:flex min-h-screen bg-[#f7f8f7]">
        <OzekiSidebar user={user} activeHref={activeHref} />
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

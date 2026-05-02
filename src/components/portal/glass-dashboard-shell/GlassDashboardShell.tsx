import { ReactNode } from "react";
import { glassFont } from "./fonts";
import { GlassExpandedMenu } from "./GlassExpandedMenu";
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
 * Outer shell for portal dashboard pages — implements the glassprism reference.
 *
 * Desktop (`lg+`):  charcoal frame → pale gray rounded canvas → expanded
 *                   frosted menu (primary nav) + main content. The slim
 *                   icon rail was removed at the user's request — kept only
 *                   for mobile via the bottom nav.
 * Mobile (`<lg`):   light gray page → mobile header (hamburger + brand) →
 *                   stacked main content → fixed mobile bottom nav (5 items),
 *                   safe-area aware
 *
 * The main content slot owns its own typography/cards. The shell is purely
 * chrome. Auth + role filtering are honoured via PortalUser flags.
 */
export function GlassDashboardShell({ user, activeHref, mobileRightSlot, children }: Props) {
  return (
    <div
      className={`${glassFont.variable} font-[var(--font-glass-dashboard)] text-[#111111]`}
    >
      {/* Mobile layout (<lg) */}
      <div className="lg:hidden min-h-screen bg-[#E9EBEF]">
        <div className="px-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
          <MobileHeader user={user} activeHref={activeHref} rightSlot={mobileRightSlot} />
        </div>
        <main className="px-4 pt-4 space-y-5 pb-[calc(7rem_+_env(safe-area-inset-bottom))]">
          {children}
        </main>
        <MobileBottomNav activeHref={activeHref} user={user} />
      </div>

      {/* Desktop layout (lg+) — expanded menu + main only, no icon rail */}
      <div className="hidden lg:block min-h-screen bg-[#1F1F1F] p-6">
        <div className="min-h-[calc(100vh-48px)] overflow-hidden rounded-[48px] bg-[#D8D9DE] shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
          <div className="grid lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] gap-7 p-7">
            <GlassExpandedMenu user={user} activeHref={activeHref} />
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ReactNode } from "react";
import { glassFont } from "@/components/portal/glass-dashboard-shell/fonts";
import { GlassExpandedMenu } from "@/components/portal/glass-dashboard-shell/GlassExpandedMenu";
import { MobileHeader } from "@/components/portal/glass-dashboard-shell/MobileHeader";
import { MobileBottomNav } from "@/components/portal/glass-dashboard-shell/MobileBottomNav";
import type { PortalUser } from "@/lib/types";

interface Props {
  user: PortalUser;
  activeHref: string;
  children: ReactNode;
}

/**
 * Glassprism shell preserved exclusively for finance pages — charcoal frame
 * → pale gray rounded canvas → frosted expanded menu + main content. The
 * rest of the portal moved to the green Ozeki theme; finance kept its glass
 * theme per user instruction.
 */
export function FinanceGlassShell({ user, activeHref, children }: Props) {
  return (
    <div
      className={`${glassFont.variable} font-[var(--font-glass-dashboard)] text-[#111111]`}
    >
      {/* Mobile (<lg) */}
      <div className="lg:hidden min-h-screen bg-[#E9EBEF]">
        <div className="px-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
          <MobileHeader user={user} activeHref={activeHref} variant="glass" />
        </div>
        <main className="px-4 pt-4 space-y-5 pb-[calc(7rem_+_env(safe-area-inset-bottom))]">
          {children}
        </main>
        <MobileBottomNav activeHref={activeHref} user={user} />
      </div>

      {/* Desktop (lg+) — frosted menu + main content on rounded gray canvas */}
      <div className="hidden lg:block min-h-screen bg-[#1F1F1F] p-5 xl:p-6">
        <div className="min-h-[calc(100vh-40px)] xl:min-h-[calc(100vh-48px)] overflow-hidden rounded-[40px] xl:rounded-[48px] bg-[#D8D9DE] shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] gap-5 xl:gap-7 p-5 xl:p-7">
            <GlassExpandedMenu user={user} activeHref={activeHref} />
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ReactNode } from "react";
import { OzekiSidebar } from "./OzekiSidebar";
import { OzekiTopBar } from "./OzekiTopBar";
import { MobileBottomNav } from "./glass-dashboard-shell/MobileBottomNav";
import { MobileHeader } from "./glass-dashboard-shell/MobileHeader";
import type { PortalUser } from "@/lib/types";

const PORTAL_FONT_STACK = 'Calibri, "Segoe UI", Arial, sans-serif';

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  user: PortalUser;
  activeHref: string;
  /** Greeting shown on top bar; defaults to "Welcome back, [name]". */
  greeting?: string;
  /** Subtitle shown beneath the greeting. */
  subtitle?: string;
  /** Page title rendered just below the top bar (above the content). */
  title?: string;
  /** Page description rendered next to the title. */
  description?: string;
  /** Right-aligned action buttons next to the page title. */
  actions?: ReactNode;
  /** When true, omit the title row — page renders its own header. */
  hideFrame?: boolean;
  children: ReactNode;
}

/**
 * Ozeki portal shell — green sidebar + white workspace, matching the
 * dashboard reference screenshot. Used by the main dashboard and (via
 * `PortalShell`) by every other portal page that's not the finance
 * dashboard.
 *
 * Mobile (`<lg`) keeps the existing slide-over menu + fixed bottom nav
 * pattern from `MobileHeader` / `MobileBottomNav`.
 */
export function OzekiPortalShell({
  user,
  activeHref,
  greeting,
  subtitle,
  title,
  description,
  actions,
  hideFrame = false,
  children,
}: Props) {
  const initials = getInitials(user.fullName ?? user.email ?? "OS");
  const displayGreeting =
    greeting ?? `Welcome back, ${user.fullName ?? "Ozeki Team"} 👋`;
  const displaySubtitle =
    subtitle ?? "Here's what's happening across your literacy network today.";

  return (
    <div
      className="text-gray-900"
      style={{ fontFamily: PORTAL_FONT_STACK }}
    >
      {/* Mobile (<lg) */}
      <div className="lg:hidden min-h-screen bg-gray-50">
        {/* Full-bleed green branded header */}
        <MobileHeader user={user} activeHref={activeHref} />

        {/* Heading: page title/description if provided, else greeting/subtitle.
            hideFrame still suppresses the page title so dashboard pages can
            render their own header content while keeping the welcome strip. */}
        <section className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          {!hideFrame && (title || description) ? (
            <>
              {title && (
                <h1 className="text-[20px] font-bold text-gray-900 tracking-tight leading-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-[12.5px] text-gray-500 leading-snug mt-1">
                  {description}
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-[19px] font-bold text-gray-900 tracking-tight leading-tight">
                {displayGreeting}
              </h1>
              <p className="text-[12.5px] text-gray-500 leading-snug mt-1">
                {displaySubtitle}
              </p>
            </>
          )}
          {!hideFrame && actions && <div className="mt-3 action-row">{actions}</div>}
        </section>

        <main className="px-4 pt-4 space-y-5 pb-[calc(7rem_+_env(safe-area-inset-bottom))]">
          {children}
        </main>
        <MobileBottomNav activeHref={activeHref} user={user} />
      </div>

      {/* Desktop (lg+) */}
      <div className="hidden lg:flex min-h-screen bg-gray-50">
        <OzekiSidebar user={user} activeHref={activeHref} />
        <div className="flex-1 min-w-0 flex flex-col">
          <OzekiTopBar
            greeting={displayGreeting}
            subtitle={displaySubtitle}
            initials={initials}
          />
          <main className="flex-1 min-w-0 overflow-x-hidden">
            <div className="px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
              {!hideFrame && (title || description || actions) && (
                <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div className="min-w-0">
                    {title && (
                      <h1 className="text-[24px] xl:text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="text-[13px] xl:text-[14px] text-gray-500 leading-snug mt-1 max-w-2xl">
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
          </main>
        </div>
      </div>
    </div>
  );
}

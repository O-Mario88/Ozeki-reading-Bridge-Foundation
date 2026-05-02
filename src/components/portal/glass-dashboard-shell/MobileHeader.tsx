"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { Menu, BookOpenText, X, Bell } from "lucide-react";
import type { PortalUser } from "@/lib/types";
import { GlassExpandedMenu } from "./GlassExpandedMenu";
import { OzekiSidebar } from "@/components/portal/OzekiSidebar";

interface Props {
  user: PortalUser;
  activeHref: string;
  /** Right-side action — defaults to a notifications bell linking to /portal/support. */
  rightSlot?: ReactNode;
  /** Which sidebar to render inside the slide-over.
   *   "ozeki" (default) → green Ozeki sidebar — used by main portal pages.
   *   "glass"           → frosted glass menu — used by finance pages.
   */
  variant?: "ozeki" | "glass";
}

/**
 * Mobile-only top header (`<lg`). Hamburger opens a slide-over containing the
 * primary navigation. Variant selects whether the slide-over shows the green
 * Ozeki sidebar or the glassprism menu.
 *
 * Renders nothing on `lg+` — desktop layouts render their sidebar/menu
 * directly in the page grid.
 */
export function MobileHeader({
  user,
  activeHref,
  rightSlot,
  variant = "ozeki",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerCls =
    variant === "glass"
      ? "lg:hidden flex items-center justify-between gap-3 h-14 px-4 rounded-[24px] border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_14px_36px_rgba(10,10,10,0.08)]"
      : "lg:hidden flex items-center justify-between gap-3 h-14 px-4 rounded-2xl border border-gray-100 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]";

  const slideoverWrapperBg = variant === "glass" ? "bg-[#D8D9DE]" : "bg-[#0d4b3a]";

  return (
    <>
      <header className={headerCls}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid h-10 w-10 place-items-center rounded-full text-gray-800 hover:bg-gray-50"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <Link
          href="/portal/dashboard"
          aria-label="Ozeki Reading Bridge"
          className="grid h-10 w-10 place-items-center rounded-full text-emerald-700"
        >
          <BookOpenText className="h-5 w-5" strokeWidth={1.75} />
        </Link>

        {rightSlot ?? (
          <Link
            href="/portal/support"
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full text-gray-800 hover:bg-gray-50"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </Link>
        )}
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div
            className={`w-[88vw] max-w-[300px] h-full overflow-y-auto ${slideoverWrapperBg}`}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="m-3 ml-auto block grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {variant === "glass" ? (
              <div className="p-4">
                <GlassExpandedMenu user={user} activeHref={activeHref} />
              </div>
            ) : (
              <OzekiSidebar user={user} activeHref={activeHref} forceVisible />
            )}
          </div>
        </div>
      )}
    </>
  );
}

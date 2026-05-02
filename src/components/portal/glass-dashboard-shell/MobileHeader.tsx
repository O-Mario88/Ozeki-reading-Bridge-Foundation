"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { Menu, BookOpenText, X, Bell } from "lucide-react";
import type { PortalUser } from "@/lib/types";
import { OzekiSidebar } from "@/components/portal/OzekiSidebar";

interface Props {
  user: PortalUser;
  activeHref: string;
  /** Right-side action — defaults to a notifications bell linking to /portal/support. */
  rightSlot?: ReactNode;
  /** Notification count badge on the bell. 0 hides the badge. */
  notificationCount?: number;
}

/**
 * Mobile-only top header (`<lg`). Renders the deep-green Ozeki branded strip
 * matching the mobile reference: hamburger left, OZEKI book+wordmark
 * centered, notification bell with red badge right. Tapping the hamburger
 * opens a slide-over containing the OzekiSidebar.
 *
 * The container is full-bleed (no rounded edges) so the green strip
 * reaches both screen edges and meets the safe-area inset cleanly. Renders
 * nothing on `lg+`.
 */
export function MobileHeader({
  user,
  activeHref,
  rightSlot,
  notificationCount = 3,
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

  return (
    <>
      <header className="lg:hidden bg-[#0d4b3a] text-white pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-3 h-14 px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 -ml-2 place-items-center rounded-full text-white hover:bg-white/10 transition"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>

          <Link
            href="/portal/dashboard"
            aria-label="Ozeki Reading Bridge Foundation"
            className="flex items-center gap-2 min-w-0"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fef9c3] text-[#0d4b3a] shrink-0">
              <BookOpenText className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col leading-none min-w-0">
              <span className="text-[14px] font-extrabold tracking-tight text-white">OZEKI</span>
              <span className="text-[8.5px] font-bold tracking-[0.16em] text-white/75 mt-0.5 truncate">
                READING BRIDGE FOUNDATION
              </span>
            </span>
          </Link>

          {rightSlot ?? (
            <Link
              href="/portal/support"
              aria-label="Notifications"
              className="relative grid h-10 w-10 -mr-2 place-items-center rounded-full text-white hover:bg-white/10 transition"
            >
              <Bell className="h-5 w-5" strokeWidth={1.75} />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 grid place-items-center h-[18px] min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold border border-[#0d4b3a]">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          )}
        </div>
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
          <div className="w-[88vw] max-w-[300px] h-full overflow-y-auto bg-[#0d4b3a]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="m-3 ml-auto block grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <OzekiSidebar user={user} activeHref={activeHref} forceVisible />
          </div>
        </div>
      )}
    </>
  );
}

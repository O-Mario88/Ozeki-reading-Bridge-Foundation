"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { Menu, Sparkles, X, Bell } from "lucide-react";
import type { PortalUser } from "@/lib/types";
import { GlassExpandedMenu } from "./GlassExpandedMenu";

interface Props {
  user: PortalUser;
  activeHref: string;
  /** Right-side action — defaults to a notifications bell linking to /portal/support. */
  rightSlot?: ReactNode;
}

/**
 * Mobile-only top header (`<lg`). Hamburger opens a slide-over containing the
 * full GlassExpandedMenu. Centered Ozeki sparkle mark, optional right action.
 *
 * Renders nothing on `lg+` — desktop uses the icon rail + expanded menu.
 */
export function MobileHeader({ user, activeHref, rightSlot }: Props) {
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
      <header className="lg:hidden flex items-center justify-between gap-3 h-14 px-4 rounded-[24px] border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_14px_36px_rgba(10,10,10,0.08)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid h-10 w-10 place-items-center rounded-full text-[#111111] hover:bg-black/5"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <Link
          href="/portal/dashboard"
          aria-label="Ozeki Reading Bridge"
          className="grid h-10 w-10 place-items-center rounded-full text-[#111111]"
        >
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </Link>

        {rightSlot ?? (
          <Link
            href="/portal/support"
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full text-[#111111] hover:bg-black/5"
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
          <div className="w-[88vw] max-w-[420px] h-full overflow-y-auto p-4 bg-[#D8D9DE]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mb-3 ml-auto grid h-10 w-10 place-items-center rounded-full bg-white text-[#111111] shadow-[0_8px_18px_rgba(10,10,10,0.06)]"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <GlassExpandedMenu user={user} activeHref={activeHref} />
          </div>
        </div>
      )}
    </>
  );
}

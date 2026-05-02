"use client";

import { ReactNode, useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Mobile-only slide-over wrapper. On `lg+` it renders nothing — the
 * GlassExpandedMenu is shown directly in the layout grid. Below `lg`, this
 * displays a floating hamburger; tapping it opens a frosted overlay
 * containing the menu.
 */
export function GlassMobileNav({ children }: Props) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when open + close on Esc
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/70 bg-white/80 text-[#111111] shadow-[0_10px_30px_rgba(10,10,10,0.18)] backdrop-blur-xl"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div className="w-[88vw] max-w-[440px] h-full overflow-y-auto p-4 bg-[#D8D9DE]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mb-3 ml-auto grid h-10 w-10 place-items-center rounded-full bg-white/80 text-[#111111] shadow-[0_8px_18px_rgba(10,10,10,0.06)]"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

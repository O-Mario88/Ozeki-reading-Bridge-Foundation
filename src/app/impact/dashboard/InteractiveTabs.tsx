"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TEAL    = "#066a67";
const SURFACE = "#ffffff";
const BORDER  = "#e7ecf3";
const TEXT_MUTED = "#64748b";
const RADIUS    = "12px";
const RADIUS_SM = "8px";
const SHADOW_LOW = "0 1px 2px rgba(15, 23, 42, 0.04)";
const EASE = [0.22, 1, 0.36, 1] as const;

interface InteractiveTabsProps {
  tabs: string[];
  panels: ReactNode[];
}

/**
 * Interactive tab rail + animated content swap. Active tab uses brand
 * teal, inactive tabs are neutral. Panels cross-fade with a 200ms
 * cubic-bezier ease-out on switch.
 */
export function InteractiveTabs({ tabs, panels }: InteractiveTabsProps) {
  const [active, setActive] = useState(0);

  return (
    <>
      <nav
        className="inline-flex flex-wrap items-center gap-1 p-1.5 max-w-full overflow-x-auto"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: SHADOW_LOW }}
        role="tablist"
      >
        {tabs.map((label, i) => {
          const isActive = i === active;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className="h-8 px-3.5 text-[12px] font-semibold transition relative whitespace-nowrap"
              style={{
                background: isActive ? TEAL : "transparent",
                color: isActive ? "#fff" : TEXT_MUTED,
                borderRadius: RADIUS_SM,
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {panels[active] ?? null}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

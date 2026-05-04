"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Motion primitives for the public live impact dashboard.
 *
 * Subtle, performant, and consistent with Stripe / Linear / Notion
 * dashboard motion: 200–500ms cubic-bezier ease-out, small Y offset,
 * no bouncing or overshoot. Respects prefers-reduced-motion via
 * framer-motion's built-in MotionConfig (default).
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function DashboardMotionShell({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Card-style entry: fade + small lift. */
export function MotionCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Lightweight fade for non-card containers (hero, tabs, etc.). */
export function MotionFade({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

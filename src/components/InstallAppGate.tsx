"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { InstallAppButton } from "./InstallAppButton";

/**
 * InstallAppGate — gates the PWA install prompt on portal usage time.
 *
 * Per the install spec: the prompt must only surface for users who have
 * actually logged into the portal and used the data-entry features for
 * at least 10 minutes. Devices just browsing the public site never see
 * it. Devices that opened the portal but immediately walked away never
 * see it.
 *
 * Implementation:
 * - This component is mounted by OzekiPortalShell, which only renders on
 *   portal routes for authenticated users. So just being mounted means
 *   the user is signed in.
 * - We accumulate visible-and-active seconds in localStorage. "Active"
 *   means the tab is visible and there has been mouse / keyboard /
 *   touch / scroll input within the last 60 s — the same definition
 *   SessionHeartbeatClient uses for the idle timeout, so the two
 *   counters drift in sync.
 * - Every 5 s tick, if the activity check passes, we add 5 s to the
 *   accumulator. Once it crosses 600 s (10 min), the install button
 *   floats in from the bottom-right.
 * - Dismissal is sticky for 30 days so the banner doesn't nag.
 * - If the user already installed (display-mode standalone) we render
 *   nothing — the InstallAppButton itself short-circuits in that case.
 *
 * Renders nothing until eligible — no flicker on first paint.
 */

const ACCUM_KEY = "orbf:portalActiveSeconds";
const DISMISS_KEY = "orbf:installDismissedAt";
const THRESHOLD_SECONDS = 600;            // 10 minutes
const DISMISS_TTL_MS = 30 * 24 * 3600_000; // 30 days
const TICK_MS = 5_000;
const ACTIVITY_WINDOW_MS = 60_000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

function readNumber(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallAppGate() {
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed → nothing to gate.
    if (isStandalone()) return;

    // Honour a recent dismissal.
    const dismissedAt = readNumber(DISMISS_KEY);
    if (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS) {
      setDismissed(true);
      return;
    }

    // Eligibility check on mount in case threshold was already crossed.
    const startSeconds = readNumber(ACCUM_KEY);
    if (startSeconds >= THRESHOLD_SECONDS) {
      setEligible(true);
    }

    let lastActivity = Date.now();
    const stamp = () => { lastActivity = Date.now(); };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, stamp, { passive: true });
    }

    const tick = window.setInterval(() => {
      // Only count time when the user is actually present.
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity > ACTIVITY_WINDOW_MS) return;

      const next = readNumber(ACCUM_KEY) + TICK_MS / 1000;
      window.localStorage.setItem(ACCUM_KEY, String(next));
      if (next >= THRESHOLD_SECONDS) {
        setEligible(true);
      }
    }, TICK_MS);

    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, stamp);
      window.clearInterval(tick);
    };
  }, []);

  if (!eligible || dismissed) return null;

  const onDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Ozeki Reading Bridge Foundation app"
      style={{
        position: "fixed",
        right: 16,
        bottom: 88, // sits above the mobile bottom nav (~64px) with breathing room
        zIndex: 60,
        maxWidth: 320,
        background: "#FFFFFF",
        border: "1px solid #E5EAF0",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 12px 28px rgba(16, 24, 40, 0.12)",
        fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss install prompt"
        style={{
          position: "absolute", top: 6, right: 6,
          background: "transparent", border: 0, color: "#667085", cursor: "pointer", padding: 4,
        }}
      >
        <X size={14} />
      </button>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
        Install the Ozeki RBF app
      </div>
      <div style={{ fontSize: 11.5, color: "#475467", marginBottom: 10, lineHeight: 1.4 }}>
        You&rsquo;ve been working in the portal — install it on your phone for faster, offline-friendly data entry.
      </div>
      <InstallAppButton compact />
    </div>
  );
}

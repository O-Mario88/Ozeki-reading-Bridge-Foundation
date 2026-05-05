"use client";

import { useEffect, useRef } from "react";

/**
 * SessionHeartbeatClient — keeps the portal session alive while the user
 * is actually using the browser, so reading or filling out a long form
 * no longer hits the 20-minute idle timeout.
 *
 * Approach: listen passively for any of mousedown / keydown / touchstart /
 * scroll / focus / visibilitychange. Any one of these stamps a `lastActivity`
 * ref. On a fixed interval (every PING_INTERVAL_MS) we look at the ref:
 * if there has been activity within the last PING_WINDOW_MS, fire a POST
 * to /api/portal/auth/heartbeat. If the user is genuinely idle (no
 * interaction in the window) we skip the ping and let the server-side
 * idle timer count down — that is the case where logout is appropriate.
 *
 * The ping itself is fire-and-forget; a 401 means the session already
 * expired (e.g. the user was idle past 20 minutes) and the next
 * navigation will redirect to /portal/login as normal.
 *
 * Mounted once by the OzekiPortalShell so every authenticated portal
 * page picks it up automatically. Renders nothing.
 */

// Fire a ping at most once every 60 s. Cheap on the server (one indexed
// UPDATE) and high-frequency enough that a brief pause doesn't lose the
// window.
const PING_INTERVAL_MS = 60_000;

// Treat the user as "active" if they've interacted within the last 90 s.
// Slightly larger than the ping interval so a single-click between pings
// still keeps the session alive even if the click landed near the end of
// the previous interval.
const PING_WINDOW_MS = 90_000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "focus",
];

export function SessionHeartbeatClient() {
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const stamp = () => {
      lastActivityRef.current = Date.now();
    };

    // Passive listeners on window — minimal overhead and no preventDefault
    // surprises on touch / scroll handlers.
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, stamp, { passive: true });
    }

    // Visibility flip back to "visible" also counts as activity — a user
    // returning from another tab usually means they're about to interact.
    const onVisibility = () => {
      if (document.visibilityState === "visible") stamp();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let aborter: AbortController | null = null;
    const ping = async () => {
      // Skip while the tab is hidden. No point keeping the session alive
      // for a tab the user isn't looking at — the idle timeout should win
      // there.
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current > PING_WINDOW_MS) return;

      aborter?.abort();
      aborter = new AbortController();
      try {
        await fetch("/api/portal/auth/heartbeat", {
          method: "POST",
          credentials: "same-origin",
          signal: aborter.signal,
          // Headers omitted on purpose — the cookie is the auth and there
          // is no body. Keeps the request as cheap as possible.
        });
      } catch {
        // Network blip / abort — next interval will retry. Nothing to do.
      }
    };

    const interval = window.setInterval(ping, PING_INTERVAL_MS);

    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, stamp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
      aborter?.abort();
    };
  }, []);

  return null;
}

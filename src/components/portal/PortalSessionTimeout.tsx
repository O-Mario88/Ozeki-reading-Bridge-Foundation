"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function PortalSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(Date.now());

  // Don't run the timeout logic on login or change-password pages
  const isAuthPage =
    pathname === "/portal/login" || pathname === "/portal/change-password";

  useEffect(() => {
    if (isAuthPage) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });

    const interval = setInterval(async () => {
      const now = Date.now();

      // If inactive for 30 minutes, log out
      if (now - lastActivityRef.current >= TIMEOUT_MS) {
        clearInterval(interval);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Ignore network errors, proceed to redirect
        }
        router.push("/portal/login?reason=timeout");
        return;
      }

      // If active, but it's been 5 minutes since our last ping, ping the server
      if (now - lastPingRef.current >= PING_INTERVAL_MS) {
        lastPingRef.current = now;
        try {
          const res = await fetch("/api/auth/ping");
          // If the server says we're no longer authenticated, redirect to login
          if (res.status === 401) {
            clearInterval(interval);
            router.push("/portal/login?reason=expired");
            return;
          }
        } catch {
          // Network error — don't redirect, just skip this ping cycle
        }
      }
    }, 10_000); // check every 10 seconds

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("click", handleActivity);
      clearInterval(interval);
    };
  }, [router, isAuthPage]);

  return null;
}

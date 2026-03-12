"use client";

import { useEffect } from "react";
import { startOfflineFormQueueSync } from "@/lib/offline-form-queue";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    startOfflineFormQueueSync();
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        }

        // Refresh once after cleanup so stale worker-controlled pages release old chunks.
        const reloadMarker = "__orbf_sw_dev_cleanup_done__";
        if (navigator.serviceWorker.controller && !window.sessionStorage.getItem(reloadMarker)) {
          window.sessionStorage.setItem(reloadMarker, "1");
          window.location.reload();
        }
      })().catch(() => {
        // Best-effort cleanup only.
      });
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Best-effort registration only.
      }
    };

    void register();
  }, []);

  return null;
}

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

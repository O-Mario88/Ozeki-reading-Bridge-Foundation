"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="w-full bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-[100] sticky top-0 shadow-md transition-all">
      <WifiOff className="w-4 h-4" />
      <span>
        You are currently offline. Operating in limited cached mode.
      </span>
    </div>
  );
}

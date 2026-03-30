"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { SiteHeader } from "../SiteHeader";
import { SiteFooter } from "../SiteFooter";
import { MobileBottomNav } from "../MobileBottomNav";

export function LayoutOrchestrator({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isPortalLogin = pathname === "/portal/login";

  /* Full-screen immersive login — no header / footer */
  if (isPortalLogin) {
    return <>{children}</>;
  }

  const isPortal = pathname.startsWith("/portal");

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-white">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}


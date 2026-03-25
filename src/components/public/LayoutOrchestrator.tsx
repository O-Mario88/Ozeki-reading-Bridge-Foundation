"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { SiteHeader } from "../SiteHeader";
import { SiteFooter } from "../SiteFooter";

export function LayoutOrchestrator({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isPortal = pathname.startsWith("/portal");

  if (isPortal) {
    return (
      <>
        <SiteHeader />
        <main className="dashboard-inspired-main min-h-[calc(100vh-var(--header-height))]">
          {children}
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-white">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

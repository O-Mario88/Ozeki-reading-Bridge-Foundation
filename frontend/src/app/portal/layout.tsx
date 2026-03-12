"use client";

import { usePathname } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/portal/login") {
    return <>{children}</>;
  }
  return <PortalShell>{children}</PortalShell>;
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";

import { clearTokens, getAccessToken } from "@/lib/auth";

const links = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/schools", label: "Schools" },
  { href: "/portal/trainings", label: "Trainings" },
  { href: "/portal/visits", label: "Visits" },
  { href: "/portal/assessments", label: "Assessments" },
  { href: "/portal/finance", label: "Finance" },
  { href: "/portal/reports", label: "Reports" },
];

export function PortalShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/portal/login");
      return;
    }
    setReady(true);
  }, [router]);

  const isActive = useMemo(() => (href: string) => pathname === href, [pathname]);

  if (!ready) {
    return <div className="container">Checking session...</div>;
  }

  return (
    <div className="container portal-shell">
      <aside className="portal-nav">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Staff Workspace</div>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={isActive(link.href) ? { background: "rgba(255,255,255,0.22)" } : undefined}
          >
            {link.label}
          </Link>
        ))}
        <button
          className="button warn"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => {
            clearTokens();
            router.replace("/portal/login");
          }}
        >
          Logout
        </button>
      </aside>
      <section className="stack">{children}</section>
    </div>
  );
}

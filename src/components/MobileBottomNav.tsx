"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  BookOpen,
  BarChart3,
  Heart,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { navItems, utilityLinks } from "./SiteHeader";

/* ------------------------------------------------------------------ */
/*  Bottom Tab Definitions (4 tabs — "More" is in the header)         */
/* ------------------------------------------------------------------ */

const bottomTabs = [
  { key: "home", label: "Home", href: "/", icon: Home, match: (p: string) => p === "/" },
  {
    key: "programs",
    label: "Programs",
    href: "/programs",
    icon: BookOpen,
    match: (p: string) =>
      p === "/programs" ||
      p.startsWith("/phonics") ||
      p.startsWith("/teacher-") ||
      p.startsWith("/in-school") ||
      p.startsWith("/learner-") ||
      p.startsWith("/remedial") ||
      p.startsWith("/reading-materials") ||
      p.startsWith("/story-project") ||
      p.startsWith("/teaching-aids") ||
      p.startsWith("/school-systems") ||
      p.startsWith("/instructional-leadership") ||
      p.startsWith("/monitoring-evaluation") ||
      p.startsWith("/literacy-content"),
  },
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/impact/dashboard",
    icon: BarChart3,
    match: (p: string) => p === "/impact/dashboard",
  },
  {
    key: "impact",
    label: "Impact",
    href: "/impact/case-studies",
    icon: Heart,
    match: (p: string) =>
      (p.startsWith("/impact") && p !== "/impact/dashboard") ||
      p.startsWith("/stories") ||
      p.startsWith("/gallery") ||
      p.startsWith("/resources") ||
      p.startsWith("/testimonials") ||
      p.startsWith("/media"),
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MobileBottomNav() {
  const pathname = usePathname() || "";
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Don't render on portal pages
  if (pathname.startsWith("/portal")) return null;

  return (
    <>
      {/* ---- Header "More" Button (replaces hamburger) ---- */}
      <button
        type="button"
        className={`mobile-header-more ${drawerOpen ? "mobile-header-more--active" : ""}`}
        onClick={() => setDrawerOpen((v) => !v)}
        aria-expanded={drawerOpen}
        aria-controls="mobile-more-drawer"
        aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
      >
        <span className={`mobile-header-more__bar ${drawerOpen ? "mobile-header-more__bar--active" : ""}`} />
      </button>

      {/* ---- Bottom Tab Bar (4 tabs) ---- */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {bottomTabs.map((tab) => {
          const isActive = tab.match(pathname);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`mobile-bottom-nav__item ${isActive ? "mobile-bottom-nav__item--active" : ""}`}
            >
              <span className="mobile-bottom-nav__icon">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span className="mobile-bottom-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ---- "More" Drawer ---- */}
      <div
        id="mobile-more-drawer"
        className={`mobile-drawer ${drawerOpen ? "mobile-drawer--open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <div
          className="mobile-drawer__backdrop"
          onClick={() => setDrawerOpen(false)}
        />

        {/* Sheet */}
        <div className="mobile-drawer__sheet">
          {/* Handle */}
          <div className="mobile-drawer__handle-bar">
            <span className="mobile-drawer__handle" />
          </div>

          {/* Content */}
          <div className="mobile-drawer__content">
            {/* Direct Links */}
            <div className="mobile-drawer__section">
              <p className="mobile-drawer__section-label">Navigate</p>
              {navItems.map((item, idx) => {
                if (item.type === "link") {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={`drawer-link-${idx}`}
                      href={item.href}
                      className={`mobile-drawer__link ${isActive ? "mobile-drawer__link--active" : ""}`}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <span>{item.label}</span>
                      <ChevronRight size={16} className="mobile-drawer__chevron" />
                    </Link>
                  );
                }

                const group = item.group;
                const isGroupActive = pathname === group.href || group.links.some((l) => pathname === l.href);
                return (
                  <DrawerGroup
                    key={`drawer-group-${item.key}`}
                    title={group.title}
                    href={group.href}
                    links={group.links}
                    isActive={isGroupActive}
                    pathname={pathname}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                );
              })}
            </div>

            {/* Utility */}
            <div className="mobile-drawer__section">
              <p className="mobile-drawer__section-label">Quick Links</p>
              {utilityLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mobile-drawer__link"
                  onClick={() => setDrawerOpen(false)}
                >
                  <span>{link.label}</span>
                  <ExternalLink size={14} className="mobile-drawer__chevron" />
                </Link>
              ))}
              <Link
                href="/partner-with-us"
                className="mobile-drawer__donate-button"
                onClick={() => setDrawerOpen(false)}
              >
                Donate
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Drawer Expandable Group                                           */
/* ------------------------------------------------------------------ */

function DrawerGroup({
  title,
  href,
  links,
  isActive,
  pathname,
  onNavigate,
}: {
  title: string;
  href: string;
  links: Array<{ href: string; label: string }>;
  isActive: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mobile-drawer__group">
      <div className="mobile-drawer__group-header">
        <Link
          href={href}
          className={`mobile-drawer__link mobile-drawer__group-title ${isActive ? "mobile-drawer__link--active" : ""}`}
          onClick={onNavigate}
        >
          <span>{title}</span>
        </Link>
        <button
          type="button"
          className={`mobile-drawer__expand-btn ${expanded ? "mobile-drawer__expand-btn--open" : ""}`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`Expand ${title} links`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={`mobile-drawer__group-links ${expanded ? "mobile-drawer__group-links--open" : ""}`}>
        {links.map((link) => {
          const isLinkActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-drawer__sublink ${isLinkActive ? "mobile-drawer__sublink--active" : ""}`}
              onClick={onNavigate}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

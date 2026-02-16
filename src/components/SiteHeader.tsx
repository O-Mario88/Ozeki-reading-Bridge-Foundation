"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const utilityLinks = [
  { href: "/events", label: "Events" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
  { href: "/portal/login", label: "Staff Portal" },
];

const navGroups = [
  {
    title: "What We Do",
    description: "Training, coaching, and literacy implementation programs.",
    links: [
      { href: "/programs", label: "Programs & Services" },
      { href: "/phonics-training", label: "Phonics Training" },
      { href: "/story-project", label: "1001 Story Project" },
      { href: "/impact", label: "Impact" },
      { href: "/book-visit", label: "Book a Visit" },
    ],
  },
  {
    title: "Resources & Learning",
    description: "Classroom tools, insights, and practical literacy guidance.",
    links: [
      { href: "/resources", label: "Resource Library" },
      { href: "/blog", label: "Blog" },
      { href: "/diagnostic-quiz", label: "Diagnostic Quiz" },
      { href: "/events", label: "Events & Webinars" },
      { href: "/academy", label: "Ozeki Literacy Academy" },
    ],
  },
  {
    title: "Partner & Support",
    description: "Schools, donors, and partners that help scale literacy impact.",
    links: [
      { href: "/partner-with-us", label: "Partner With Us" },
      { href: "/for-schools", label: "For Schools" },
      { href: "/for-teachers", label: "For Teachers" },
      { href: "/case-studies", label: "Case Studies" },
      { href: "/testimonials", label: "Testimonials" },
      { href: "/partners", label: "Partners" },
    ],
  },
  {
    title: "About",
    description: "Who we are, how we work, and where to connect.",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/transparency", label: "Transparency" },
      { href: "/media", label: "Media & Press" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <p>Ozeki Reading Bridge Foundation</p>
          <div className="utility-actions">
            <ul className="utility-links">
              {utilityLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
            <Link href="/partner-with-us" className="button button-ghost utility-donate">
              Donate
            </Link>
          </div>
        </div>
      </div>

      <div className="container header-inner">
        <div className="main-nav-row">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ORB
            </span>
            <span>
              <strong>Ozeki Reading Bridge Foundation</strong>
              <small>Practical literacy systems for schools</small>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary">
            <ul className="mega-nav">
              {navGroups.map((group) => (
                <li key={group.title} className="mega-item">
                  <details>
                    <summary className="mega-trigger">{group.title}</summary>
                    <div className="mega-panel">
                      <p>{group.description}</p>
                      <ul>
                        {group.links.map((link) => (
                          <li key={link.href}>
                            <Link href={link.href}>{link.label}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-tools">
            <Link href="/resources" className="search-chip">
              Search
            </Link>
            <Link href="/book-visit" className="button header-cta desktop-cta">
              Book a Visit
            </Link>
            <button
              type="button"
              className="mobile-menu-button"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </div>

      <div className={`mobile-nav-panel ${menuOpen ? "open" : ""}`} id="mobile-navigation">
        <div className="container mobile-nav-inner">
          <div className="mobile-cta-row">
            <Link href="/book-visit" className="button header-cta">
              Book a Visit
            </Link>
            <Link href="/partner-with-us" className="button button-ghost header-cta">
              Donate
            </Link>
          </div>

          {navGroups.map((group) => (
            <details key={group.title} className="mobile-group" open>
              <summary>{group.title}</summary>
              <ul className="mobile-nav-list">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </header>
  );
}

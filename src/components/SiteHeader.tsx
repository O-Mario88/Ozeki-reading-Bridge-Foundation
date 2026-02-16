"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import siteLogo from "../../assets/photos/logo.png";

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

type NavGroup = {
  title: string;
  href: string;
  description: string;
  links: Array<{ href: string; label: string }>;
};

type NavItem =
  | {
    type: "link";
    label: string;
    href: string;
  }
  | {
    type: "group";
    key: string;
    group: NavGroup;
  };

const utilityLinks = [

  { href: "/portal/login", label: "Staff Portal" },
];

const programsGroup: NavGroup = {
  title: "Programs",
  href: "/programs",
  description: "Teacher training, coaching, assessments, and literacy implementation services.",
  links: [
    { href: "/phonics-training", label: "Signature Program: Phonics Training & School Support" },
    { href: "/teacher-professional-development", label: "Teacher Professional Development" },
    { href: "/in-school-coaching-mentorship", label: "In-School Coaching & Mentorship" },
    {
      href: "/learner-reading-assessments-progress-tracking",
      label: "Learner Assessments & Progress Tracking",
    },
    {
      href: "/remedial-catch-up-reading-interventions",
      label: "Remedial & Catch-Up Reading Interventions",
    },
    { href: "/reading-materials-development", label: "Reading Materials Development (Learners)" },
    { href: "/story-project", label: "1001 Story Project" },
    {
      href: "/teaching-aids-instructional-resources-teachers",
      label: "Teaching Aids & Instructional Resources",
    },
    { href: "/school-systems-routines", label: "School Systems & Routines" },
    { href: "/instructional-leadership-support", label: "Instructional Leadership Support" },
    { href: "/monitoring-evaluation-reporting", label: "Monitoring, Evaluation & Reporting" },
    {
      href: "/literacy-content-creation-advocacy",
      label: "Literacy Content Creation & Advocacy",
    },
  ],
};

const resourcesGroup: NavGroup = {
  title: "Resources",
  href: "/resources",
  description: "Practical downloads, webinars, and knowledge content for literacy implementation.",
  links: [
    { href: "/resources", label: "Resource Library" },

    { href: "/events", label: "Events & Webinars" },
    { href: "/media", label: "Media & Press" },
  ],
};

const impactGroup: NavGroup = {
  title: "Impact",
  href: "/impact",
  description: "Public impact evidence, dashboards, reports, case studies, and methodology.",
  links: [
    { href: "/impact", label: "Impact Hub" },
    { href: "/impact/dashboard", label: "Live Dashboard" },
    { href: "/impact/reports", label: "Reports Library" },
    { href: "/impact/case-studies", label: "Case Studies" },
    { href: "/impact/gallery", label: "Evidence Gallery" },
  ],
};

const aboutGroup: NavGroup = {
  title: "About",
  href: "/about",
  description: "Who we are, how we govern, and how we protect children, data, and funds.",
  links: [
    { href: "/about", label: "Who We Are" },
    { href: "/problem", label: "The Problem: Why Reading?" },
    { href: "/transparency", label: "Trust & Accountability" },
  ],
};

const navItems: NavItem[] = [
  { type: "link", label: "Home", href: "/" },
  { type: "group", key: "programs", group: programsGroup },
  { type: "group", key: "resources", group: resourcesGroup },
  { type: "group", key: "impact", group: impactGroup },
  { type: "link", label: "Partner With Us", href: "/partner" },
  { type: "group", key: "about", group: aboutGroup },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDesktopMenu, setActiveDesktopMenu] = useState<string | null>(null);
  const [activeMobileMenu, setActiveMobileMenu] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setActiveDesktopMenu(null);
    setActiveMobileMenu(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`header ${isHome ? "header__home" : "header__page"} ${isScrolled ? "sticky" : ""}`}
    >
      <div className={`container navigation-contain ${menuOpen ? "active" : ""}`}>
        <Link href="/" className="header__logo-link" aria-label="Ozeki Reading Bridge Foundation home">
          <span className="header__logo-mark">
            <Image
              src={siteLogo}
              alt="Ozeki Reading Bridge Foundation logo"
              width={54}
              height={54}
              className="header__logo-image"
            />
          </span>
          <span className="header__logo-text">
            <strong>Ozeki Reading Bridge Foundation</strong>
            <small>Practical Phonics. Strong Teachers. Confident Readers.</small>
          </span>
        </Link>

        <nav aria-label="Primary">
          <div className="header__bottom">
            <ul className="header__navigation">
              {navItems.map((item, index) => {
                if (item.type === "link") {
                  return (
                    <li key={`${item.label}-${index + 1}`} className="header__nav-item">
                      <Link className="header__menu-link" href={item.href}>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                }

                const group = item.group;
                const linkColumns = chunkArray(group.links, 4);
                const submenuId = `submenu-${item.key}`;
                const isOpen = activeDesktopMenu === group.title;
                return (
                  <li
                    key={item.key}
                    className="header__nav-item"
                    onMouseEnter={() => setActiveDesktopMenu(group.title)}
                    onMouseLeave={() =>
                      setActiveDesktopMenu((current) =>
                        current === group.title ? null : current,
                      )
                    }
                    onFocus={() => setActiveDesktopMenu(group.title)}
                    onBlur={(event) => {
                      const relatedTarget = event.relatedTarget as Node | null;
                      if (!event.currentTarget.contains(relatedTarget)) {
                        setActiveDesktopMenu((current) =>
                          current === group.title ? null : current,
                        );
                      }
                    }}
                  >
                    <Link className="header__menu-link" href={group.href}>
                      <span>{group.title}</span>
                    </Link>
                    <button
                      type="button"
                      className="header__dropdown-arrow"
                      aria-expanded={isOpen}
                      aria-controls={submenuId}
                      onClick={() =>
                        setActiveDesktopMenu((current) =>
                          current === group.title ? null : group.title,
                        )
                      }
                    >
                      <span>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 4.2666L5 8.2666L1 4.2666" strokeWidth="1.57" />
                        </svg>
                        <span className="visually-hidden">Toggle {group.title} menu</span>
                      </span>
                    </button>

                    <div className={`header__navigation--children ${isOpen ? "open" : ""}`} id={submenuId}>
                      <div className="header__dropdown-container">
                        <div className="header__featured-text">
                          <h3>{group.title}</h3>
                          <p>{group.description}</p>
                          <Link className="emphasized-link" href={group.href}>
                            Explore {group.title}
                          </Link>
                        </div>

                        <div className="header__navigation-wrap">
                          {linkColumns.map((column, columnIndex) => (
                            <div className="header__navigation-wrap-column" key={`${group.title}-${columnIndex + 1}`}>
                              <p className="header__navigation-wrap-column-title">
                                {columnIndex === 0 ? "Priority Links" : "More"}
                              </p>
                              <ul>
                                {column.map((link) => (
                                  <li className="header__navigation-wrap-item" key={link.href}>
                                    <Link href={link.href}><span>{link.label}</span></Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul >

            <div className="header__sticky-actions">
              <Link className="button header__sticky-button" href="/donate">
                Donate
              </Link>
            </div>
          </div >

          <button
            type="button"
            className={`header__hamburger ${menuOpen ? "header__hamburger--active" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="header__hamburger-menu" />
            <span className="visually-hidden">{menuOpen ? "Close navigation" : "Open navigation"}</span>
          </button>
        </nav >
      </div >

      <div className={`header__mobile ${menuOpen ? "header__mobile--active" : ""}`} id="mobile-navigation">
        <div className="container">
          <ul className="header__navigation header__navigation--mobile">
            {navItems.map((item, index) => {
              if (item.type === "link") {
                return (
                  <li key={`mobile-${item.label}-${index + 1}`} className="header__nav-item header__nav-item--mobile">
                    <Link className="header__mobile-direct-link" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                );
              }

              const group = item.group;
              const isOpen = activeMobileMenu === group.title;
              return (
                <li key={`mobile-${item.key}`} className={`header__nav-item header__nav-item--mobile ${isOpen ? "active" : ""}`}>
                  <button
                    type="button"
                    className="header__mobile-trigger"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setActiveMobileMenu((current) =>
                        current === group.title ? null : group.title,
                      )
                    }
                  >
                    <span>{group.title}</span>
                    <i className="icon icon--plus" aria-hidden />
                  </button>

                  <div className={`header__navigation--children-m ${isOpen ? "header__navigation--children-m--active" : ""}`}>
                    <div className="header__dropdown-container">
                      <div className="header__featured-text">
                        <p>{group.description}</p>
                        <Link className="emphasized-link" href={group.href}>
                          Explore {group.title}
                        </Link>
                      </div>

                      <div className="header__navigation-wrap-column">
                        <p className="header__navigation-wrap-column-title">Links</p>
                        <ul>
                          {group.links.map((link) => (
                            <li className="header__navigation--children-m-item" key={link.href}>
                              <Link href={link.href}>{link.label}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="header__mobile-actions">
            <Link href="/donate" className="button">
              <span>Donate</span>
            </Link>
          </div>

          <div className="header__mobile-links">
            {utilityLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header >
  );
}

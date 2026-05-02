import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import {
  glassNavItems,
  filterNavForUser,
  getSectionMeta,
  findActiveSection,
  type GlassNavSection,
} from "./nav-config";
import type { PortalUser } from "@/lib/types";

interface Props {
  user: PortalUser;
  activeHref: string;
}

const sectionOrder: GlassNavSection[] = ["menu", "features", "cms", "system"];

/**
 * Slim vertical rail that mirrors the glassprism reference. Each top-level
 * section gets a single icon (the first item in that section the user has
 * access to). The active section's icon sits inside a white circular pill.
 *
 * Hidden below `lg` — on small screens the expanded menu is the primary nav.
 */
export function GlassIconRail({ user, activeHref }: Props) {
  const allowed = filterNavForUser(glassNavItems, user);
  const activeSection = findActiveSection(activeHref);

  // For each section, pick the first allowed item — its icon represents the
  // section in the rail; clicking jumps to that landing page.
  const sectionAnchors = sectionOrder
    .map((section) => {
      const first = allowed.find((i) => i.section === section);
      return first ? { section, item: first } : null;
    })
    .filter((x): x is { section: GlassNavSection; item: typeof allowed[number] } => x !== null);

  return (
    <aside
      aria-label="Section rail"
      className="hidden lg:flex flex-col items-center gap-4 rounded-[44px] border border-white/60 bg-white/40 px-3 py-6 backdrop-blur-2xl shadow-[0_24px_70px_rgba(10,10,10,0.10)]"
    >
      {/* Brand mark */}
      <Link
        href="/portal/dashboard"
        className="grid h-12 w-12 place-items-center rounded-2xl text-[#111111]"
        aria-label="Ozeki Reading Bridge"
      >
        <Sparkles className="h-6 w-6" strokeWidth={1.75} />
      </Link>

      <span className="h-px w-8 bg-[#14141414]" aria-hidden />

      {/* Section icons */}
      <nav className="flex flex-col items-center gap-2.5">
        {sectionAnchors.map(({ section, item }) => {
          const meta = getSectionMeta(section);
          const SectionIcon = meta.icon;
          const isActive = section === activeSection;
          return (
            <Link
              key={section}
              href={item.href}
              prefetch={false}
              aria-label={meta.label}
              title={meta.label}
              className={
                isActive
                  ? "grid h-12 w-12 place-items-center rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_34px_rgba(10,10,10,0.10)]"
                  : "grid h-12 w-12 place-items-center rounded-full text-[#202124] hover:bg-white/55 transition"
              }
            >
              <SectionIcon
                className={isActive ? "h-5 w-5 text-[#111111]" : "h-5 w-5 text-[#202124]"}
                strokeWidth={1.75}
              />
            </Link>
          );
        })}
      </nav>

      {/* Vertical guide line */}
      <span className="my-1 h-16 w-px bg-[#14141420]" aria-hidden />

      {/* Spacer */}
      <div className="flex-1" aria-hidden />

      {/* Visit public site */}
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="grid h-12 w-12 place-items-center rounded-full border border-white/70 bg-white/70 text-[#111111] shadow-[0_8px_18px_rgba(10,10,10,0.06)] hover:bg-white transition"
        title="Visit public site"
        aria-label="Visit public site"
      >
        <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
      </Link>
    </aside>
  );
}

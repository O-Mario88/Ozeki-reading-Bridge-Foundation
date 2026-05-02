/**
 * Card-first list primitives for the dashboard pages.
 *
 * Replaces traditional `<table>` markup with CSS-grid row-cards that
 * preserve column alignment but render as a stack of compact div rows.
 * Every dashboard "list" section (Intervention Plans, Recent Visits,
 * Top Performing Schools, Plan Actions, Curation Queue, etc.) is meant
 * to compose these primitives instead of writing its own table.
 *
 * Density baseline:
 *   - Calibri, 10-11px body, 9-10px header, 700/400 weights
 *   - Row height ~30-36px with light dividers
 *   - Status pills 18-22px, progress bars 6px
 *   - Avatars 22-24px
 *
 * Compatible with the global table-normalization CSS in
 * portal-dashboard.css — those rules target `table` elements only,
 * so the grid-based rows here are unaffected and rely on these
 * components' own Tailwind classes for typography.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Star } from "lucide-react";

/* ── DashboardListCard ─────────────────────────────────────────────
   Outer card container for every list section. Title on the left
   (with optional icon prefix), "View all" link on the right, body
   below. Padding compact, border subtle, shadow light. */

export function DashboardListCard({
  title, subtitle, icon, viewAll, children, className = "", padded = true,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  viewAll?: { href: string; label?: string };
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-xl bg-white border border-[#e5eaf0] ${padded ? "p-3" : ""} ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      <div className={`${padded ? "" : "px-3 py-2.5 border-b border-[#e8edf3]"} flex items-start justify-between gap-2 ${padded ? "mb-2" : ""}`}>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-[#111827] inline-flex items-center gap-1.5">
            {icon}{title}
          </h3>
          {subtitle && <p className="text-[11px] text-[#7a8ca3] mt-0.5">{subtitle}</p>}
        </div>
        {viewAll && <ViewAllLink href={viewAll.href} label={viewAll.label} />}
      </div>
      {children}
    </section>
  );
}

/* ── DashboardListGrid + Header + Row ──────────────────────────────
   CSS-grid based replacement for `<table>`. The `template` prop is a
   raw `grid-template-columns` string so callers can express column
   widths (e.g. "60px 1fr 80px 100px 90px 110px 90px 70px 90px").
   Dividers between rows; header has bold uppercase labels in muted
   colour. */

export function DashboardListGrid({
  template, children, className = "",
}: {
  template: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-[11px] ${className}`} role="list">
      <div data-grid-template={template}>{children}</div>
      {/* Inline grid template via style on the children — see DashboardListHeader / Row */}
    </div>
  );
}

/* Note: we set the grid-template-columns inline on each row instead of
   a wrapper to keep DashboardListHeader/DashboardListRow self-contained
   and reusable outside of a Grid container if needed. */

export function DashboardListHeader({
  template, children, className = "",
}: {
  template: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid items-center text-[10px] font-bold uppercase tracking-[0.04em] text-[#7a8ca3] border-b border-[#e8edf3] py-1.5 px-1 gap-3 ${className}`}
      style={{ gridTemplateColumns: template }}
      role="row"
    >
      {children}
    </div>
  );
}

export function DashboardListRow({
  template, children, className = "", href,
}: {
  template: string;
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const baseCls = `grid items-center text-[11px] font-semibold text-[#344054] border-b border-[#eef2f6] last:border-b-0 py-1.5 px-1 gap-3 ${className}`;
  const inner = (
    <div className={baseCls} style={{ gridTemplateColumns: template }} role="row">
      {children}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:bg-gray-50/40 -mx-1 px-1">
        {inner}
      </Link>
    );
  }
  return inner;
}

/* ── ViewAllLink ───────────────────────────────────────────────────
   Standard emerald right-aligned link with arrow. Used in card
   headers and footers. */

export function ViewAllLink({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="text-[11.5px] font-bold text-[#006B5B] hover:text-[#003F37] inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
    >
      {label} <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
    </Link>
  );
}

/* ── DashboardListFooter ───────────────────────────────────────────
   Compact footer with optional "Showing X to Y of Z" on the left and
   "View all →" on the right. */

export function DashboardListFooter({
  showing, viewAll, className = "",
}: {
  showing?: { from: number; to: number; total: number; label?: string };
  viewAll?: { href: string; label?: string };
  className?: string;
}) {
  if (!showing && !viewAll) return null;
  return (
    <div className={`mt-2 pt-2 border-t border-[#eef2f6] flex items-center justify-between text-[11px] ${className}`}>
      {showing
        ? <span className="text-[#7a8ca3]">Showing {showing.from} to {showing.to} of {showing.total} {showing.label ?? "items"}</span>
        : <span />}
      {viewAll && <ViewAllLink href={viewAll.href} label={viewAll.label} />}
    </div>
  );
}

/* ── StatusPill ────────────────────────────────────────────────────
   Standardized pill with the contract's colour palette. Tone string
   is data-driven so per-row status can pick a tone. */

export type PillTone = "green" | "blue" | "orange" | "red" | "purple" | "gray";
const pillToneMap: Record<PillTone, { bg: string; text: string; border: string }> = {
  green:  { bg: "#EAF7F1", text: "#087A55", border: "#CDEBDF" },
  blue:   { bg: "#EAF3FF", text: "#2563EB", border: "#D5E6FF" },
  orange: { bg: "#FFF4E8", text: "#D97706", border: "#FFE0B8" },
  red:    { bg: "#FDECEC", text: "#DC2626", border: "#FACACA" },
  purple: { bg: "#F4EEFF", text: "#7C3AED", border: "#E5D7FF" },
  gray:   { bg: "#F1F5F9", text: "#475467", border: "#E2E8F0" },
};

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const t = pillToneMap[tone];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-2 py-1 border whitespace-nowrap"
      style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
    >
      {children}
    </span>
  );
}

/* Map common status strings to a tone so callers don't have to hand-wire
   each one. Unknown statuses default to gray. */
export function pillToneFor(status: string): PillTone {
  const s = status.toLowerCase();
  if (["completed", "approved", "verified", "confirmed", "active", "highly engaged", "excellent"].includes(s)) return "green";
  if (["in progress", "in review", "scheduled", "upcoming", "engaged", "warm", "very good"].includes(s)) return "blue";
  if (["pending", "due soon", "needs follow-up", "improving", "good"].includes(s)) return "orange";
  if (["overdue", "at risk", "rejected", "failed", "cancelled"].includes(s)) return "red";
  if (["draft"].includes(s)) return "purple";
  return "gray";
}

/* ── RiskDot ───────────────────────────────────────────────────────
   Coloured dot + label, used in plan/action rows where a tiny risk
   indicator is more compact than a full pill. */

export function RiskDot({ risk }: { risk: "Low" | "Medium" | "High" | string }) {
  const color = risk === "High" ? "#DC2626" : risk === "Medium" ? "#D97706" : "#087A55";
  return (
    <span className="inline-flex items-center gap-1.5 text-[#344054]">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="font-semibold">{risk}</span>
    </span>
  );
}

/* ── ProgressCell ──────────────────────────────────────────────────
   Compact "62% [bar]" cell — percentage label + 6px green bar. */

export function ProgressCell({
  pct, color = "#087A55", className = "", label,
}: {
  pct: number; color?: string; className?: string; label?: string;
}) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div className={`flex items-center gap-1.5 min-w-[100px] ${className}`}>
      <span className="text-[#111827] font-bold whitespace-nowrap text-[11px]">
        {label ?? `${safePct}%`}
      </span>
      <div className="h-1.5 flex-1 rounded-full bg-[#eef2f6] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${safePct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ── AvatarCell ────────────────────────────────────────────────────
   Compact owner cell: 22px coloured initials circle + bold name. */

export function AvatarCell({
  initials, name, color = "#087A55", className = "",
}: {
  initials: string; name: string; color?: string; className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <span
        className="grid place-items-center rounded-full text-white shrink-0"
        style={{
          width: 22, height: 22, fontSize: "9px", fontWeight: 700,
          backgroundColor: color,
        }}
      >
        {initials}
      </span>
      <span className="text-[#111827] font-bold truncate">{name}</span>
    </span>
  );
}

/* ── IconTitleCell ─────────────────────────────────────────────────
   For rows where the primary cell needs a small leading icon (e.g.
   evidence file rows, activity rows). */

export function IconTitleCell({
  icon, title, subtitle, className = "",
}: {
  icon: ReactNode; title: ReactNode; subtitle?: ReactNode; className?: string;
}) {
  return (
    <span className={`inline-flex items-start gap-2 min-w-0 ${className}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-[#111827] truncate leading-tight">{title}</span>
        {subtitle && <span className="block text-[10px] text-[#7a8ca3] truncate mt-0.5">{subtitle}</span>}
      </span>
    </span>
  );
}

/* ── MediaListRow ──────────────────────────────────────────────────
   Used by feeds (Recent Activity, Story Sessions) where each row is
   icon + title + subtitle + right-side meta (date or status). NOT a
   grid — it's a compact flex row with optional chevron. */

export function MediaListRow({
  icon, title, subtitle, meta, status, href, className = "",
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  href?: string;
  className?: string;
}) {
  const baseCls = `flex items-center gap-2 py-1.5 border-b border-[#eef2f6] last:border-b-0 ${className}`;
  const inner = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-[#111827] truncate leading-tight">{title}</span>
        {subtitle && <span className="block text-[10px] text-[#7a8ca3] truncate mt-0.5">{subtitle}</span>}
      </span>
      {meta && <span className="text-[10.5px] text-[#7a8ca3] whitespace-nowrap shrink-0">{meta}</span>}
      {status && <span className="shrink-0">{status}</span>}
      {href && <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" strokeWidth={1.75} />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`${baseCls} hover:bg-gray-50/40 -mx-1 px-1`}>
        {inner}
      </Link>
    );
  }
  return <div className={baseCls}>{inner}</div>;
}

/* ── StarRating ────────────────────────────────────────────────────
   Compact "4.9 ★" cell for trainer/teacher rating columns. */

export function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[#111827] font-bold">
      {value.toFixed(1)}
      <Star className="h-3 w-3 text-amber-500 fill-amber-500" strokeWidth={1.5} />
    </span>
  );
}

/* ── EmeraldLink ───────────────────────────────────────────────────
   Inline link styled like the header's View all (without the chevron),
   used for clickable IDs in row cells (Visit IDs, Plan IDs, Assessment
   numbers). */

export function EmeraldLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[#006B5B] font-bold hover:underline">
      {children}
    </Link>
  );
}

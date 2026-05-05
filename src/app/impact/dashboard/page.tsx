import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Building2,
  Users,
  GraduationCap,
  ClipboardCheck,
  MessageCircle,
  PieChart as PieIcon,
  Globe,
  Search,
  Plus,
  Minus,
  Maximize2,
  Crosshair,
  ChevronDown,
  Heart,
  FileText,
  Sparkles,
  Activity,
  CheckCircle2,
  LayoutDashboard,
  Map,
  BookOpen,
  BarChart3,
  TrendingUp,
  GraduationCap as Cap,
  Scale,
  Database,
  Brain,
  Wrench,
  ChevronRight,
  type LucideIcon,
  Headphones,
  Type as TypeIcon,
  Combine,
  Eye,
  AlignLeft,
  BookCopy,
} from "lucide-react";
import { LiveMapEmbed } from "./LiveMapEmbed";
import { InteractiveTabs } from "./InteractiveTabs";
import { InteractiveFilters } from "./InteractiveFilters";

export const metadata: Metadata = {
  title: "Public Live Impact Dashboard | Ozeki Reading Bridge Foundation",
  description: "Real-time, evidence-based literacy outcomes and programme implementation across Uganda.",
};

export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────
   Design tokens — single source of truth, faithful to the screenshot.
   ──────────────────────────────────────────────────────────────────── */
const TEAL = "#066a67";
const TEAL_DARK = "#054d4a";
const TEAL_DEEP = "#033f3e";
const TEAL_SOFT = "#e6f3f2";
const ORANGE = "#ff7235";
const ORANGE_SOFT = "#fff0e8";
const CANVAS = "#f5f7fb";
const SURFACE = "#ffffff";
const BORDER = "#e7ecf3";
const TEXT = "#0f172a";
const TEXT_MUTED = "#64748b";
const TEXT_SUBTLE = "#94a3b8";
const RADIUS = "14px";
const RADIUS_SM = "8px";
const SHADOW_LOW = "0 1px 2px rgba(15, 23, 42, 0.04)";

/** Calibri across the entire dashboard, as required. */
const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';

/* ────────────────────────────────────────────────────────────────────
   Sidebar sections
   ──────────────────────────────────────────────────────────────────── */
const SIDEBAR_SECTIONS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "Overview", icon: LayoutDashboard, href: "#overview" },
  { label: "Geography", icon: Map, href: "#geography" },
  { label: "Learning Outcomes", icon: BookOpen, href: "#learning-outcomes" },
  { label: "Reading Levels", icon: BarChart3, href: "#reading-levels" },
  { label: "Implementation Funnel", icon: TrendingUp, href: "#funnel" },
  { label: "Teaching Quality", icon: Cap, href: "#teaching-quality" },
  { label: "Equity & Segments", icon: Scale, href: "#equity" },
  { label: "Data Completeness", icon: Database, href: "#data-completeness" },
  { label: "Intelligence", icon: Brain, href: "#intelligence" },
  { label: "Training Ops", icon: Wrench, href: "#training-ops" },
];

/* ────────────────────────────────────────────────────────────────────
   KPI + metric data (live data wiring is a follow-on; values match the
   screenshot today so the layout copy is faithful).
   ──────────────────────────────────────────────────────────────────── */
const KPIS: { label: string; value: string; helper: string; helperTone: "up" | "muted" | "warn"; icon: LucideIcon }[] = [
  { label: "Schools Supported", value: "172", helper: "↑ 12 vs last period", helperTone: "up", icon: Building2 },
  { label: "Reading Teachers", value: "0", helper: "Awaiting first sync", helperTone: "warn", icon: Users },
  { label: "Est. Learners Reached", value: "120", helper: "↑ 16 vs last period", helperTone: "up", icon: GraduationCap },
  { label: "Learners Assessed", value: "0", helper: "No baseline yet", helperTone: "muted", icon: ClipboardCheck },
  { label: "Coaching Visits", value: "0", helper: "No change", helperTone: "muted", icon: MessageCircle },
  { label: "Assessments (B/PIE)", value: "0/0/0", helper: "No change", helperTone: "muted", icon: PieIcon },
];

const READING_IMPROVEMENT: { label: string; value: string }[] = [
  { label: "Early (P1–P2)", value: "—" },
  { label: "Emergent (P3– P4)", value: "—" },
  { label: "Developing (P5–P6)", value: "—" },
  { label: "Fluent (P7+)", value: "—" },
];

const READING_PROGRESS: { label: string; value: string }[] = [
  { label: "Baseline-to-latest matched", value: "—" },
  { label: "Moved up ≥ 1 reading level", value: "—" },
  { label: "Tracked reading stages", value: "0" },
];

const FUNNEL: { label: string; value: number; pct: number }[] = [
  { label: "Schools trusted", value: 172, pct: 100 },
  { label: "Contacted / visited", value: 0, pct: 0 },
  { label: "Baseline assessed", value: 0, pct: 0 },
  { label: "In-class assessed", value: 0, pct: 0 },
  { label: "Endline assessed", value: 0, pct: 0 },
];

const CHANGE_GRID: { label: string; value: string; helper: string; tone: "up" | "muted" | "warn" }[] = [
  { label: "Schools Supported", value: "172", helper: "↑ 12", tone: "up" },
  { label: "Learners Assessed", value: "0", helper: "No change", tone: "muted" },
  { label: "Teachers Supported", value: "0", helper: "No change", tone: "muted" },
  { label: "Teaching Quality", value: "—", helper: "Awaiting", tone: "warn" },
  { label: "Non-reader Reduction", value: "—", helper: "Awaiting", tone: "warn" },
  { label: "P1+ Capable Gain", value: "—", helper: "Awaiting", tone: "warn" },
  { label: "Story Sessions", value: "—", helper: "Awaiting", tone: "warn" },
  { label: "Assessment Completion", value: "0.0%", helper: "0.0 pp", tone: "muted" },
];

const DOMAIN_TILES: { label: string; icon: LucideIcon }[] = [
  { label: "Phonemic Awareness", icon: Headphones },
  { label: "Grapheme–Phoneme Correspondence", icon: TypeIcon },
  { label: "Blending & Decoding", icon: Combine },
  { label: "Word Recognition", icon: Eye },
  { label: "Sentence & Paragraph Comprehension", icon: AlignLeft },
  { label: "Comprehension", icon: BookCopy },
];

const REGIONS = [
  "Highest Coverage",
  "High Coverage",
  "Moderate",
  "Emerging",
  "Early Stage",
  "No Data",
] as const;

const REGION_DOT: Record<typeof REGIONS[number], string> = {
  "Highest Coverage": "#0d6e6b",
  "High Coverage": "#3aa3a0",
  "Moderate": "#facc15",
  "Emerging": "#fb923c",
  "Early Stage": "#a855f7",
  "No Data": "#cbd5e1",
};

/* ────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────── */
export default function PublicLiveImpactDashboardPage() {
  return (
    <main style={{ background: CANVAS, color: TEXT, fontFamily: FONT }} className="orbf-public-dashboard">
      <TrustStrip />
      <PageTitleRow />
      <DashboardLayout />
      <FontEnforcer />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Trust strip — slim white strip below the site nav.
   ──────────────────────────────────────────────────────────────────── */
function TrustStrip() {
  return (
    <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
      <div className="max-w-[1760px] mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4 text-[12.5px]" style={{ color: TEXT_MUTED }}>
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "#16a34a", display: "inline-block", boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.15)" }} />
          <span style={{ fontWeight: 700, color: TEXT, letterSpacing: 0.2 }}>LIVE</span>
          <span>Data refreshed 2 mins ago</span>
        </div>
        <div className="hidden md:block flex-1 text-center" style={{ color: TEXT_MUTED }}>
          We verify every classroom milestone with real data across Uganda.
        </div>
        <div className="flex items-center gap-3">
          <Link href="/transparency" className="inline-flex items-center gap-1.5 hover:underline">
            <ShieldCheck className="h-3.5 w-3.5" /> How it works
          </Link>
          <span style={{ color: BORDER }}>·</span>
          <button type="button" className="inline-flex items-center gap-1.5 hover:underline">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Page title + filter row
   ──────────────────────────────────────────────────────────────────── */
function PageTitleRow() {
  return (
    <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
      <div className="max-w-[1760px] mx-auto px-4 lg:px-6 py-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] leading-tight font-bold" style={{ color: TEXT, letterSpacing: -0.2 }}>
              Public Live Impact Dashboard
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
              style={{ background: TEAL_SOFT, color: TEAL, borderRadius: 999, border: `1px solid ${TEAL_SOFT}` }}
            >
              <CheckCircle2 className="h-3 w-3" /> VERIFIED
            </span>
          </div>
          <p className="text-[12.5px] mt-1.5" style={{ color: TEXT_MUTED }}>
            Real-time, evidence-based literacy outcomes and programme implementation across Uganda.
          </p>
        </div>
        <InteractiveFilters />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Layout: dark sidebar (left) + main content (right)
   ──────────────────────────────────────────────────────────────────── */
function DashboardLayout() {
  return (
    <div className="max-w-[1760px] mx-auto px-4 lg:px-6 py-6">
      <div className="flex gap-5 items-stretch">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <KpiRow />
          <ThreeColumnGrid />
          <WhatChangedStrip />
          <ContentTabs />
          <LearningOutcomesByDomain />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Left dark dashboard sidebar
   ──────────────────────────────────────────────────────────────────── */
function Sidebar() {
  return (
    <aside
      className="shrink-0 hidden lg:flex flex-col gap-4"
      style={{
        width: 240,
        background: TEAL_DEEP,
        borderRadius: RADIUS,
        padding: "18px 14px",
        color: "#cbe7e6",
        alignSelf: "stretch",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] px-2" style={{ color: "rgba(255,255,255,0.5)" }}>
        Dashboard Sections
      </p>
      <ul className="flex flex-col gap-0.5">
        {SIDEBAR_SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          const isActive = idx === 0;
          return (
            <li key={section.label}>
              <a
                href={section.href}
                className="flex items-center gap-2 px-3 py-2 text-[13px] transition"
                style={{
                  borderRadius: 10,
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  color: isActive ? "#fff" : "#cbe7e6",
                  border: isActive ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent",
                  fontWeight: isActive ? 700 : 500,
                  position: "relative",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                <span className="truncate">{section.label}</span>
                {isActive ? (
                  <span aria-hidden style={{ position: "absolute", right: 10, width: 6, height: 6, borderRadius: 999, background: ORANGE }} />
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
      <SidebarLivePulse />
      <SidebarAdSlot />
      <DonatePromoCard />
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Sidebar — Live Pulse mini-feed
   ──────────────────────────────────────────────────────────────────── */
const PULSE_ITEMS: { dotColor: string; text: string; ago: string }[] = [
  { dotColor: "#34d399", text: "172 schools verified across Uganda", ago: "2m ago" },
  { dotColor: "#fbbf24", text: "FY 2024/2025 baseline window opens", ago: "today" },
  { dotColor: "#60a5fa", text: "EMIS sync queued for tonight", ago: "1h ago" },
];

function SidebarLivePulse() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Live Pulse
        </p>
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#34d399" }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "#34d399", display: "inline-block", boxShadow: "0 0 0 3px rgba(52, 211, 153, 0.18)" }} />
          Live
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {PULSE_ITEMS.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px]">
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: item.dotColor, display: "inline-block", marginTop: 5, flexShrink: 0 }} />
            <div className="min-w-0 flex-1">
              <p style={{ color: "#fff", lineHeight: 1.35 }}>{item.text}</p>
              <p className="text-[9.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{item.ago}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Sidebar — AdSense slot (prepared)
   Set NEXT_PUBLIC_ADSENSE_CLIENT (e.g. ca-pub-XXXXX) and
   NEXT_PUBLIC_ADSENSE_DASHBOARD_SIDEBAR_SLOT (numeric slot id) to
   replace the placeholder with a live ad. Keep the loader script
   (adsbygoogle.js) added to the global <head> separately, since
   AdSense terms forbid loading it on every page conditionally.
   ──────────────────────────────────────────────────────────────────── */
function SidebarAdSlot() {
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_DASHBOARD_SIDEBAR_SLOT?.trim();

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
        Sponsored
      </p>
      {adClient && adSlot ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 200, background: "transparent" }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div
          aria-hidden
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
            padding: 12,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Ad slot ready</p>
          <p className="text-[10.5px] mt-1.5" style={{ lineHeight: 1.4 }}>
            Set <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: 4 }}>NEXT_PUBLIC_ADSENSE_CLIENT</code> + slot id to enable.
          </p>
        </div>
      )}
    </div>
  );
}

function DonatePromoCard() {
  return (
    <div
      style={{
        marginTop: "auto",
        background: TEAL_DARK,
        borderRadius: 12,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ position: "relative", height: 88, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
        <Image
          src="/photos/learner-portrait.jpg"
          alt="A young learner in Uganda"
          fill
          sizes="220px"
          style={{ objectFit: "cover" }}
        />
      </div>
      <p className="text-[12px] mt-2.5" style={{ color: "#fff", fontWeight: 700, lineHeight: 1.25 }}>
        Strong readers.<br />Bright futures.
      </p>
      <p className="text-[10.5px] mt-1.5" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
        Together we&apos;re building a nation where every child can thrive.
      </p>
      <Link
        href="/donate"
        className="mt-2.5 inline-flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-bold transition hover:opacity-95"
        style={{ background: ORANGE, color: "#fff", borderRadius: 8, boxShadow: SHADOW_LOW }}
      >
        <Heart className="h-3.5 w-3.5" /> Donate Now
      </Link>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   KPI row
   ──────────────────────────────────────────────────────────────────── */
function KpiRow() {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {KPIS.map((kpi) => {
        const Icon = kpi.icon;
        const helperColor =
          kpi.helperTone === "up" ? "#16a34a"
            : kpi.helperTone === "warn" ? "#b45309"
              : TEXT_SUBTLE;
        return (
          <article
            key={kpi.label}
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS,
              padding: "12px 14px",
              boxShadow: SHADOW_LOW,
              minHeight: 96,
            }}
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: TEAL_SOFT,
                  color: TEAL,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[10.5px] font-bold uppercase tracking-wider leading-tight" style={{ color: TEXT_MUTED }}>
                {kpi.label}
              </p>
            </div>
            <p className="text-[26px] font-bold mt-2 leading-none" style={{ color: TEXT }}>
              {kpi.value}
            </p>
            <p className="text-[10.5px] mt-1.5" style={{ color: helperColor, fontWeight: 600 }}>
              {kpi.helper}
            </p>
          </article>
        );
      })}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Three-column grid: filters/data trust | map | metric stack
   ──────────────────────────────────────────────────────────────────── */
function ThreeColumnGrid() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2.4fr)_minmax(280px,1fr)] gap-4 items-stretch">
      {/* LEFT — Explore + Data Trust (stretches to match map height, no dead space) */}
      <div className="flex flex-col gap-4">
        <ExploreByGeographyCard />
        <DataTrustCard className="flex-1" />
      </div>

      {/* CENTER — Map (large square-ish, centerpiece) */}
      <div className="min-w-0">
        <CoverageMapPanel />
      </div>

      {/* RIGHT — Learning & Parity / Reading Progress / Funnel (stretches to match map height) */}
      <div className="flex flex-col gap-4">
        <LearningParityCard />
        <ReadingProgressCard />
        <ConversionFunnelCard className="flex-1" />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Card primitives
   ──────────────────────────────────────────────────────────────────── */
type CardProps = { children: React.ReactNode; padding?: number; className?: string };
function Card({ children, padding = 16, className }: CardProps) {
  return (
    <article
      className={className}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS,
        padding,
        boxShadow: SHADOW_LOW,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </article>
  );
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>{title}</h3>
        {subtitle ? <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Explore By Geography
   ──────────────────────────────────────────────────────────────────── */
function ExploreByGeographyCard() {
  const filters = [
    { label: "Period", value: "FY 2024/2025" },
    { label: "Region", value: "All regions" },
    { label: "Sub-region", value: "All sub-regions" },
    { label: "District", value: "All districts" },
    { label: "School", value: "All schools" },
  ];
  return (
    <Card>
      <div className="flex items-start gap-2 mb-3">
        <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, background: TEAL_SOFT, color: TEAL, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Globe className="h-3.5 w-3.5" />
        </span>
        <div>
          <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>Explore By Geography</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>Dive deeper to see impact where it matters.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {filters.map((f) => (
          <label key={f.label} className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUBTLE }}>{f.label}</span>
            <button
              type="button"
              className="mt-1 w-full flex items-center justify-between px-3 py-2 text-[12.5px] transition hover:border-gray-300"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
            >
              <span>{f.value}</span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: TEXT_SUBTLE }} />
            </button>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-bold transition hover:opacity-95"
        style={{ background: ORANGE, color: "#fff", borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
      >
        Apply
      </button>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Data Trust card
   ──────────────────────────────────────────────────────────────────── */
function DataTrustCard({ className }: { className?: string }) {
  const rows = [
    { label: "Completeness", value: "Complete", tone: "ok" as const },
    { label: "Sample size", value: "n = 172", tone: "muted" as const },
    { label: "Last updated", value: "28 Apr · 08:45", tone: "muted" as const },
  ];
  return (
    <Card className={className}>
      <div className="flex items-start gap-2 mb-3">
        <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, background: TEAL_SOFT, color: TEAL, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
        <div>
          <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>Data Trust</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>Transparent by design. Built on trust.</p>
        </div>
      </div>
      <ul className="flex flex-col">
        {rows.map((row, i) => (
          <li
            key={row.label}
            className="flex items-center justify-between py-2 text-[12px]"
            style={{ borderTop: i === 0 ? "none" : `1px dashed ${BORDER}` }}
          >
            <span style={{ color: TEXT_MUTED }}>{row.label}</span>
            <span className="inline-flex items-center gap-1.5" style={{ color: row.tone === "ok" ? "#16a34a" : TEXT, fontWeight: 600 }}>
              {row.tone === "ok" ? <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: "#16a34a", display: "inline-block" }} /> : null}
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Link
          href="/transparency"
          className="inline-flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-bold transition hover:bg-gray-50"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
        >
          <FileText className="h-3.5 w-3.5" /> Reports
        </Link>
        <Link
          href="/impact/stories"
          className="inline-flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-bold transition hover:bg-gray-50"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
        >
          <Sparkles className="h-3.5 w-3.5" /> Stories
        </Link>
      </div>
      <Link
        href="/donate"
        className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-bold transition hover:opacity-95"
        style={{ background: TEAL, color: "#fff", borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
      >
        <Heart className="h-3.5 w-3.5" /> Sponsor a District
      </Link>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Coverage map panel — the centerpiece, with a SQUARE-ISH canvas.
   ──────────────────────────────────────────────────────────────────── */
function CoverageMapPanel() {
  const levelTabs = ["District", "Sub-region"];
  const modeTabs = ["Coverage", "Improvement", "Fidelity"];
  return (
    <Card padding={0}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>Where We Work (Live)</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>Live coverage of our programmes across Uganda.</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedTabs options={levelTabs} active={0} variant="dark" />
          <SegmentedTabs options={modeTabs} active={0} variant="orange" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: TEXT_SUBTLE }} />
          <input
            type="search"
            aria-label="Search district"
            placeholder="Search district…"
            className="w-full pl-8 pr-3 py-1.5 text-[12px]"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
          />
        </div>
        <div className="flex items-center gap-1">
          <MapButton ariaLabel="Zoom in"><Plus className="h-3.5 w-3.5" /></MapButton>
          <MapButton ariaLabel="Zoom out"><Minus className="h-3.5 w-3.5" /></MapButton>
          <MapButton ariaLabel="Fit to viewport"><Maximize2 className="h-3.5 w-3.5" /></MapButton>
          <MapButton ariaLabel="Recentre"><Crosshair className="h-3.5 w-3.5" /></MapButton>
        </div>
      </div>

      {/* The map itself */}
      <div className="px-3 pt-2">
        <LiveMapEmbed />
      </div>

      {/* Legend + footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-t" style={{ borderColor: BORDER }}>
        {REGIONS.map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: REGION_DOT[r], display: "inline-block" }} />
            {r}
          </span>
        ))}
        <Link href="/impact/dashboard?view=map" className="ml-auto text-[11.5px] font-bold inline-flex items-center gap-1" style={{ color: TEAL }}>
          View Map Details <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}

function SegmentedTabs({ options, active, variant }: { options: string[]; active: number; variant: "dark" | "orange" }) {
  return (
    <div
      className="inline-flex items-center"
      style={{
        background: variant === "dark" ? TEAL_DEEP : "rgba(255,114,53,0.08)",
        padding: 3,
        borderRadius: 999,
        gap: 2,
      }}
    >
      {options.map((label, i) => {
        const isActive = i === active;
        const inactiveColor = variant === "dark" ? "rgba(255,255,255,0.7)" : ORANGE;
        return (
          <button
            key={label}
            type="button"
            className="px-3 py-1 text-[11px] font-bold transition"
            style={{
              borderRadius: 999,
              background: isActive
                ? variant === "dark" ? "#fff" : ORANGE
                : "transparent",
              color: isActive
                ? variant === "dark" ? TEAL_DEEP : "#fff"
                : inactiveColor,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MapButton({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center transition hover:bg-gray-50"
      style={{
        width: 30, height: 30,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        color: TEXT,
      }}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Right column cards
   ──────────────────────────────────────────────────────────────────── */
function LearningParityCard() {
  return (
    <Card>
      <CardHeader title="Learning & Parity" subtitle="Outcomes & gender parity snapshot." />
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] mt-1.5 mb-2" style={{ color: TEXT_SUBTLE }}>
        Reading Improvement (vs Baseline)
      </p>
      <ul className="flex flex-col">
        {READING_IMPROVEMENT.map((row, i) => (
          <li key={row.label} className="flex items-center justify-between py-1.5 text-[12px]"
            style={{ borderTop: i === 0 ? "none" : `1px dashed ${BORDER}` }}>
            <span style={{ color: TEXT_MUTED }}>{row.label}</span>
            <span style={{ color: TEXT_SUBTLE, fontWeight: 600 }}>{row.value}</span>
          </li>
        ))}
        <li className="flex items-center justify-between py-2 text-[12px]"
          style={{ borderTop: `1px dashed ${BORDER}` }}>
          <span style={{ color: TEXT, fontWeight: 700 }}>All grades</span>
          <span style={{ color: TEXT_SUBTLE, fontWeight: 600 }}>0%</span>
        </li>
      </ul>

      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <ParityDonut malePct={0.5} />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUBTLE }}>Gender Parity</p>
          <ul className="mt-1 text-[11px] space-y-0.5">
            <li className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: TEAL, display: "inline-block" }} />
              Male <span style={{ color: TEXT, fontWeight: 700, marginLeft: 4 }}>0 (0%)</span>
            </li>
            <li className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: ORANGE, display: "inline-block" }} />
              Female <span style={{ color: TEXT, fontWeight: 700, marginLeft: 4 }}>0 (0%)</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

function ParityDonut({ malePct }: { malePct: number }) {
  const size = 84;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const maleStroke = circumference * malePct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={BORDER} strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={TEAL}
        strokeWidth={10}
        strokeDasharray={`${maleStroke} ${circumference - maleStroke}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={ORANGE}
        strokeWidth={10}
        strokeDasharray={`${circumference - maleStroke} ${maleStroke}`}
        strokeDashoffset={-maleStroke}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={13} fontWeight={700} fill={TEXT} style={{ fontFamily: FONT }}>
        50/50
      </text>
    </svg>
  );
}

function ReadingProgressCard() {
  return (
    <Card>
      <CardHeader title="Reading Progress" subtitle="How learners are progressing." />
      <ul className="flex flex-col">
        {READING_PROGRESS.map((row, i) => (
          <li key={row.label} className="flex items-center justify-between py-2 text-[12px]"
            style={{ borderTop: i === 0 ? "none" : `1px dashed ${BORDER}` }}>
            <span style={{ color: TEXT_MUTED }}>{row.label}</span>
            <span style={{ color: TEXT, fontWeight: 700 }}>{row.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ConversionFunnelCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title="Conversion Funnel" subtitle="From selection to outcomes." />
      <ul className="flex flex-col gap-2.5">
        {FUNNEL.map((step) => (
          <li key={step.label}>
            <div className="flex items-center justify-between text-[11.5px]">
              <span style={{ color: TEXT_MUTED }}>{step.label}</span>
              <span style={{ color: TEXT, fontWeight: 700 }}>{step.value}</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: BORDER, overflow: "hidden", marginTop: 4 }}>
              <div
                style={{
                  width: `${step.pct}%`,
                  height: "100%",
                  background: step.pct > 0 ? TEAL : "transparent",
                  borderRadius: 999,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between mt-3 pt-3 text-[11px]" style={{ borderTop: `1px solid ${BORDER}` }}>
        <span style={{ color: TEXT_MUTED }}>Step retention <span style={{ color: TEXT, fontWeight: 700 }}>0.0%</span></span>
        <span style={{ color: TEXT_MUTED }}>Cumulative <span style={{ color: TEXT, fontWeight: 700 }}>0.0%</span></span>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   What Changed This Period
   ──────────────────────────────────────────────────────────────────── */
function WhatChangedStrip() {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>What Changed This Period</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>Key movements in outcomes and implementation.</p>
        </div>
        <Link href="/transparency" className="text-[11.5px] font-bold inline-flex items-center gap-1" style={{ color: TEAL }}>
          View All Insights <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CHANGE_GRID.map((m) => {
          const helperColor =
            m.tone === "up" ? "#16a34a"
              : m.tone === "warn" ? "#b45309"
                : TEXT_SUBTLE;
          return (
            <div key={m.label} style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: 10 }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUBTLE }}>{m.label}</p>
              <p className="text-[18px] font-bold mt-1" style={{ color: TEXT }}>{m.value}</p>
              <p className="text-[10.5px] mt-0.5" style={{ color: helperColor, fontWeight: 600 }}>{m.helper}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Lower content tabs
   ──────────────────────────────────────────────────────────────────── */
function ContentTabs() {
  const tabs = [
    "Learning Outcomes",
    "Reading Levels",
    "Implementation Funnel",
    "Teaching Quality",
    "Equity & Segments",
    "Data Completeness",
    "Intelligence",
    "Training Ops",
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-1 px-2 py-2"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, boxShadow: SHADOW_LOW }}
    >
      {tabs.map((t, i) => {
        const active = i === 0;
        return (
          <button
            key={t}
            type="button"
            className="px-3 py-1.5 text-[12px] font-bold transition"
            style={{
              borderRadius: 999,
              background: active ? TEAL : "transparent",
              color: active ? "#fff" : TEXT_MUTED,
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Learning Outcomes by Domain — tile grid (no tables)
   ──────────────────────────────────────────────────────────────────── */
function LearningOutcomesByDomain() {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-bold leading-tight" style={{ color: TEXT }}>Learning Outcomes by Domain</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>
            Percentage of learners meeting benchmark in skills domains.
          </p>
        </div>
        <Link href="/impact/methodology" className="text-[11.5px] font-bold inline-flex items-center gap-1" style={{ color: TEAL }}>
          View Methodology <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DOMAIN_TILES.map(({ label, icon: Icon }) => (
          <div
            key={label}
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 14,
              minHeight: 110,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: ORANGE_SOFT, color: ORANGE,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[12px] font-bold mt-2 leading-snug" style={{ color: TEXT }}>{label}</p>
            <p className="text-[18px] font-bold mt-2" style={{ color: TEXT_SUBTLE }}>—</p>
            <p className="text-[10.5px] mt-0.5" style={{ color: TEXT_SUBTLE }}>No baseline</p>
          </div>
        ))}
      </div>
      {/* InteractiveTabs is kept imported (and rendered hidden) so its
          motion/animation chunk still ships and the existing tabbed content
          handler stays available for follow-on wiring. */}
      <div className="hidden">
        <InteractiveTabs tabs={[]} panels={[]} />
        <Activity />
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Calibri enforcement — scoped to .orbf-public-dashboard so it never
   bleeds into the rest of the site.
   ──────────────────────────────────────────────────────────────────── */
function FontEnforcer() {
  return (
    <style>{`
      .orbf-public-dashboard,
      .orbf-public-dashboard * {
        font-family: Calibri, "Segoe UI", Arial, sans-serif !important;
      }
      .orbf-public-dashboard input,
      .orbf-public-dashboard select,
      .orbf-public-dashboard textarea,
      .orbf-public-dashboard button {
        font-family: Calibri, "Segoe UI", Arial, sans-serif !important;
      }

      /* Stretch the public site nav AND footer to align with the
         dashboard's wider canvas. Scoped via :has() so it only fires
         when the dashboard page is rendered — every other route keeps
         the default 1280px chrome width. */
      body:has(.orbf-public-dashboard) .header .navigation-contain,
      body:has(.orbf-public-dashboard) .footer-v2-container {
        width: 100%;
        max-width: 1760px;
        padding-inline: 1rem;
      }
      @media (min-width: 1024px) {
        body:has(.orbf-public-dashboard) .header .navigation-contain,
        body:has(.orbf-public-dashboard) .footer-v2-container {
          padding-inline: 1.5rem;
        }
      }
    `}</style>
  );
}

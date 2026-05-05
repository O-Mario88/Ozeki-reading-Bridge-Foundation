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
import { ExploreFilterCard } from "./ExploreFilterCard";
import { CoverageMapModeTabs, CoverageMapZoomControls } from "./CoverageMapControls";
import { MapSearchInputClient } from "./MapSearchInputClient";
import { getDashboardSnapshot, type DashboardSnapshot } from "./dashboard-snapshot";

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
   KPI builder — six live values from the snapshot.
   ──────────────────────────────────────────────────────────────────── */
type KpiTone = "up" | "muted" | "warn";
type KpiCard = { label: string; value: string; helper: string; helperTone: KpiTone; icon: LucideIcon };

function buildKpis(snapshot: DashboardSnapshot): KpiCard[] {
  const schools = snapshot.reach?.schoolsReached ?? 0;
  const teachersTrained = snapshot.cost.teachersTrained ?? 0;
  const teachersObserved = snapshot.observation.totalSubmitted ?? 0;
  const learnersReached = snapshot.cost.learnersReached ?? 0;
  const learnersAssessed = snapshot.assessmentCounts.total ?? 0;
  const coachingDelivered = snapshot.coaching?.completedLast90d ?? 0;
  const ac = snapshot.assessmentCounts;

  return [
    {
      label: "Schools Supported",
      value: schools.toLocaleString(),
      helper: schools > 0 ? `${(snapshot.reach?.districtsReached ?? 0)} districts` : "Awaiting first sync",
      helperTone: schools > 0 ? "up" : "warn",
      icon: Building2,
    },
    {
      label: "Reading Teachers",
      value: teachersTrained.toLocaleString(),
      helper: teachersObserved > 0 ? `${teachersObserved} observed` : "Awaiting first sync",
      helperTone: teachersTrained > 0 ? "up" : "warn",
      icon: Users,
    },
    {
      label: "Est. Learners Reached",
      value: learnersReached.toLocaleString(),
      helper: learnersReached > 0 ? `${snapshot.cost.learnersImproved.toLocaleString()} improved` : "No baseline yet",
      helperTone: learnersReached > 0 ? "up" : "muted",
      icon: GraduationCap,
    },
    {
      label: "Learners Assessed",
      value: learnersAssessed.toLocaleString(),
      helper: learnersAssessed > 0 ? `${ac.baseline.toLocaleString()} baseline · ${ac.endline.toLocaleString()} endline` : "No baseline yet",
      helperTone: learnersAssessed > 0 ? "up" : "muted",
      icon: ClipboardCheck,
    },
    {
      label: "Coaching Visits",
      value: coachingDelivered.toLocaleString(),
      helper: snapshot.coaching ? `${snapshot.coaching.completionPct ?? 0}% on schedule` : "No change",
      helperTone: coachingDelivered > 0 ? "up" : "muted",
      icon: MessageCircle,
    },
    {
      label: "Assessments (B/P/E)",
      value: `${ac.baseline}/${ac.progress}/${ac.endline}`,
      helper: ac.total > 0 ? `${ac.total.toLocaleString()} total` : "No change",
      helperTone: ac.total > 0 ? "up" : "muted",
      icon: PieIcon,
    },
  ];
}

function buildChangeGrid(snapshot: DashboardSnapshot): { label: string; value: string; helper: string; tone: "up" | "muted" | "warn" }[] {
  const schools = snapshot.reach?.schoolsReached ?? 0;
  const learnersAssessed = snapshot.assessmentCounts.total ?? 0;
  const teachers = snapshot.cost.teachersTrained ?? 0;
  const tq = snapshot.observation;
  const nrr = snapshot.nonReaderReduction;
  const stories = snapshot.stories?.newThisMonth ?? 0;
  const completion = snapshot.assessmentCompletion.completionPct;
  // P1+ Capable Gain — share of P1-P2 paired learners that improved.
  const earlyBand = snapshot.gradeBandImprovement.find((b) => b.band === "Early (P1–P2)");
  return [
    { label: "Schools Supported", value: schools.toLocaleString(), helper: schools > 0 ? "Live" : "Awaiting", tone: schools > 0 ? "up" : "warn" },
    { label: "Learners Assessed", value: learnersAssessed.toLocaleString(), helper: learnersAssessed > 0 ? "Live" : "No change", tone: learnersAssessed > 0 ? "up" : "muted" },
    { label: "Teachers Supported", value: teachers.toLocaleString(), helper: teachers > 0 ? "Live" : "No change", tone: teachers > 0 ? "up" : "muted" },
    { label: "Teaching Quality", value: tq.totalSubmitted > 0 ? `${tq.fidelityPct}%` : "—", helper: tq.totalSubmitted > 0 ? `${tq.fidelityCount}/${tq.totalSubmitted} fidelity` : "Awaiting", tone: tq.fidelityPct >= 50 ? "up" : tq.totalSubmitted > 0 ? "muted" : "warn" },
    { label: "Non-reader Reduction", value: nrr.baselinePreReaders > 0 ? `${nrr.reductionPct}%` : "—", helper: nrr.baselinePreReaders > 0 ? `${nrr.reduction.toLocaleString()} fewer pre-readers` : "Awaiting", tone: nrr.reductionPct > 0 ? "up" : nrr.baselinePreReaders > 0 ? "muted" : "warn" },
    { label: "P1+ Capable Gain", value: earlyBand && earlyBand.paired > 0 ? `${earlyBand.improvedPct}%` : "—", helper: earlyBand && earlyBand.paired > 0 ? `${earlyBand.improved}/${earlyBand.paired} improved` : "Awaiting", tone: earlyBand && earlyBand.improvedPct > 0 ? "up" : "warn" },
    { label: "Story Sessions", value: stories.toLocaleString(), helper: snapshot.stories ? `${snapshot.stories.totalPublished} total stories` : "Awaiting", tone: stories > 0 ? "up" : "warn" },
    { label: "Assessment Completion", value: `${completion.toFixed(1)}%`, helper: snapshot.assessmentCompletion.scheduled > 0 ? `${snapshot.assessmentCompletion.completed}/${snapshot.assessmentCompletion.scheduled} windows` : "0.0 pp", tone: completion >= 50 ? "up" : "muted" },
  ];
}

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
   Page (async server component — pulls a single live snapshot
   that every section reads from). Filters live in URL searchParams so
   the InteractiveFilters dropdowns drive a re-render of the snapshot.
   ──────────────────────────────────────────────────────────────────── */
type PageFilters = {
  year: string;
  view: string;
  program: string;
  geography: string;
};

const FILTER_DEFAULTS: PageFilters = {
  year: "FY 2024/2025",
  view: "All Metrics",
  program: "All Programs",
  geography: "Uganda",
};

function parseFilters(sp: Record<string, string | string[] | undefined> | undefined): PageFilters {
  const get = (k: string, fallback: string) => {
    const v = sp?.[k];
    if (Array.isArray(v)) return v[0] ?? fallback;
    return (typeof v === "string" && v.trim().length > 0) ? v : fallback;
  };
  return {
    year: get("year", FILTER_DEFAULTS.year),
    view: get("view", FILTER_DEFAULTS.view),
    program: get("program", FILTER_DEFAULTS.program),
    geography: get("geography", FILTER_DEFAULTS.geography),
  };
}

export default async function PublicLiveImpactDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const filters = parseFilters(sp);
  const snapshot = await getDashboardSnapshot();
  return (
    <main style={{ background: CANVAS, color: TEXT, fontFamily: FONT }} className="orbf-public-dashboard">
      <TrustStrip generatedAt={snapshot.generatedAt} />
      <PageTitleRow filters={filters} />
      <DashboardLayout snapshot={snapshot} />
      <FontEnforcer />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Trust strip — slim white strip below the site nav.
   ──────────────────────────────────────────────────────────────────── */
function TrustStrip({ generatedAt }: { generatedAt: string }) {
  const ageMs = Math.max(0, Date.now() - new Date(generatedAt).getTime());
  const ageMin = Math.round(ageMs / 60_000);
  const refreshedLabel =
    ageMin <= 0 ? "Data refreshed just now" :
      ageMin < 60 ? `Data refreshed ${ageMin} min${ageMin === 1 ? "" : "s"} ago` :
        `Data refreshed ${Math.round(ageMin / 60)}h ago`;
  return (
    <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
      <div className="max-w-[1760px] mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4 text-[12.5px]" style={{ color: TEXT_MUTED }}>
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "#16a34a", display: "inline-block", boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.15)" }} />
          <span style={{ fontWeight: 700, color: TEXT, letterSpacing: 0.2 }}>LIVE</span>
          <span>{refreshedLabel}</span>
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
function PageTitleRow({ filters }: { filters: PageFilters }) {
  const activeChips: { label: string; value: string }[] = [];
  if (filters.year !== FILTER_DEFAULTS.year) activeChips.push({ label: "Year", value: filters.year });
  if (filters.view !== FILTER_DEFAULTS.view) activeChips.push({ label: "View", value: filters.view });
  if (filters.program !== FILTER_DEFAULTS.program) activeChips.push({ label: "Program", value: filters.program });
  if (filters.geography !== FILTER_DEFAULTS.geography) activeChips.push({ label: "Geography", value: filters.geography });

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
            Real-time, evidence-based literacy outcomes and programme implementation across {filters.geography}.
          </p>
          {activeChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUBTLE }}>
                Active filters
              </span>
              {activeChips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: TEAL_SOFT, color: TEAL, borderRadius: 999, border: `1px solid ${TEAL_SOFT}` }}
                  title={`${c.label}: ${c.value}`}
                >
                  <span style={{ color: TEAL_DARK }}>{c.label}:</span> {c.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <InteractiveFilters />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Layout: dark sidebar (left) + main content (right)
   ──────────────────────────────────────────────────────────────────── */
function DashboardLayout({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="max-w-[1760px] mx-auto px-4 lg:px-6 py-6">
      <div className="flex gap-5 items-stretch">
        <Sidebar snapshot={snapshot} />
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <section id="overview" style={{ scrollMarginTop: 96 }}>
            <KpiRow snapshot={snapshot} />
          </section>
          <section id="geography" style={{ scrollMarginTop: 96 }}>
            <ThreeColumnGrid snapshot={snapshot} />
          </section>
          <section id="teaching-quality" style={{ scrollMarginTop: 96 }}>
            <TeachingQualitySection snapshot={snapshot} />
          </section>
          <section id="intelligence" style={{ scrollMarginTop: 96 }}>
            <WhatChangedStrip snapshot={snapshot} />
          </section>
          <section id="reading-levels" style={{ scrollMarginTop: 96 }}>
            <ContentTabs />
          </section>
          <section id="learning-outcomes" style={{ scrollMarginTop: 96 }}>
            <LearningOutcomesByDomain snapshot={snapshot} />
          </section>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Left dark dashboard sidebar
   ──────────────────────────────────────────────────────────────────── */
function Sidebar({ snapshot }: { snapshot: DashboardSnapshot }) {
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
      <SidebarLivePulse snapshot={snapshot} />
      <SidebarAdSlot />
      <DonatePromoCard />
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Sidebar — Live Pulse mini-feed (sourced from the snapshot)
   ──────────────────────────────────────────────────────────────────── */
function buildPulseItems(snapshot: DashboardSnapshot): { dotColor: string; text: string; ago: string }[] {
  const items: { dotColor: string; text: string; ago: string }[] = [];
  if (snapshot.reach && snapshot.reach.schoolsReached > 0) {
    items.push({
      dotColor: "#34d399",
      text: `${snapshot.reach.schoolsReached.toLocaleString()} schools verified across Uganda`,
      ago: "live",
    });
  }
  if (snapshot.observation.totalSubmitted > 0) {
    items.push({
      dotColor: "#60a5fa",
      text: `${snapshot.observation.fidelityPct}% fidelity from ${snapshot.observation.totalSubmitted.toLocaleString()} observations`,
      ago: "live",
    });
  }
  if (snapshot.cost.learnersReached > 0) {
    items.push({
      dotColor: "#fbbf24",
      text: `${snapshot.cost.learnersReached.toLocaleString()} learners assessed to date`,
      ago: "live",
    });
  }
  if (items.length === 0) {
    items.push({ dotColor: "#94a3b8", text: "Awaiting first sync from the field", ago: "—" });
  }
  return items.slice(0, 3);
}

function SidebarLivePulse({ snapshot }: { snapshot: DashboardSnapshot }) {
  const PULSE_ITEMS = buildPulseItems(snapshot);
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
function KpiRow({ snapshot }: { snapshot: DashboardSnapshot }) {
  const KPIS = buildKpis(snapshot);
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
function ThreeColumnGrid({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2.4fr)_minmax(280px,1fr)] gap-4 items-stretch">
      {/* LEFT — Explore + Data Trust (stretches to match map height, no dead space) */}
      <div className="flex flex-col gap-4">
        <ExploreFilterCard />
        <DataTrustCard className="flex-1" snapshot={snapshot} />
      </div>

      {/* CENTER — Map (large square-ish, centerpiece) */}
      <div className="min-w-0">
        <CoverageMapPanel />
      </div>

      {/* RIGHT — Learning & Parity / Reading Progress / Funnel (stretches to match map height) */}
      <div className="flex flex-col gap-4">
        <LearningParityCard snapshot={snapshot} />
        <ReadingProgressCard snapshot={snapshot} />
        <ConversionFunnelCard className="flex-1" snapshot={snapshot} />
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
   Data Trust card
   ──────────────────────────────────────────────────────────────────── */
function DataTrustCard({ className, snapshot }: { className?: string; snapshot: DashboardSnapshot }) {
  const sample = snapshot.cost.learnersReached || snapshot.assessmentCounts.total || 0;
  const completeness =
    snapshot.observation.totalSubmitted > 0 || snapshot.assessmentCounts.total > 0
      ? "Live"
      : "Awaiting first sync";
  const completenessTone: "ok" | "muted" = completeness === "Live" ? "ok" : "muted";
  const lastUpdated = new Date(snapshot.generatedAt).toLocaleString(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const rows = [
    { label: "Completeness", value: completeness, tone: completenessTone },
    { label: "Sample size", value: sample > 0 ? `n = ${sample.toLocaleString()}` : "n = 0", tone: "muted" as const },
    { label: "Last updated", value: lastUpdated, tone: "muted" as const },
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
          href="/stories"
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
  return (
    <Card padding={0}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>Where We Work (Live)</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>Live coverage of our programmes across Uganda.</p>
        </div>
        <CoverageMapModeTabs />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <MapSearchInput />
        <CoverageMapZoomControls />
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

function MapSearchInput() {
  return (
    <MapSearchInputClient
      placeholder="Search district…"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────
   Right column cards
   ──────────────────────────────────────────────────────────────────── */
function LearningParityCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const allGradesPct =
    snapshot.stageShift?.improvedSharePct != null
      ? `${snapshot.stageShift.improvedSharePct}%`
      : "0%";
  const malePct = snapshot.parity.total > 0 ? snapshot.parity.male / snapshot.parity.total : 0.5;
  return (
    <Card>
      <CardHeader title="Learning & Parity" subtitle="Outcomes & gender parity snapshot." />
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] mt-1.5 mb-2" style={{ color: TEXT_SUBTLE }}>
        Reading Improvement (vs Baseline)
      </p>
      <ul className="flex flex-col">
        {snapshot.gradeBandImprovement.map((row, i) => (
          <li key={row.band} className="flex items-center justify-between py-1.5 text-[12px]"
            style={{ borderTop: i === 0 ? "none" : `1px dashed ${BORDER}` }}>
            <span style={{ color: TEXT_MUTED }}>{row.band}</span>
            <span style={{ color: row.paired > 0 ? TEXT : TEXT_SUBTLE, fontWeight: 600 }}>
              {row.paired > 0 ? `${row.improvedPct}%` : "—"}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between py-2 text-[12px]"
          style={{ borderTop: `1px dashed ${BORDER}` }}>
          <span style={{ color: TEXT, fontWeight: 700 }}>All grades</span>
          <span style={{ color: TEXT, fontWeight: 700 }}>{allGradesPct}</span>
        </li>
      </ul>

      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <ParityDonut malePct={malePct} />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUBTLE }}>Gender Parity</p>
          <ul className="mt-1 text-[11px] space-y-0.5">
            <li className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: TEAL, display: "inline-block" }} />
              Male <span style={{ color: TEXT, fontWeight: 700, marginLeft: 4 }}>
                {snapshot.parity.male.toLocaleString()} ({snapshot.parity.malePct}%)
              </span>
            </li>
            <li className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: ORANGE, display: "inline-block" }} />
              Female <span style={{ color: TEXT, fontWeight: 700, marginLeft: 4 }}>
                {snapshot.parity.female.toLocaleString()} ({snapshot.parity.femalePct}%)
              </span>
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

function ReadingProgressCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const matched = snapshot.stageShift?.endlineLearners ?? 0;
  const movedUp = snapshot.cost.learnersImproved ?? 0;
  const trackedStages = snapshot.gradeBandImprovement.reduce((acc, b) => acc + b.paired, 0);
  const rows: { label: string; value: string }[] = [
    { label: "Baseline-to-latest matched", value: matched > 0 ? matched.toLocaleString() : "—" },
    { label: "Moved up ≥ 1 reading level", value: movedUp > 0 ? movedUp.toLocaleString() : "—" },
    { label: "Tracked reading stages", value: trackedStages.toLocaleString() },
  ];
  return (
    <Card>
      <CardHeader title="Reading Progress" subtitle="How learners are progressing." />
      <ul className="flex flex-col">
        {rows.map((row, i) => (
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

function ConversionFunnelCard({ className, snapshot }: { className?: string; snapshot: DashboardSnapshot }) {
  const f = snapshot.funnel;
  const top = Math.max(f.schoolsTrusted, 1);
  const FUNNEL_ROWS: { label: string; value: number; pct: number }[] = [
    { label: "Schools trusted", value: f.schoolsTrusted, pct: f.schoolsTrusted > 0 ? 100 : 0 },
    { label: "Contacted / visited", value: f.contactedOrVisited, pct: Math.round((f.contactedOrVisited / top) * 100) },
    { label: "Baseline assessed", value: f.baselineAssessed, pct: Math.min(100, Math.round((f.baselineAssessed / top) * 100)) },
    { label: "In-class assessed", value: f.inClassAssessed, pct: Math.min(100, Math.round((f.inClassAssessed / top) * 100)) },
    { label: "Endline assessed", value: f.endlineAssessed, pct: Math.min(100, Math.round((f.endlineAssessed / top) * 100)) },
  ];
  // Step retention = average step-over-step retention. Cumulative = endline / schoolsTrusted.
  const stepRetentions: number[] = [];
  for (let i = 1; i < FUNNEL_ROWS.length; i++) {
    const prev = FUNNEL_ROWS[i - 1]!.value;
    if (prev > 0) stepRetentions.push((FUNNEL_ROWS[i]!.value / prev) * 100);
  }
  const stepRetention = stepRetentions.length > 0
    ? Math.round((stepRetentions.reduce((a, b) => a + b, 0) / stepRetentions.length) * 10) / 10
    : 0;
  const cumulative = top > 0
    ? Math.round((f.endlineAssessed / top) * 1000) / 10
    : 0;
  return (
    <Card className={className}>
      <CardHeader title="Conversion Funnel" subtitle="From selection to outcomes." />
      <ul className="flex flex-col gap-2.5">
        {FUNNEL_ROWS.map((step) => (
          <li key={step.label}>
            <div className="flex items-center justify-between text-[11.5px]">
              <span style={{ color: TEXT_MUTED }}>{step.label}</span>
              <span style={{ color: TEXT, fontWeight: 700 }}>{step.value.toLocaleString()}</span>
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
        <span style={{ color: TEXT_MUTED }}>Step retention <span style={{ color: TEXT, fontWeight: 700 }}>{stepRetention.toFixed(1)}%</span></span>
        <span style={{ color: TEXT_MUTED }}>Cumulative <span style={{ color: TEXT, fontWeight: 700 }}>{cumulative.toFixed(1)}%</span></span>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Teaching Quality — fidelity / partial / low split + 12-month trend
   sourced from teacher_lesson_observations. Anchored to #teaching-quality
   so the sidebar nav + lower content tabs both land here.
   ──────────────────────────────────────────────────────────────────── */
function TeachingQualitySection({ snapshot }: { snapshot: DashboardSnapshot }) {
  const obs = snapshot.observation;
  const total = obs.totalSubmitted;
  const bands: { label: string; count: number; pct: number; color: string }[] = total > 0 ? [
    { label: "Fidelity", count: obs.fidelityCount, pct: Math.round((obs.fidelityCount / total) * 1000) / 10, color: "#16a34a" },
    { label: "Partial", count: obs.partialCount, pct: Math.round((obs.partialCount / total) * 1000) / 10, color: "#f59e0b" },
    { label: "Low", count: obs.lowCount, pct: Math.round((obs.lowCount / total) * 1000) / 10, color: "#dc2626" },
  ] : [];

  // 12-month trend max for bar scaling
  const maxTrend = obs.monthlyTrend.reduce(
    (m, r) => Math.max(m, r.fidelityCount + r.partialCount + r.lowCount),
    0,
  );

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-bold leading-tight" style={{ color: TEXT }}>Teaching Quality</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>
            Fidelity rating from submitted teacher-lesson observations. Live from the observation register.
          </p>
        </div>
        <Link href="/portal/observations" className="text-[11.5px] font-bold inline-flex items-center gap-1" style={{ color: TEAL }}>
          Open observations <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-[12.5px] text-gray-600">No submitted observations yet.</p>
          <p className="text-[11px] text-gray-500 mt-1">Once teachers&apos; lesson observations are submitted, fidelity / partial / low ratings will surface here with a 12-month trend.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
          {/* Headline split */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: TEXT_SUBTLE }}>
              Headline split
            </p>
            <p className="text-[34px] font-bold leading-none" style={{ color: TEAL }}>
              {obs.fidelityPct}<span className="text-[18px] text-gray-500">% fidelity</span>
            </p>
            <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>
              from {total.toLocaleString()} submitted observation{total === 1 ? "" : "s"}
            </p>
            {/* Stacked bar */}
            <div className="mt-3 flex h-3 rounded-full overflow-hidden" style={{ background: BORDER }}>
              {bands.map((b) => b.count > 0 ? (
                <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label}: ${b.count} (${b.pct}%)`} />
              ) : null)}
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {bands.map((b) => (
                <li key={b.label} className="flex items-center justify-between text-[11.5px]">
                  <span className="inline-flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: b.color, display: "inline-block" }} />
                    {b.label}
                  </span>
                  <span style={{ color: TEXT, fontWeight: 700 }}>{b.count.toLocaleString()} <span style={{ color: TEXT_SUBTLE, fontWeight: 500 }}>({b.pct}%)</span></span>
                </li>
              ))}
            </ul>
          </div>

          {/* 12-month trend */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: TEXT_SUBTLE }}>
              12-month trend
            </p>
            {obs.monthlyTrend.length === 0 ? (
              <p className="text-[12px]" style={{ color: TEXT_SUBTLE }}>No monthly data yet.</p>
            ) : (
              <ul className="grid grid-cols-12 gap-1.5 items-end h-[140px]">
                {obs.monthlyTrend.slice(-12).map((m) => {
                  const total = m.fidelityCount + m.partialCount + m.lowCount;
                  const heightPct = maxTrend > 0 ? (total / maxTrend) * 100 : 0;
                  const fSh = total > 0 ? (m.fidelityCount / total) * heightPct : 0;
                  const pSh = total > 0 ? (m.partialCount / total) * heightPct : 0;
                  const lSh = total > 0 ? (m.lowCount / total) * heightPct : 0;
                  return (
                    <li key={m.month} className="flex flex-col items-center gap-1 h-full" title={`${m.month}: ${m.fidelityCount}/${m.partialCount}/${m.lowCount}`}>
                      <div className="flex flex-col-reverse w-full flex-1 rounded-md overflow-hidden" style={{ background: "#f1f5f9" }}>
                        <div style={{ height: `${fSh}%`, background: "#16a34a" }} />
                        <div style={{ height: `${pSh}%`, background: "#f59e0b" }} />
                        <div style={{ height: `${lSh}%`, background: "#dc2626" }} />
                      </div>
                      <span className="text-[9px]" style={{ color: TEXT_SUBTLE }}>{m.month.slice(5)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
   What Changed This Period
   ──────────────────────────────────────────────────────────────────── */
function WhatChangedStrip({ snapshot }: { snapshot: DashboardSnapshot }) {
  const CHANGE_GRID = buildChangeGrid(snapshot);
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
  // Each public dashboard tab opens its own dedicated public page where
  // available; falls back to a section anchor for tabs not yet split out.
  const tabs: { label: string; href: string }[] = [
    { label: "Learning Outcomes", href: "/live-dashboard/learning-outcomes" },
    { label: "Reading Levels", href: "/live-dashboard/learning-outcomes#reading-levels" },
    { label: "Implementation Funnel", href: "#funnel" },
    { label: "Teaching Quality", href: "/live-dashboard/learning-outcomes#teaching-quality" },
    { label: "Equity & Segments", href: "/live-dashboard/learning-outcomes#equity" },
    { label: "Data Completeness", href: "/live-dashboard/learning-outcomes#data-completeness" },
    { label: "Intelligence", href: "/live-dashboard/learning-outcomes#intelligence" },
    { label: "Training Ops", href: "#training-ops" },
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-1 px-2 py-2"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, boxShadow: SHADOW_LOW }}
    >
      {tabs.map((t, i) => {
        const active = i === 0;
        return (
          <a
            key={t.label}
            href={t.href}
            className="px-3 py-1.5 text-[12px] font-bold transition"
            style={{
              borderRadius: 999,
              background: active ? TEAL : "transparent",
              color: active ? "#fff" : TEXT_MUTED,
            }}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Learning Outcomes by Domain — tile grid (no tables)
   ──────────────────────────────────────────────────────────────────── */
function LearningOutcomesByDomain({ snapshot }: { snapshot: DashboardSnapshot }) {
  // Match each repo domain row to its display icon.
  const ICONS: Record<string, LucideIcon> = {
    phonemic_awareness: Headphones,
    grapheme_phoneme_correspondence: TypeIcon,
    blending_decoding: Combine,
    word_recognition_fluency: Eye,
    sentence_paragraph_construction: AlignLeft,
    comprehension: BookCopy,
  };
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
        {snapshot.domainMastery.map((d) => {
          const Icon = ICONS[d.domainKey] ?? BookCopy;
          const hasData = d.total > 0;
          return (
            <div
              key={d.domainKey}
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
              <p className="text-[12px] font-bold mt-2 leading-snug" style={{ color: TEXT }}>{d.label}</p>
              <p className="text-[18px] font-bold mt-2" style={{ color: hasData ? TEXT : TEXT_SUBTLE }}>
                {hasData ? `${d.masteredPct}%` : "—"}
              </p>
              <p className="text-[10.5px] mt-0.5" style={{ color: TEXT_SUBTLE }}>
                {hasData ? `${d.mastered.toLocaleString()} / ${d.total.toLocaleString()} mastered` : "No baseline"}
              </p>
            </div>
          );
        })}
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

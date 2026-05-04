import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  Heart, ChevronDown, Info, ShieldCheck, Building2, Users, GraduationCap,
  ClipboardCheck, MessageCircle, PieChart as PieIcon,
  Globe, Target, AlertTriangle, Search, Plus, Minus, Crosshair,
  TrendingUp, FileText, Download, Share2, BookOpen, ChevronRight,
  ClipboardList, type LucideIcon,
} from "lucide-react";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Public Live Impact Dashboard | Ozeki Reading Bridge Foundation",
  description: "Real-time, evidence-based literacy outcomes and programme implementation across Uganda.",
};

// PublicImpactMapExplorer reads useSearchParams() — opt out of static
// generation so Next.js 15 doesn't bail prerender on the map's CSR hook.
export const dynamic = "force-dynamic";

const TEAL        = "#066a67";
const TEAL_DARK   = "#044f4d";
const TEAL_DEEP   = "#033f3e";
const TEAL_SOFT   = "#e6f3f2";
const ORANGE      = "#ff7235";
const ORANGE_SOFT = "#fff0e8";

const NAV = [
  { label: "Home",            href: "/" },
  { label: "Live Dashboard",  href: "/impact/dashboard", active: true },
  { label: "Programs",        href: "/programs",     hasMenu: true },
  { label: "Online Training", href: "/training" },
  { label: "Impact",          href: "/impact",       hasMenu: true },
  { label: "Book Us Now",     href: "/contact" },
  { label: "About Us",        href: "/about" },
];

const KPIS: { label: string; value: string; trend?: string; sub?: string; subTone?: "warn" | "muted"; icon: LucideIcon; iconBg: string; iconFg: string }[] = [
  { label: "Schools Supported",     value: "172",       trend: "↗ +12 vs last period", icon: Building2,     iconBg: TEAL_SOFT,   iconFg: TEAL },
  { label: "Reading Teachers",      value: "0",         sub: "0M / 0F",                subTone: "warn",  icon: Users,         iconBg: ORANGE_SOFT, iconFg: ORANGE },
  { label: "Est. Learners Reached", value: "120",       trend: "↗ +18 vs last period", icon: GraduationCap, iconBg: TEAL_SOFT,   iconFg: TEAL },
  { label: "Learners Assessed",     value: "0",         sub: "0 unique direct",        subTone: "muted", icon: ClipboardCheck, iconBg: TEAL_SOFT,   iconFg: TEAL },
  { label: "Coaching Visits",       value: "0",         sub: "— No change",            subTone: "muted", icon: MessageCircle, iconBg: TEAL_SOFT,   iconFg: TEAL },
  { label: "Assessments (B/P/E)",   value: "0 / 0 / 0", sub: "— No change",            subTone: "muted", icon: PieIcon,       iconBg: ORANGE_SOFT, iconFg: ORANGE },
];

const CHANGE_GRID: { label: string; value: string; sub: string; subTone: "up" | "muted" | "warn"; icon: LucideIcon }[] = [
  { label: "Schools supported",        value: "172",  sub: "↗ +12",   subTone: "up",    icon: Building2 },
  { label: "Learners assessed",        value: "0",    sub: "— 0",     subTone: "muted", icon: GraduationCap },
  { label: "Teachers supported",       value: "0",    sub: "— 0",     subTone: "muted", icon: Users },
  { label: "Teaching quality change",  value: "—",    sub: "Data n/a", subTone: "warn", icon: TrendingUp },
  { label: "Non-reader reduction",     value: "—",    sub: "Data n/a", subTone: "warn", icon: BookOpen },
  { label: "20+ CWPM gain",            value: "—",    sub: "Data n/a", subTone: "warn", icon: TrendingUp },
  { label: "Story sessions change",    value: "—",    sub: "Data n/a", subTone: "warn", icon: BookOpen },
  { label: "Assessment completion",    value: "0.0%", sub: "0.0 pp",   subTone: "muted", icon: ClipboardList },
  { label: "At/above benchmark",       value: "—",    sub: "Data n/a", subTone: "warn", icon: Target },
  { label: "Moved up 1+ level",        value: "—",    sub: "Data n/a", subTone: "warn", icon: TrendingUp },
  { label: "Online sessions",          value: "0",    sub: "— 0",      subTone: "muted", icon: Globe },
  { label: "Teachers trained",         value: "0",    sub: "— 0",      subTone: "muted", icon: GraduationCap },
];

const FUNNEL: { label: string; value: number; pct: string; primary?: boolean }[] = [
  { label: "Schools trained",          value: 1, pct: "100.0%", primary: true },
  { label: "Coached / visited",        value: 0, pct: "0.0%" },
  { label: "Baseline assessed",        value: 0, pct: "0.0%" },
  { label: "Endline assessed",         value: 0, pct: "0.0%" },
  { label: "Story active schools",     value: 0, pct: "0.0%" },
  { label: "Online sessions reached",  value: 0, pct: "0.0%" },
];

const TABS = [
  "Learning Outcomes",
  "Reading Levels",
  "Implementation Funnel",
  "Teaching Quality",
  "Equity & Segments",
  "Data Completeness",
  "Intelligence",
  "Training Ops",
];

const DOMAINS: { title: string; icon: LucideIcon }[] = [
  { title: "Phonemic Awareness (I)",                icon: BookOpen },
  { title: "Grapheme-Phoneme Correspondence (I)",   icon: BookOpen },
  { title: "Blending & Decoding (I)",                icon: BookOpen },
  { title: "Word Recognition & Fluency (I)",         icon: BookOpen },
  { title: "Sentence & Paragraph Construction (I)",  icon: BookOpen },
  { title: "Comprehension (I)",                      icon: BookOpen },
];

/* ──────────────────────────────────────────────────────────────────── */

export default function PublicLiveImpactDashboardPage() {
  return (
    <div className="bg-[#f4f7fa] min-h-screen text-gray-900" style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      <LiveStatusTopBar />
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-6 pt-6 pb-10 space-y-5">
        <DashboardHero />
        <KpiRow />

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
          <div className="space-y-4">
            <GeographyFilterCard />
            <DataTrustCard />
            <AtRiskRadarCard />
          </div>
          <div className="space-y-4">
            <WhereWeWorkCard />
            <WhatChangedCard />
          </div>
          <div className="space-y-4">
            <LearningGenderParityCard />
            <ReadingProgressCard />
            <ConversionFunnelCard />
          </div>
        </div>

        <LearningOutcomesTabs />
        <LearningOutcomesGrid />
      </main>
      <BottomTrustBar />
      <SiteFooter />
    </div>
  );
}

/* ── Top live bar ──────────────────────────────────────────────────── */
function LiveStatusTopBar() {
  return (
    <div style={{ background: TEAL_DEEP }} className="text-white text-[12px]">
      <div className="max-w-[1280px] mx-auto px-6 h-9 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />
            <strong className="font-bold tracking-wide">LIVE</strong>
          </span>
          <span className="text-white/75">• Data refreshed 5 min ago</span>
        </div>
        <div className="hidden md:block text-white/85">
          We verify every classroom milestone with real data across Uganda.
        </div>
        <Link href="/about/our-story" className="inline-flex items-center gap-1 text-white/85 hover:text-white">
          How it works <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  );
}

/* ── Public site header ────────────────────────────────────────────── */
function PublicSiteHeader() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/photos/logo.png" alt="Ozeki" width={40} height={40} className="rounded-lg object-contain" priority />
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight" style={{ color: TEAL }}>Ozeki Reading Bridge Foundation</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Practical Phonics. Strong Teachers. Confident Readers.</p>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-6 text-[13px] font-semibold text-gray-700">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-1 transition relative"
              style={item.active ? { color: TEAL } : undefined}
            >
              {item.label}
              {item.hasMenu && <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />}
              {item.active && (
                <span aria-hidden className="absolute -bottom-[26px] left-0 right-0 h-[2px] mx-auto w-12" style={{ background: TEAL }} />
              )}
            </Link>
          ))}
        </nav>
        <Link
          href="/donate"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-white text-[13px] font-bold shadow-sm shrink-0"
          style={{ background: ORANGE }}
        >
          Donate
        </Link>
      </div>
    </header>
  );
}

/* ── Dashboard hero (title + filters + actions) ────────────────────── */
function DashboardHero() {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-end">
        <div>
          <h1
            className="text-[30px] md:text-[36px] font-extrabold tracking-tight text-gray-900 leading-tight"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Public Live Impact Dashboard
          </h1>
          <p className="text-[13.5px] text-gray-600 leading-relaxed mt-1.5 max-w-[600px]">
            Real-time, evidence-based literacy outcomes and programme implementation across Uganda.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 min-w-[520px]">
          <FilterField label="Year"      value="FY 2024/2025" />
          <FilterField label="View By"   value="All Metrics" />
          <FilterField label="Program"   value="All Programs" />
          <FilterField label="Geography" value="Uganda (All)" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2.5">
        <button type="button" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border-2 text-[13px] font-bold transition" style={{ borderColor: TEAL, color: TEAL }}>
          <FileText className="h-4 w-4" strokeWidth={2} /> Open Report
        </button>
        <button type="button" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-[13px] font-bold shadow-sm transition" style={{ background: TEAL }}>
          <Download className="h-4 w-4" strokeWidth={2} /> Download PDF <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border-2 text-[13px] font-bold transition" style={{ borderColor: TEAL, color: TEAL }}>
          <Share2 className="h-4 w-4" strokeWidth={2} /> Share
        </button>
      </div>
    </section>
  );
}

function FilterField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 px-3 py-2 bg-gray-50/50">
      <p className="text-[10.5px] font-semibold text-gray-500 leading-tight">{label}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-[12.5px] font-semibold text-gray-900 truncate">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      </div>
    </div>
  );
}

/* ── KPI row ───────────────────────────────────────────────────────── */
function KpiRow() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {KPIS.map((k) => {
        const Icon = k.icon;
        return (
          <article key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl shrink-0" style={{ background: k.iconBg }}>
                <Icon className="h-5 w-5" style={{ color: k.iconFg }} strokeWidth={2} />
              </span>
              <p className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider text-right leading-snug">{k.label}</p>
            </div>
            <p className="text-[26px] font-extrabold text-gray-900 leading-none tracking-tight">{k.value}</p>
            {k.trend ? (
              <p className="text-[11px] font-semibold mt-2" style={{ color: TEAL }}>
                {k.trend}
              </p>
            ) : k.sub ? (
              <p className={`text-[11px] mt-2 ${k.subTone === "warn" ? "font-bold" : "text-gray-500"}`} style={k.subTone === "warn" ? { color: ORANGE } : undefined}>
                {k.sub}
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

/* ── Geography filter card (left rail #1, dark teal) ───────────────── */
function GeographyFilterCard() {
  return (
    <article className="rounded-2xl text-white p-4 shadow-md" style={{ background: `linear-gradient(150deg, ${TEAL_DEEP} 0%, ${TEAL_DARK} 100%)` }}>
      <div className="flex items-start gap-3 mb-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12">
          <Globe className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-[14px] font-bold leading-tight">Explore by Geography</h3>
          <p className="text-[11px] text-white/70 leading-snug mt-0.5">Drill down to see impact where it matters.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Period",     value: "FY 2024/2025" },
          { label: "Region",     value: "All regions" },
          { label: "Sub-region", value: "All sub-regions" },
          { label: "District",   value: "All districts" },
          { label: "School",     value: "All schools" },
        ].map((f) => (
          <label key={f.label} className="block">
            <span className="text-[10.5px] font-semibold text-white/70 uppercase tracking-wider">{f.label}</span>
            <span className="mt-1 inline-flex items-center justify-between w-full h-9 px-3 rounded-md bg-white text-[12.5px] font-semibold text-gray-800">
              {f.value}
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="h-9 rounded-md text-[12px] font-bold bg-white/10 border border-white/20 text-white hover:bg-white/15 transition">
          Reset Filters
        </button>
        <button type="button" className="h-9 rounded-md text-[12px] font-bold text-white shadow-sm" style={{ background: ORANGE }}>
          Apply Filters
        </button>
      </div>
    </article>
  );
}

/* ── Data Trust & Action Center (left rail #2) ─────────────────────── */
function DataTrustCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: TEAL_SOFT, color: TEAL }}>
          <ShieldCheck className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-[14px] font-bold text-gray-900 leading-tight">Data Trust &amp; Action Center</h3>
          <p className="text-[11px] text-gray-500 leading-snug mt-0.5">Transparency you can trust.</p>
        </div>
      </div>
      <ul className="text-[12px] space-y-1.5 mb-4">
        <li className="flex justify-between"><span className="text-gray-500">Completeness</span><span className="font-bold" style={{ color: TEAL }}>Complete</span></li>
        <li className="flex justify-between"><span className="text-gray-500">Sample size (n)</span><span className="font-bold text-gray-900">172</span></li>
        <li className="flex justify-between"><span className="text-gray-500">Last updated</span><span className="font-semibold text-gray-700">28/04/2026, 20:15:03</span></li>
      </ul>
      <div className="space-y-2">
        <Link href="/sponsor-a-district" className="flex items-center justify-center gap-2 h-9 rounded-md text-white text-[12px] font-bold shadow-sm" style={{ background: TEAL }}>
          <Heart className="h-3.5 w-3.5" fill="white" strokeWidth={0} /> Sponsor a District
        </Link>
        <Link href="/transparency" className="flex items-center justify-center gap-2 h-9 rounded-md bg-white border-2 text-[12px] font-bold transition" style={{ borderColor: TEAL, color: TEAL }}>
          <Download className="h-3.5 w-3.5" strokeWidth={2} /> Download Reports
        </Link>
        <Link href="/stories" className="flex items-center justify-center gap-2 h-9 rounded-md bg-white border-2 text-[12px] font-bold transition" style={{ borderColor: TEAL, color: TEAL }}>
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} /> Read Change Stories
        </Link>
      </div>
    </article>
  );
}

/* ── At-Risk Radar (left rail #3) ──────────────────────────────────── */
function AtRiskRadarCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: ORANGE_SOFT, color: ORANGE }}>
          <AlertTriangle className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-[14px] font-bold text-gray-900 leading-tight">At-Risk Radar<br />&amp; 12-Month Projection</h3>
          <p className="text-[10.5px] text-gray-500 leading-snug mt-0.5">Auto-generated from materialised KPI snapshots — refreshed by triggers.</p>
        </div>
      </div>
      <div className="rounded-xl p-4 border" style={{ background: ORANGE_SOFT, borderColor: "#ffd8c4" }}>
        <p className="text-[11px] text-gray-700 font-semibold">National Reading Composite</p>
        <p className="text-[28px] font-extrabold text-gray-900 leading-none mt-1">
          0.00 <span className="text-[14px] font-bold text-gray-500">/ 100</span>
        </p>
        <p className="inline-flex items-center mt-3 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold tracking-wider uppercase text-white" style={{ background: ORANGE }}>
          Insufficient Confidence
        </p>
        <p className="text-[11px] text-gray-600 mt-3 leading-snug">
          Need at least 2 quarterly data points for a projection.
        </p>
        <Link href="#" className="text-[11.5px] font-bold mt-3 inline-flex items-center gap-1" style={{ color: ORANGE }}>
          View details <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
        </Link>
      </div>
    </article>
  );
}

/* ── Where We Work map (center top) ────────────────────────────────── */
function WhereWeWorkCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900 leading-tight">Where We Work (Live)</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Coverage of our programmes across Uganda.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <SegBtn label="District" active />
          <SegBtn label="Sub-region" />
          <span className="mx-1 w-px h-5 bg-gray-200" />
          <SegBtn label="Coverage" tone="orange" active />
          <SegBtn label="Improvement" />
          <SegBtn label="Fidelity" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-[280px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search district…"
            className="w-full h-9 pl-8 pr-3 rounded-md bg-gray-50 border border-gray-200 text-[12px] placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{ outlineColor: TEAL }}
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-white border border-gray-200"><Plus className="h-4 w-4 text-gray-600" /></span>
          <span className="grid h-8 w-8 place-items-center rounded-md bg-white border border-gray-200"><Minus className="h-4 w-4 text-gray-600" /></span>
          <span className="grid h-8 w-8 place-items-center rounded-md bg-white border border-gray-200"><Crosshair className="h-4 w-4 text-gray-600" /></span>
        </div>
      </div>
      {/* Existing live map — full functionality preserved.
          Wrapped in Suspense because PublicImpactMapExplorer reads
          useSearchParams() and Next.js 15 requires that to live inside a
          Suspense boundary at static-generation time. */}
      <div className="rounded-xl overflow-hidden border border-gray-100">
        <Suspense fallback={<div className="h-[420px] bg-gray-50 grid place-items-center text-[12px] text-gray-400">Loading map…</div>}>
          <PublicImpactMapExplorer compact />
        </Suspense>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
        <span>Lower coverage</span>
        <div className="flex gap-0.5">
          {[0.15, 0.3, 0.5, 0.7, 0.9].map((o) => (
            <span key={o} className="h-2.5 w-7 rounded-sm" style={{ background: TEAL, opacity: o }} />
          ))}
        </div>
        <span>Higher coverage</span>
      </div>
      {/* Mini stats row */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
        <MiniStat icon={TrendingUp}    label="Most improved"     value="Central Region" extra="↗ +18%" />
        <MiniStat icon={Globe}         label="Top coverage"      value="Central Region" extra="68%" />
        <MiniStat icon={AlertTriangle} label="Priority districts" value="20"             extra="Need targeted support" extraTone="warn" />
        <MiniStat icon={Building2}     label="Active schools"    value="172"            extra="Across all regions" />
      </div>
    </article>
  );
}

function SegBtn({ label, active = false, tone = "teal" as "teal" | "orange" }: { label: string; active?: boolean; tone?: "teal" | "orange" }) {
  const c = tone === "orange" ? ORANGE : TEAL;
  return (
    <span
      className={`inline-flex items-center px-2.5 h-7 rounded-md text-[11px] font-bold cursor-default transition ${active ? "text-white" : "bg-gray-50 text-gray-600 border border-gray-200"}`}
      style={active ? { background: c } : undefined}
    >
      {label}
    </span>
  );
}

function MiniStat({ icon: Icon, label, value, extra, extraTone }: { icon: LucideIcon; label: string; value: string; extra: string; extraTone?: "warn" | undefined }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: TEAL_SOFT, color: TEAL }}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] text-gray-500 leading-tight">{label}</p>
        <p className="text-[13px] font-bold text-gray-900 leading-tight mt-0.5 truncate">{value}</p>
        <p className={`text-[10.5px] mt-0.5 ${extraTone === "warn" ? "font-bold" : "text-gray-400"}`} style={extraTone === "warn" ? { color: ORANGE } : undefined}>{extra}</p>
      </div>
    </div>
  );
}

/* ── What Changed This Period ──────────────────────────────────────── */
function WhatChangedCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="mb-3">
        <h3 className="text-[14px] font-bold text-gray-900 leading-tight">What Changed This Period</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Key movements in outcomes and implementation.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
        {CHANGE_GRID.map((row) => {
          const Icon = row.icon;
          const subColor =
            row.subTone === "up" ? TEAL : row.subTone === "warn" ? ORANGE : "#94a3b8";
          return (
            <div key={row.label} className="flex items-start gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: row.subTone === "warn" ? ORANGE_SOFT : TEAL_SOFT, color: row.subTone === "warn" ? ORANGE : TEAL }}>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] text-gray-500 leading-tight truncate">{row.label}</p>
                <p className="text-[15px] font-extrabold text-gray-900 leading-tight">{row.value}</p>
                <p className="text-[10.5px] font-semibold mt-0.5" style={{ color: subColor }}>{row.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Link href="/transparency" className="text-[11.5px] font-bold mt-4 inline-flex items-center gap-1" style={{ color: TEAL }}>
        View all indicators <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
      </Link>
    </article>
  );
}

/* ── Learning & Gender Parity (right rail #1) ──────────────────────── */
function LearningGenderParityCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-[14px] font-bold text-gray-900 leading-tight">Learning &amp; Gender Parity</h3>
      <p className="text-[11px] text-gray-500 mt-0.5 mb-3">Assessment outcomes &amp; parity snapshot.</p>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div>
          <p className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mb-2">Grade-band Reading<br />Improvement (vs baseline)</p>
          <ul className="space-y-1.5 text-[11.5px]">
            {[
              ["Early (P1–P2)", "—"],
              ["Emergent (P3–P4)", "—"],
              ["Developing (P5–P6)", "—"],
              ["Fluent (P7+)", "—"],
            ].map(([label, val]) => (
              <li key={label} className="flex justify-between">
                <span className="text-gray-600">{label}</span>
                <span className="font-bold text-gray-700">{val}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-gray-100 pt-1.5 mt-1.5">
              <span className="text-gray-700 font-bold">All grades</span>
              <span className="font-extrabold" style={{ color: TEAL }}>0%</span>
            </li>
          </ul>
          <p className="text-[10.5px] text-gray-400 mt-1">No change</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Gender Parity<br />(Learners)</p>
          <ParityDonut />
          <div className="text-[10.5px] mt-2 space-y-0.5 self-start">
            <p className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: TEAL }} /> Male <span className="text-gray-500 ml-1">0 (0%)</span>
            </p>
            <p className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} /> Female <span className="text-gray-500 ml-1">0 (0%)</span>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ParityDonut() {
  const r = 26;
  const c = 2 * Math.PI * r;
  const half = c / 2;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={TEAL}   strokeWidth="9" strokeDasharray={`${half} ${c - half}`} strokeDashoffset={c / 4} transform="rotate(-90 40 40)" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={ORANGE} strokeWidth="9" strokeDasharray={`${half} ${c - half}`} strokeDashoffset={c / 4 - half} transform="rotate(-90 40 40)" />
      <text x="40" y="36" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0f172a">0%</text>
      <text x="40" y="50" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0f172a">0%</text>
    </svg>
  );
}

/* ── Reading Progress Tracker (right rail #2) ──────────────────────── */
function ReadingProgressCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-[14px] font-bold text-gray-900 leading-tight">Reading Progress Tracker</h3>
      <p className="text-[11px] text-gray-500 mt-0.5 mb-3">How learners are progressing.</p>
      <ul className="text-[11.5px]">
        {[
          { label: "Matched baseline-to-latest learners", value: "—" },
          { label: "Moved up 1+ reading level",            value: "—" },
          { label: "Tracked reading stages",               value: "0" },
        ].map((row) => (
          <li key={row.label} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">
            <span className="text-gray-600">{row.label}</span>
            <span className="font-bold text-gray-900 shrink-0">{row.value}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] text-gray-400 mt-2">Stage bands computed</p>
    </article>
  );
}

/* ── Implementation Conversion Funnel (right rail #3) ──────────────── */
function ConversionFunnelCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-[14px] font-bold text-gray-900 leading-tight">Implementation Conversion Funnel</h3>
      <p className="text-[11px] text-gray-500 mt-0.5 mb-3">From activation to outcomes.</p>
      <ul className="space-y-2.5">
        {FUNNEL.map((row) => (
          <li key={row.label} className="grid grid-cols-[1fr_36px_60px] items-center gap-2 text-[11px]">
            <span className="text-gray-700 truncate">{row.label}</span>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex items-center">
              <div
                className="h-full rounded-full"
                style={{
                  width: row.primary ? "100%" : "10%",
                  background: row.primary ? TEAL : ORANGE,
                }}
              />
            </div>
            <span className="font-bold text-gray-900 text-right">{row.value}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] text-gray-500 mt-3 pt-3 border-t border-gray-100">
        Step retention: <strong className="text-gray-900">0.0%</strong> &nbsp;•&nbsp; Cumulative: <strong className="text-gray-900">0.0%</strong>
      </p>
    </article>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────── */
function LearningOutcomesTabs() {
  return (
    <nav className="rounded-xl p-1.5 inline-flex flex-wrap items-center gap-1" style={{ background: ORANGE_SOFT }}>
      {TABS.map((t, i) => (
        <button
          key={t}
          type="button"
          className={`h-9 px-4 rounded-lg text-[12.5px] font-bold transition ${i === 0 ? "bg-white text-gray-900 shadow-sm" : "text-gray-700 hover:bg-white/50"}`}
        >
          {t}
        </button>
      ))}
    </nav>
  );
}

/* ── Learning Outcomes by Domain ───────────────────────────────────── */
function LearningOutcomesGrid() {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-gray-900">Learning Outcomes by Domain</h3>
        <p className="text-[11.5px] text-gray-500 mt-0.5">
          Scores reflect average learner performance. Benchmark interpretation follows mastery progression by domain.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {DOMAINS.map((d) => {
          const Icon = d.icon;
          return (
            <article key={d.title} className="rounded-xl border border-gray-100 p-3.5 bg-gray-50/30">
              <div className="flex items-start gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg shrink-0" style={{ background: TEAL_SOFT, color: TEAL }}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-gray-900 leading-tight">{d.title}</p>
                  <p className="text-[18px] font-extrabold text-gray-900 mt-1 leading-none">—</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-[10.5px] text-gray-500">
                <li>Baseline: <span className="font-semibold text-gray-700">—</span></li>
                <li>Change: <span className="font-semibold text-gray-700">—</span></li>
                <li>n = <span className="font-semibold text-gray-700">0</span></li>
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ── Bottom trust/status bar ───────────────────────────────────────── */
function BottomTrustBar() {
  return (
    <footer className="text-white text-[12px]" style={{ background: TEAL_DEEP }}>
      <div className="max-w-[1280px] mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="inline-flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12 shrink-0">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-bold leading-tight">Transparent. Evidence-based. Accountable.</p>
            <p className="text-white/75 text-[11px] mt-0.5">We publish what we do and what we learn.</p>
          </div>
        </div>
        <div className="inline-flex items-start gap-3 md:justify-self-center">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12 shrink-0">
            <ClipboardList className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-bold leading-tight">Last updated: 28/04/2026, 20:15:09</p>
            <p className="text-white/75 text-[11px] mt-0.5">Live data from programmes across Uganda.</p>
          </div>
        </div>
        <div className="inline-flex items-start gap-3 md:justify-self-end">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12 shrink-0">
            <FileText className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-bold leading-tight">Open report &nbsp;•&nbsp; Download PDF &nbsp;•&nbsp; Share</p>
            <p className="text-white/75 text-[11px] mt-0.5">Explore the full story behind the numbers.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

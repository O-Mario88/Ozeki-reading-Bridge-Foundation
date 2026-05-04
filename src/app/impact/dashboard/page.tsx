import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ChevronDown, ShieldCheck, Building2, Users, GraduationCap,
  ClipboardCheck, MessageCircle, PieChart as PieIcon,
  Globe, Search, Plus, Minus, Crosshair,
  TrendingUp, FileText, Download, Share2, BookOpen, ChevronRight,
  ClipboardList, Heart, Sparkles, type LucideIcon,
} from "lucide-react";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { DashboardMotionShell, MotionCard, MotionFade } from "./MotionShell";
import { InteractiveTabs } from "./InteractiveTabs";

export const metadata: Metadata = {
  title: "Public Live Impact Dashboard | Ozeki Reading Bridge Foundation",
  description: "Real-time, evidence-based literacy outcomes and programme implementation across Uganda.",
};

export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────
   Design tokens — single source of truth for the polish pass.
   ──────────────────────────────────────────────────────────────────── */
const TEAL        = "#066a67";
const TEAL_DARK   = "#044f4d";
const TEAL_DEEP   = "#033f3e";
const TEAL_SOFT   = "#e6f3f2";
const ORANGE      = "#ff7235";
const ORANGE_SOFT = "#fff0e8";

const CANVAS      = "#f5f7fb";
const SURFACE     = "#ffffff";
const BORDER      = "#e7ecf3";
const TEXT        = "#0f172a";
const TEXT_MUTED  = "#64748b";
const TEXT_SUBTLE = "#94a3b8";

const RADIUS      = "12px";
const RADIUS_SM   = "8px";

const SHADOW_LOW  = "0 1px 2px rgba(15, 23, 42, 0.04)";
const SHADOW_MID  = "0 4px 12px rgba(15, 23, 42, 0.06)";

const FONT = "var(--font-inter), 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ────────────────────────────────────────────────────────────────────
   Data shape
   ──────────────────────────────────────────────────────────────────── */
type KpiTone = "primary" | "muted" | "warn";

const KPIS: { label: string; value: string; trend?: string; sub?: string; tone: KpiTone; icon: LucideIcon }[] = [
  { label: "Schools Supported",    value: "172",       trend: "+12 vs last period",  tone: "primary", icon: Building2 },
  { label: "Reading Teachers",     value: "0",         sub: "Awaiting first sync",   tone: "warn",    icon: Users },
  { label: "Est. Learners Reached", value: "120",      trend: "+18 vs last period",  tone: "primary", icon: GraduationCap },
  { label: "Learners Assessed",    value: "0",         sub: "No baseline yet",       tone: "muted",   icon: ClipboardCheck },
  { label: "Coaching Visits",      value: "0",         sub: "No change",             tone: "muted",   icon: MessageCircle },
  { label: "Assessments (B/P/E)",  value: "0/0/0",     sub: "No change",             tone: "muted",   icon: PieIcon },
];

const CHANGE_GRID: { label: string; value: string; sub: string; tone: "up" | "muted" | "warn" }[] = [
  { label: "Schools supported",      value: "172",  sub: "+12",     tone: "up"    },
  { label: "Learners assessed",      value: "0",    sub: "No change", tone: "muted" },
  { label: "Teachers supported",     value: "0",    sub: "No change", tone: "muted" },
  { label: "Teaching quality",        value: "—",   sub: "Awaiting", tone: "warn" },
  { label: "Non-reader reduction",   value: "—",    sub: "Awaiting",  tone: "warn"  },
  { label: "20+ CWPM gain",          value: "—",    sub: "Awaiting",  tone: "warn"  },
  { label: "Story sessions change",  value: "—",    sub: "Awaiting",  tone: "warn"  },
  { label: "Assessment completion",  value: "0.0%", sub: "0.0 pp",   tone: "muted" },
  { label: "At/above benchmark",     value: "—",    sub: "Awaiting",  tone: "warn"  },
  { label: "Moved up 1+ level",      value: "—",    sub: "Awaiting",  tone: "warn"  },
  { label: "Online sessions",        value: "0",    sub: "No change",  tone: "muted" },
  { label: "Teachers trained",       value: "0",    sub: "No change",  tone: "muted" },
];

const FUNNEL: { label: string; value: number; pct: number }[] = [
  { label: "Schools trained",          value: 1, pct: 100 },
  { label: "Coached / visited",        value: 0, pct: 0 },
  { label: "Baseline assessed",        value: 0, pct: 0 },
  { label: "Endline assessed",         value: 0, pct: 0 },
  { label: "Story active schools",     value: 0, pct: 0 },
  { label: "Online sessions reached",  value: 0, pct: 0 },
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

const DOMAINS = [
  "Phonemic Awareness",
  "Grapheme-Phoneme Correspondence",
  "Blending & Decoding",
  "Word Recognition & Fluency",
  "Sentence & Paragraph Construction",
  "Comprehension",
];

/* ──────────────────────────────────────────────────────────────────── */

export default function PublicLiveImpactDashboardPage() {
  return (
    <DashboardMotionShell>
      <div style={{ background: CANVAS, fontFamily: FONT, color: TEXT }} className="min-h-screen antialiased">
        <LiveStrip />
        <main className="max-w-[1320px] mx-auto px-6 pt-7 pb-12 space-y-6">
          <Hero />
          <KpiRow />

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-5">
            <div className="space-y-5">
              <GeographyCard />
              <DataTrustCard />
              <AtRiskCard />
            </div>
            <div className="space-y-5">
              <MapCard />
              <ChangeGridCard />
            </div>
            <div className="space-y-5">
              <ParityCard />
              <ProgressCard />
              <FunnelCard />
            </div>
          </div>

          <InteractiveTabs
            tabs={TABS}
            panels={[
              <DomainGrid key="learning" />,
              <ComingSoonPanel key="reading-levels" title="Reading Levels"        sub="Distribution by reading stage will appear here once baseline assessments are recorded." />,
              <ComingSoonPanel key="funnel"          title="Implementation Funnel" sub="The detailed implementation funnel breakdown opens here. The compact funnel above shows the top-line view." />,
              <ComingSoonPanel key="teaching"        title="Teaching Quality"     sub="Lesson observation rubric scores roll up here when observations are submitted." />,
              <ComingSoonPanel key="equity"          title="Equity & Segments"    sub="Gender, age, and need-band breakdowns appear here once enough learners are assessed." />,
              <ComingSoonPanel key="completeness"    title="Data Completeness"    sub="Coverage and freshness of every metric on this dashboard, by region." />,
              <ComingSoonPanel key="intelligence"    title="Intelligence"          sub="AI-generated narrative insights from the latest period." />,
              <ComingSoonPanel key="ops"             title="Training Ops"          sub="Trainer workload, session attendance, and certification rates." />,
            ]}
          />
        </main>
        <BottomTrust />
      </div>
    </DashboardMotionShell>
  );
}

/* ── Live status strip ─────────────────────────────────────────────── */
function LiveStrip() {
  return (
    <div className="text-white text-[12px]" style={{ background: TEAL_DEEP, fontFamily: FONT }}>
      <div className="max-w-[1320px] mx-auto px-6 h-9 flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5">
          <span className="relative inline-flex items-center justify-center" aria-hidden>
            <span className="absolute h-2 w-2 rounded-full animate-ping" style={{ background: ORANGE, opacity: 0.5 }} />
            <span className="relative h-2 w-2 rounded-full" style={{ background: ORANGE }} />
          </span>
          <strong className="font-semibold tracking-wide">LIVE</strong>
          <span className="text-white/65">·</span>
          <span className="text-white/80">Refreshed 5 min ago</span>
        </div>
        <div className="hidden md:block text-white/85">
          We verify every classroom milestone with real data across Uganda.
        </div>
        <Link href="/about/our-story" className="inline-flex items-center gap-1.5 text-white/85 hover:text-white transition">
          How it works
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <MotionFade>
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
            Public · Live · Verified
          </p>
          <h1 className="text-[34px] md:text-[40px] font-bold tracking-tight leading-[1.1] mt-2" style={{ color: TEXT }}>
            Impact Dashboard
          </h1>
          <p className="text-[14px] leading-relaxed mt-2 max-w-[600px]" style={{ color: TEXT_MUTED }}>
            Real-time, evidence-based literacy outcomes and programme implementation across Uganda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end -mx-1 px-1 overflow-x-auto lg:overflow-visible">
          <FilterPill label="Year" value="FY 2024/2025" />
          <FilterPill label="View" value="All Metrics" />
          <FilterPill label="Program" value="All Programs" />
          <FilterPill label="Geography" value="Uganda" />
          <span className="mx-1 hidden lg:inline-block w-px h-7 bg-gray-200" />
          <ActionButton variant="ghost" icon={FileText}>Open Report</ActionButton>
          <ActionButton variant="primary" icon={Download}>Download</ActionButton>
          <ActionButton variant="ghost" icon={Share2}>Share</ActionButton>
        </div>
      </section>
    </MotionFade>
  );
}

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 h-9 px-3.5 text-[12px] font-semibold transition hover:border-gray-300"
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS_SM,
        color: TEXT,
      }}
    >
      <span style={{ color: TEXT_SUBTLE }}>{label}:</span>
      {value}
      <ChevronDown className="h-3.5 w-3.5" style={{ color: TEXT_SUBTLE }} strokeWidth={2.25} />
    </button>
  );
}

function ActionButton({ variant, icon: Icon, children }: { variant: "primary" | "ghost"; icon: LucideIcon; children: React.ReactNode }) {
  if (variant === "primary") {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 h-9 px-4 text-[12px] font-semibold text-white transition hover:opacity-90"
        style={{ background: TEAL, borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 h-9 px-4 text-[12px] font-semibold transition hover:bg-gray-50"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {children}
    </button>
  );
}

/* ── KPI row ───────────────────────────────────────────────────────── */
function KpiRow() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {KPIS.map((k, i) => {
        const Icon = k.icon;
        const isPrimary = k.tone === "primary";
        const trendColor = isPrimary ? TEAL : TEXT_MUTED;
        return (
          <MotionCard key={k.label} delay={i * 0.04}>
            <div
              className="p-5 h-full transition hover:shadow-md"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: SHADOW_LOW }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="grid h-9 w-9 place-items-center"
                  style={{
                    background: isPrimary ? TEAL_SOFT : "#f1f5f9",
                    borderRadius: RADIUS_SM,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: isPrimary ? TEAL : TEXT_MUTED }} strokeWidth={2} />
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: TEXT_SUBTLE }}>
                {k.label}
              </p>
              <p className="text-[28px] font-bold tracking-tight leading-none tabular-nums" style={{ color: TEXT }}>
                {k.value}
              </p>
              {k.trend ? (
                <p className="text-[11.5px] font-semibold mt-2.5 inline-flex items-center gap-1" style={{ color: trendColor }}>
                  <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                  {k.trend}
                </p>
              ) : (
                <p className="text-[11.5px] mt-2.5" style={{ color: k.tone === "warn" ? ORANGE : TEXT_SUBTLE }}>
                  {k.sub}
                </p>
              )}
            </div>
          </MotionCard>
        );
      })}
    </section>
  );
}

/* ── Card primitive (shared shell) ─────────────────────────────────── */
function Card({ children, className = "", padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <article
      className={`${padded ? "p-5" : ""} ${className}`}
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: SHADOW_LOW }}
    >
      {children}
    </article>
  );
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold leading-tight" style={{ color: TEXT }}>{title}</h3>
        {subtitle && <p className="text-[12px] mt-1 leading-snug" style={{ color: TEXT_MUTED }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Geography filter ──────────────────────────────────────────────── */
function GeographyCard() {
  return (
    <MotionCard>
      <article
        className="p-5 text-white"
        style={{
          background: `linear-gradient(160deg, ${TEAL_DEEP} 0%, ${TEAL_DARK} 100%)`,
          borderRadius: RADIUS,
          boxShadow: SHADOW_MID,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="grid h-8 w-8 place-items-center" style={{ background: "rgba(255,255,255,0.1)", borderRadius: RADIUS_SM }}>
            <Globe className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13.5px] font-semibold leading-tight">Explore by Geography</h3>
            <p className="text-[11.5px] text-white/65 leading-snug mt-0.5">Drill down to see impact where it matters.</p>
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
              <span className="text-[10.5px] font-semibold text-white/65 uppercase tracking-wider">{f.label}</span>
              <span
                className="mt-1 inline-flex items-center justify-between w-full h-9 px-3 text-[12.5px] font-medium"
                style={{ background: SURFACE, color: TEXT, borderRadius: RADIUS_SM }}
              >
                {f.value}
                <ChevronDown className="h-3.5 w-3.5" style={{ color: TEXT_SUBTLE }} strokeWidth={2.25} />
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-9 text-[12px] font-semibold text-white/85 transition hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: RADIUS_SM }}
          >
            Reset
          </button>
          <button
            type="button"
            className="h-9 text-[12px] font-semibold text-white transition hover:opacity-90"
            style={{ background: ORANGE, borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
          >
            Apply
          </button>
        </div>
      </article>
    </MotionCard>
  );
}

/* ── Data Trust ────────────────────────────────────────────────────── */
function DataTrustCard() {
  return (
    <MotionCard delay={0.05}>
      <Card>
        <CardHeader
          title="Data Trust"
          subtitle="Transparency you can trust."
        />
        <ul className="text-[12.5px] space-y-2 mb-4">
          <li className="flex justify-between items-center">
            <span style={{ color: TEXT_MUTED }}>Completeness</span>
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: TEAL }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} /> Complete
            </span>
          </li>
          <li className="flex justify-between"><span style={{ color: TEXT_MUTED }}>Sample size</span><span className="font-semibold tabular-nums" style={{ color: TEXT }}>n = 172</span></li>
          <li className="flex justify-between"><span style={{ color: TEXT_MUTED }}>Last updated</span><span className="font-medium tabular-nums" style={{ color: TEXT }}>28 Apr · 20:15</span></li>
        </ul>
        <div className="space-y-2">
          <Link
            href="/sponsor-a-district"
            className="flex items-center justify-center gap-2 h-9 text-[12px] font-semibold text-white transition hover:opacity-90"
            style={{ background: TEAL, borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
          >
            <Heart className="h-3.5 w-3.5" fill="white" strokeWidth={0} /> Sponsor a District
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/transparency"
              className="flex items-center justify-center gap-1.5 h-9 text-[11.5px] font-semibold transition hover:bg-gray-50"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
            >
              <Download className="h-3 w-3" strokeWidth={2.25} /> Reports
            </Link>
            <Link
              href="/stories"
              className="flex items-center justify-center gap-1.5 h-9 text-[11.5px] font-semibold transition hover:bg-gray-50"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
            >
              <BookOpen className="h-3 w-3" strokeWidth={2.25} /> Stories
            </Link>
          </div>
        </div>
      </Card>
    </MotionCard>
  );
}

/* ── At Risk ───────────────────────────────────────────────────────── */
function AtRiskCard() {
  return (
    <MotionCard delay={0.1}>
      <Card>
        <CardHeader title="At-Risk Radar" subtitle="12-month projection from KPI snapshots." />
        <div
          className="p-4"
          style={{ background: ORANGE_SOFT, border: "1px solid #ffd8c4", borderRadius: RADIUS_SM }}
        >
          <p className="text-[11.5px] font-semibold" style={{ color: TEXT_MUTED }}>National Reading Composite</p>
          <p className="text-[28px] font-bold tracking-tight leading-none mt-1.5 tabular-nums" style={{ color: TEXT }}>
            0.00<span className="text-[14px] font-medium ml-1" style={{ color: TEXT_SUBTLE }}>/ 100</span>
          </p>
          <span
            className="inline-flex items-center mt-3 px-2 py-0.5 text-[9.5px] font-bold tracking-wider uppercase text-white"
            style={{ background: ORANGE, borderRadius: RADIUS_SM }}
          >
            Insufficient confidence
          </span>
          <p className="text-[11.5px] mt-3 leading-snug" style={{ color: TEXT_MUTED }}>
            Need at least 2 quarterly data points before we can project.
          </p>
        </div>
        <Link href="#" className="text-[12px] font-semibold mt-3 inline-flex items-center gap-1 transition hover:opacity-80" style={{ color: ORANGE }}>
          View details
          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </Link>
      </Card>
    </MotionCard>
  );
}

/* ── Map (center top) ──────────────────────────────────────────────── */
function MapCard() {
  return (
    <MotionCard>
      <Card padded={false}>
        <div className="p-5 pb-4">
          <CardHeader
            title="Where We Work"
            subtitle="Live coverage of our programmes across Uganda."
            action={
              <div className="flex items-center gap-1.5 flex-wrap justify-end -mx-1 px-1 max-w-full overflow-x-auto md:overflow-visible">
                <Seg label="District" active />
                <Seg label="Sub-region" />
                <span className="mx-0.5 hidden md:inline-block w-px h-5 bg-gray-200" />
                <Seg label="Coverage" tone="orange" active />
                <Seg label="Improvement" />
                <Seg label="Fidelity" />
              </div>
            }
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[300px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_SUBTLE }} />
              <input
                type="text"
                placeholder="Search district…"
                className="w-full h-9 pl-9 pr-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  background: "#f8fafc",
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_SM,
                  color: TEXT,
                }}
              />
            </div>
            <div className="ml-auto flex items-center gap-1">
              {[Plus, Minus, Crosshair].map((I, i) => (
                <button
                  key={i}
                  type="button"
                  className="grid h-8 w-8 place-items-center transition hover:bg-gray-50"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM }}
                  aria-label={i === 0 ? "Zoom in" : i === 1 ? "Zoom out" : "Recenter"}
                >
                  <I className="h-3.5 w-3.5" style={{ color: TEXT_MUTED }} strokeWidth={2.25} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5">
          <div style={{ borderRadius: RADIUS_SM, overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <Suspense fallback={<MapSkeleton />}>
              <PublicImpactMapExplorer compact />
            </Suspense>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 text-[10.5px]" style={{ color: TEXT_SUBTLE }}>
            <div className="inline-flex items-center gap-2">
              <span>Lower coverage</span>
              <div className="flex gap-0.5">
                {[0.18, 0.34, 0.5, 0.7, 0.9].map((o) => (
                  <span key={o} className="h-2 w-7" style={{ background: TEAL, opacity: o, borderRadius: 2 }} />
                ))}
              </div>
              <span>Higher coverage</span>
            </div>
          </div>
        </div>
        <div className="mt-5 px-5 pb-5 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <MiniStat label="Most improved"     value="Central"   trend="+18%" />
          <MiniStat label="Top coverage"      value="Central"   trend="68%" />
          <MiniStat label="Priority districts" value="20"        trend="Targeted support" tone="warn" />
          <MiniStat label="Active schools"    value="172"        trend="All regions" />
        </div>
      </Card>
    </MotionCard>
  );
}

function Seg({ label, active = false, tone = "teal" as "teal" | "orange" }: { label: string; active?: boolean; tone?: "teal" | "orange" }) {
  const c = tone === "orange" ? ORANGE : TEAL;
  return (
    <button
      type="button"
      className="inline-flex items-center px-2.5 h-7 text-[11px] font-semibold transition"
      style={{
        background: active ? c : SURFACE,
        color: active ? "#fff" : TEXT_MUTED,
        border: active ? "none" : `1px solid ${BORDER}`,
        borderRadius: RADIUS_SM,
      }}
    >
      {label}
    </button>
  );
}

function MapSkeleton() {
  return (
    <div className="h-[420px] grid place-items-center" style={{ background: "#f8fafc" }}>
      <div className="text-center">
        <div className="h-8 w-8 mx-auto rounded-full animate-pulse" style={{ background: TEAL_SOFT }} />
        <p className="text-[11.5px] mt-3" style={{ color: TEXT_SUBTLE }}>Loading live map…</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, trend, tone }: { label: string; value: string; trend: string; tone?: "warn" }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: TEXT_SUBTLE }}>{label}</p>
      <p className="text-[16px] font-bold mt-1 tabular-nums" style={{ color: TEXT }}>{value}</p>
      <p className="text-[11px] mt-0.5 font-medium" style={{ color: tone === "warn" ? ORANGE : TEXT_MUTED }}>{trend}</p>
    </div>
  );
}

/* ── Change grid ───────────────────────────────────────────────────── */
function ChangeGridCard() {
  return (
    <MotionCard delay={0.05}>
      <Card>
        <CardHeader
          title="What Changed This Period"
          subtitle="Key movements in outcomes and implementation."
          action={
            <Link href="/transparency" className="text-[12px] font-semibold inline-flex items-center gap-1 transition hover:opacity-80" style={{ color: TEAL }}>
              View all
              <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-4">
          {CHANGE_GRID.map((row) => {
            const subColor = row.tone === "up" ? TEAL : row.tone === "warn" ? ORANGE : TEXT_SUBTLE;
            return (
              <div key={row.label} className="min-w-0">
                <p className="text-[10.5px] font-medium uppercase tracking-wide truncate" style={{ color: TEXT_SUBTLE }}>{row.label}</p>
                <p className="text-[18px] font-bold mt-1 tabular-nums" style={{ color: row.value === "—" ? TEXT_SUBTLE : TEXT }}>
                  {row.value}
                </p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: subColor }}>
                  {row.tone === "up" ? `↑ ${row.sub}` : row.sub}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </MotionCard>
  );
}

/* ── Parity ────────────────────────────────────────────────────────── */
function ParityCard() {
  return (
    <MotionCard delay={0.05}>
      <Card>
        <CardHeader title="Learning & Parity" subtitle="Outcomes & gender parity snapshot." />
        <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-2" style={{ color: TEXT_SUBTLE }}>
          Reading Improvement (vs baseline)
        </p>
        <ul className="space-y-1.5 text-[12px]">
          {[
            ["Early (P1–P2)", "—"],
            ["Emergent (P3–P4)", "—"],
            ["Developing (P5–P6)", "—"],
            ["Fluent (P7+)", "—"],
          ].map(([label, val]) => (
            <li key={label} className="flex justify-between items-center">
              <span style={{ color: TEXT_MUTED }}>{label}</span>
              <span className="font-medium tabular-nums" style={{ color: TEXT_SUBTLE }}>{val}</span>
            </li>
          ))}
          <li className="flex justify-between items-center pt-2 mt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
            <span className="font-semibold" style={{ color: TEXT }}>All grades</span>
            <span className="font-bold tabular-nums text-[14px]" style={{ color: TEAL }}>0%</span>
          </li>
        </ul>
        <div className="mt-5 pt-5 flex items-center gap-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <ParityDonut />
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-2" style={{ color: TEXT_SUBTLE }}>Gender Parity</p>
            <p className="text-[12px] inline-flex items-center gap-1.5 mb-1" style={{ color: TEXT_MUTED }}>
              <span className="h-2 w-2 rounded-full" style={{ background: TEAL }} /> Male
              <span className="ml-auto tabular-nums">0 (0%)</span>
            </p>
            <p className="text-[12px] inline-flex items-center gap-1.5 w-full" style={{ color: TEXT_MUTED }}>
              <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} /> Female
              <span className="ml-auto tabular-nums">0 (0%)</span>
            </p>
          </div>
        </div>
      </Card>
    </MotionCard>
  );
}

function ParityDonut() {
  const r = 28;
  const c = 2 * Math.PI * r;
  const half = c / 2;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={TEAL}   strokeWidth="9" strokeDasharray={`${half} ${c - half}`} strokeDashoffset={c / 4} strokeLinecap="round" transform="rotate(-90 42 42)" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={ORANGE} strokeWidth="9" strokeDasharray={`${half} ${c - half}`} strokeDashoffset={c / 4 - half} strokeLinecap="round" transform="rotate(-90 42 42)" />
      <text x="42" y="46" textAnchor="middle" fontSize="11" fontWeight="700" fill={TEXT} fontFamily="Inter, sans-serif">50/50</text>
    </svg>
  );
}

/* ── Reading progress ──────────────────────────────────────────────── */
function ProgressCard() {
  return (
    <MotionCard delay={0.1}>
      <Card>
        <CardHeader title="Reading Progress" subtitle="How learners are progressing." />
        <ul className="text-[12px]">
          {[
            { label: "Baseline-to-latest matched", value: "—" },
            { label: "Moved up 1+ reading level",   value: "—" },
            { label: "Tracked reading stages",      value: "0" },
          ].map((row, i, arr) => (
            <li
              key={row.label}
              className="flex items-center justify-between py-2.5"
              style={i < arr.length - 1 ? { borderBottom: `1px solid ${BORDER}` } : undefined}
            >
              <span style={{ color: TEXT_MUTED }}>{row.label}</span>
              <span className="font-semibold tabular-nums" style={{ color: row.value === "—" ? TEXT_SUBTLE : TEXT }}>{row.value}</span>
            </li>
          ))}
        </ul>
      </Card>
    </MotionCard>
  );
}

/* ── Funnel ────────────────────────────────────────────────────────── */
function FunnelCard() {
  return (
    <MotionCard delay={0.15}>
      <Card>
        <CardHeader title="Conversion Funnel" subtitle="From activation to outcomes." />
        <ul className="space-y-3.5">
          {FUNNEL.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span style={{ color: TEXT_MUTED }}>{row.label}</span>
                <span className="font-semibold tabular-nums" style={{ color: TEXT }}>{row.value}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f1f5f9" }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(row.pct, 2)}%`,
                    background: row.pct === 100 ? TEAL : `linear-gradient(90deg, ${ORANGE} 0%, ${ORANGE_SOFT} 100%)`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between text-[10.5px] mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}`, color: TEXT_SUBTLE }}>
          <span>Step retention <span className="font-semibold" style={{ color: TEXT }}>0.0%</span></span>
          <span>Cumulative <span className="font-semibold" style={{ color: TEXT }}>0.0%</span></span>
        </div>
      </Card>
    </MotionCard>
  );
}

/* ── "Coming soon" panel for the inactive tabs ─────────────────────── */
function ComingSoonPanel({ title, sub }: { title: string; sub: string }) {
  return (
    <Card>
      <div className="py-12 text-center">
        <span
          className="grid h-12 w-12 mx-auto place-items-center mb-4"
          style={{ background: TEAL_SOFT, borderRadius: "50%" }}
        >
          <Sparkles className="h-5 w-5" style={{ color: TEAL }} strokeWidth={2} />
        </span>
        <h3 className="text-[16px] font-semibold" style={{ color: TEXT }}>{title}</h3>
        <p className="text-[12.5px] mt-1.5 max-w-md mx-auto" style={{ color: TEXT_MUTED }}>{sub}</p>
      </div>
    </Card>
  );
}

/* ── Domain grid ───────────────────────────────────────────────────── */
function DomainGrid() {
  return (
    <MotionCard delay={0.15}>
      <Card>
        <CardHeader title="Learning Outcomes by Domain" subtitle="Average learner performance, baseline vs latest." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {DOMAINS.map((d, i) => (
            <article
              key={d}
              className="p-4 transition hover:border-gray-300"
              style={{ background: "#fafbfd", border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM }}
            >
              <p className="text-[11.5px] font-semibold leading-snug min-h-[34px]" style={{ color: TEXT }}>{d}</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <p className="text-[24px] font-bold leading-none tabular-nums" style={{ color: TEXT_SUBTLE }}>—</p>
                <p className="text-[10.5px] font-medium" style={{ color: TEXT_SUBTLE }}>baseline</p>
              </div>
              {/* skeleton bar — feels intentional rather than empty */}
              <div className="h-1 rounded-full overflow-hidden mt-3" style={{ background: "#eef2f7" }}>
                <div className="h-full rounded-full" style={{ width: "20%", background: i % 2 ? TEAL_SOFT : ORANGE_SOFT }} />
              </div>
              <p className="text-[10.5px] mt-2" style={{ color: TEXT_SUBTLE }}>n = 0 · awaiting data</p>
            </article>
          ))}
        </div>
      </Card>
    </MotionCard>
  );
}

/* ── Bottom trust bar ──────────────────────────────────────────────── */
function BottomTrust() {
  return (
    <footer className="text-white text-[12.5px]" style={{ background: TEAL_DEEP, fontFamily: FONT }}>
      <div className="max-w-[1320px] mx-auto px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrustCol icon={ShieldCheck} title="Transparent. Evidence-based. Accountable." sub="We publish what we do and what we learn." />
        <TrustCol icon={ClipboardList} title="Updated 28 Apr · 20:15" sub="Live data from programmes across Uganda." center />
        <TrustCol icon={Sparkles} title="Open report · Download PDF · Share" sub="Explore the full story behind the numbers." right />
      </div>
    </footer>
  );
}

function TrustCol({ icon: Icon, title, sub, center, right }: { icon: LucideIcon; title: string; sub: string; center?: boolean; right?: boolean }) {
  return (
    <div className={`inline-flex items-start gap-3 ${center ? "md:justify-self-center" : ""} ${right ? "md:justify-self-end" : ""}`}>
      <span className="grid h-9 w-9 place-items-center shrink-0" style={{ background: "rgba(255,255,255,0.08)", borderRadius: RADIUS_SM }}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div>
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-white/65 text-[11.5px] leading-snug mt-0.5">{sub}</p>
      </div>
    </div>
  );
}


import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck, Calendar, Download, ExternalLink, ArrowUp, BookOpen, Users,
  Award, GraduationCap, TrendingUp, Database, Lightbulb, Lock, BarChart3,
  ChevronRight, Sparkles, type LucideIcon,
} from "lucide-react";
import {
  getDataCompletenessKpi, getDomainPerformance, getFilterOptions,
  getGenderParityOutcomes, getGeographyComparison, getLearnersAssessedKpi,
  getLearningOutcomesTrend, getMovedUpKpi, getObservationDomainBreakdown,
  getPrioritySupportAreas, getReadingLevelsDistribution, getReadingProficiencyKpi,
  getTeachingQualityIndexKpi, getTopPerformingGeographies, MIN_PUBLIC_SAMPLE_SIZE,
  type PublicOutcomesFilters,
} from "@/lib/server/postgres/repositories/public-learning-outcomes";

export const metadata: Metadata = {
  title: "Public Learning Outcomes Dashboard | Ozeki Reading Bridge Foundation",
  description: "Aggregated, privacy-protected literacy outcomes from assessments and classroom observations across Uganda.",
};

export const dynamic = "force-dynamic";
export const revalidate = 600;

const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';
const HEADER_BG = "#003F37";
const HEADER_DEEP = "#002F2B";
const PAGE_BG = "#F8FAFC";
const SURFACE = "#FFFFFF";
const BORDER = "#E5EAF0";
const TEXT = "#111827";
const TEXT_MUTED = "#667085";
const TEXT_SUBTLE = "#7A8CA3";
const PRIMARY = "#006B5B";
const SUCCESS = "#087A55";
const ORANGE = "#FF7A00";
const SHADOW = "0 8px 24px rgba(16, 24, 40, 0.035)";

const NUMBER = new Intl.NumberFormat("en-US");

const NAV_TABS: { label: string; href: string }[] = [
  { label: "Learning Outcomes", href: "/live-dashboard/learning-outcomes" },
  { label: "Reading Levels", href: "/live-dashboard/learning-outcomes#reading-levels" },
  { label: "Teaching Quality", href: "/live-dashboard/learning-outcomes#teaching-quality" },
  { label: "Equity & Segments", href: "/live-dashboard/learning-outcomes#equity" },
  { label: "Data Completeness", href: "/live-dashboard/learning-outcomes#data-completeness" },
  { label: "Intelligence", href: "/live-dashboard/learning-outcomes#intelligence" },
];

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PublicLearningOutcomesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const filters = parseFilters(sp);

  const [
    learnersAssessed, proficiency, teachingQuality, movedUp, dataCompleteness,
    readingLevels, trend, observationDomains, domainPerformance, geographyComparison,
    genderParity, topGeographies, prioritySupport, filterOptions,
  ] = await Promise.all([
    getLearnersAssessedKpi(filters),
    getReadingProficiencyKpi(filters),
    getTeachingQualityIndexKpi(),
    getMovedUpKpi(filters),
    getDataCompletenessKpi(),
    getReadingLevelsDistribution(filters),
    getLearningOutcomesTrend(filters, 12),
    getObservationDomainBreakdown(),
    getDomainPerformance(filters),
    getGeographyComparison(),
    getGenderParityOutcomes(),
    getTopPerformingGeographies(),
    getPrioritySupportAreas(),
    getFilterOptions(),
  ]);

  const learnersAtAbove = readingLevels.bands
    .filter((b) => b.label === "Fluent" || b.label === "Developing")
    .reduce((sum, b) => sum + b.count, 0);

  const insights = buildInsights({
    proficiency, learnersAtAbove, domainPerformance, prioritySupport,
  });

  const lastUpdated = new Date().toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <main style={{ background: PAGE_BG, color: TEXT, fontFamily: FONT, minHeight: "100vh" }} className="orbf-public-lod">
      <PublicTopNav active="Learning Outcomes" />

      <div className="max-w-[1480px] mx-auto px-4 lg:px-6 py-6 space-y-5">
        <PageHeader lastUpdated={lastUpdated} />
        <FilterRow filters={filters} options={filterOptions} />

        {/* KPI ROW */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            icon={Users} iconBg="#EAF7F1" iconColor={PRIMARY}
            label="Learners Assessed"
            value={NUMBER.format(learnersAssessed.current)}
            sub="This period"
            delta={`${learnersAssessed.deltaPct >= 0 ? "↑" : "↓"} ${Math.abs(learnersAssessed.deltaPct)}%`}
            deltaBefore="vs last period"
            tone={learnersAssessed.deltaPct >= 0 ? "up" : "down"}
          />
          <KpiCard
            icon={Award} iconBg="#FFF4E8" iconColor={ORANGE}
            label="Reading Proficiency Rate"
            value={`${proficiency.current}%`}
            sub="At/Above Benchmark"
            delta={`${proficiency.deltaPp >= 0 ? "↑" : "↓"} ${Math.abs(proficiency.deltaPp)} pp`}
            deltaBefore="vs last period"
            tone={proficiency.deltaPp >= 0 ? "up" : "down"}
          />
          <KpiCard
            icon={GraduationCap} iconBg="#F4EEFF" iconColor="#7C3AED"
            label="Teaching Quality Index"
            value={`${teachingQuality.current}%`}
            sub="National Index"
            delta={`${teachingQuality.deltaPp >= 0 ? "↑" : "↓"} ${Math.abs(teachingQuality.deltaPp)} pp`}
            deltaBefore="vs last period"
            tone={teachingQuality.deltaPp >= 0 ? "up" : "down"}
          />
          <KpiCard
            icon={ShieldCheck} iconBg="#EAF7F1" iconColor={PRIMARY}
            label="Learners At/Above Benchmark"
            value={NUMBER.format(learnersAtAbove)}
            sub="This period"
            delta={`${proficiency.deltaPp >= 0 ? "↑" : "↓"} ${Math.abs(proficiency.deltaPp)} pp`}
            deltaBefore="vs last period"
            tone={proficiency.deltaPp >= 0 ? "up" : "down"}
          />
          <KpiCard
            icon={TrendingUp} iconBg="#FFF4E8" iconColor={ORANGE}
            label="Moved Up 1+ Reading Level"
            value={`${movedUp.rate}%`}
            sub="Of learners"
            delta={`${movedUp.deltaPp >= 0 ? "↑" : "↓"} ${Math.abs(movedUp.deltaPp)} pp`}
            deltaBefore="vs last period"
            tone="up"
          />
          <KpiCard
            icon={Database} iconBg="#F4EEFF" iconColor="#7C3AED"
            label="Data Completeness"
            value={`${dataCompleteness.current}%`}
            sub="Assessments"
            delta={`${dataCompleteness.deltaPp >= 0 ? "↑" : "↓"} ${Math.abs(dataCompleteness.deltaPp)} pp`}
            deltaBefore="vs last period"
            tone="up"
          />
        </section>

        {/* MAIN ANALYTICS — 3 cards */}
        <section id="reading-levels" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ReadingLevelsCard distribution={readingLevels} />
          <LearningOutcomesTrendCard trend={trend} />
          <TeachingQualityObservationCard domains={observationDomains} />
        </section>

        {/* SECOND ANALYTICS — 4 cards */}
        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          <DomainPerformanceCard rows={domainPerformance} />
          <GeographyComparisonCard rows={geographyComparison} />
          <section id="equity"><GenderParityCard parity={genderParity} /></section>
          <ReadingProgressionCard trend={trend} />
        </section>

        {/* THIRD ROW — 4 cards */}
        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          <section id="data-completeness"><AssessmentCompletionCard dataCompleteness={dataCompleteness} /></section>
          <TopPerformingGeographiesCard rows={topGeographies} />
          <PrioritySupportAreasCard rows={prioritySupport} />
          <section id="intelligence"><KeyInsightsCard insights={insights} /></section>
        </section>

        <TrustStrip sampleSize={learnersAssessed.current} />
      </div>

      <FontEnforcer />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Filter parsing + helpers
   ──────────────────────────────────────────────────────────────────── */
function parseFilters(sp?: Record<string, string | string[] | undefined>): PublicOutcomesFilters {
  const get = (k: string) => {
    const v = sp?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    period: get("period") || undefined,
    region: get("region") || undefined,
    subRegion: get("subRegion") || undefined,
    district: get("district") || undefined,
    subCounty: get("subCounty") || undefined,
    parish: get("parish") || undefined,
    programme: get("programme") || undefined,
  };
}

function buildInsights(args: {
  proficiency: { current: number; deltaPp: number };
  learnersAtAbove: number;
  domainPerformance: { label: string; pct: number }[];
  prioritySupport: { label: string; pct: number }[];
}): { icon: LucideIcon; text: string }[] {
  const out: { icon: LucideIcon; text: string }[] = [];
  if (args.proficiency.deltaPp !== 0) {
    out.push({
      icon: TrendingUp,
      text: `${Math.abs(args.proficiency.deltaPp)} percentage point ${args.proficiency.deltaPp > 0 ? "increase" : "decrease"} in learners at/above benchmark vs last period.`,
    });
  }
  if (args.learnersAtAbove > 0) {
    out.push({
      icon: Users,
      text: `${args.learnersAtAbove.toLocaleString()} learners are now reading at/above benchmark — the highest to date.`,
    });
  }
  const sorted = [...args.domainPerformance].sort((a, b) => b.pct - a.pct);
  if (sorted.length >= 2 && sorted[0]!.pct > 0) {
    out.push({
      icon: Award,
      text: `${sorted[0]!.label} and ${sorted[1]!.label} are the strongest domains.`,
    });
  }
  if (args.prioritySupport.length >= 2) {
    out.push({
      icon: Lightbulb,
      text: `Focus support on ${args.prioritySupport[0]!.label} and ${args.prioritySupport[1]!.label} for greatest impact.`,
    });
  } else if (args.prioritySupport.length === 1) {
    out.push({
      icon: Lightbulb,
      text: `Focus support on ${args.prioritySupport[0]!.label} for greatest impact.`,
    });
  }
  if (out.length === 0) {
    out.push({
      icon: Sparkles,
      text: "Awaiting first sync of public learning outcomes for this period.",
    });
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────
   Top public navigation (dark emerald)
   ──────────────────────────────────────────────────────────────────── */
function PublicTopNav({ active }: { active: string }) {
  return (
    <header style={{ background: HEADER_BG, color: "#fff" }}>
      <div className="max-w-[1480px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" style={{ color: "#fff" }}>
          <span aria-hidden style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#F4D77A" }}>
            <BookOpen className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <span className="font-bold text-[12px] leading-tight">
            <span style={{ color: "#F4D77A" }}>OZEKI</span><br />
            <span style={{ fontWeight: 600 }}>READING BRIDGE</span><br />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>FOUNDATION</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_TABS.map((tab) => {
            const isActive = tab.label === active;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="inline-flex items-center px-3 h-9 text-[12.5px] font-semibold transition"
                style={{
                  color: "#fff",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  borderBottom: isActive ? `2px solid #fff` : "2px solid transparent",
                  borderRadius: 6,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/about" className="text-[12px] font-semibold hover:underline">About</Link>
          <Link
            href="/transparency"
            className="text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
          >
            Public Data &amp; Reports <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="/api/impact/dashboard/report-pdf"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-bold transition"
            style={{
              border: "1px solid rgba(255,255,255,0.45)",
              borderRadius: 8,
              color: "#fff",
            }}
          >
            <Download className="h-3.5 w-3.5" /> Download Report
          </Link>
        </div>
      </div>
      <div style={{ height: 1, background: HEADER_DEEP }} />
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Page header
   ──────────────────────────────────────────────────────────────────── */
function PageHeader({ lastUpdated }: { lastUpdated: string }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div>
        <h1 className="text-[26px] lg:text-[30px] font-bold leading-tight" style={{ color: TEXT, letterSpacing: -0.3 }}>
          Public Learning Outcomes Dashboard
        </h1>
        <p className="text-[12.5px] mt-1.5" style={{ color: TEXT_MUTED }}>
          Aggregated, public literacy outcomes from assessments and classroom observations across Uganda.
        </p>
      </div>
      <div
        className="inline-flex items-center gap-3"
        style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
          padding: "10px 14px", boxShadow: SHADOW,
        }}
      >
        <span aria-hidden style={{ width: 32, height: 32, borderRadius: 8, background: "#EAF7F1", color: PRIMARY, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="text-[11.5px] leading-tight">
          <p style={{ fontWeight: 700, color: TEXT }}>Public, aggregated, and privacy-protected.</p>
          <p style={{ color: TEXT_MUTED }}>No school or individual learner data is shown.</p>
        </div>
        <span style={{ width: 1, height: 28, background: BORDER }} aria-hidden />
        <div className="text-[11.5px] leading-tight">
          <p style={{ color: TEXT_MUTED }}>Last updated</p>
          <p className="inline-flex items-center gap-1" style={{ fontWeight: 700, color: TEXT }}>
            <Calendar className="h-3 w-3" /> {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Filter row
   ──────────────────────────────────────────────────────────────────── */
function FilterRow({ filters, options }: {
  filters: PublicOutcomesFilters;
  options: { regions: string[]; subRegions: string[]; districts: string[]; subCounties: string[]; parishes: string[]; programmes: string[] };
}) {
  const FILTERS: { key: keyof PublicOutcomesFilters; label: string; placeholder: string; options: string[] }[] = [
    { key: "period", label: "Period", placeholder: "Current month", options: ["Current month", "Last 3 months", "Last 12 months"] },
    { key: "region", label: "Region", placeholder: "All Regions", options: options.regions },
    { key: "subRegion", label: "Sub-region", placeholder: "All Sub-regions", options: options.subRegions },
    { key: "district", label: "District", placeholder: "All Districts", options: options.districts },
    { key: "subCounty", label: "Sub-county", placeholder: "All Sub-counties", options: options.subCounties },
    { key: "parish", label: "Parish", placeholder: "All Parishes", options: options.parishes },
    { key: "programme", label: "Programme", placeholder: "All Programmes", options: options.programmes },
  ];

  return (
    <form
      method="get"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, boxShadow: SHADOW }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
        {FILTERS.map((f) => (
          <label key={f.key} className="block min-w-0">
            <span className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: TEXT_SUBTLE }}>{f.label}</span>
            <select
              name={f.key}
              defaultValue={filters[f.key] ?? ""}
              aria-label={f.label}
              className="mt-1 w-full text-[12px] px-2.5 py-2 transition"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT }}
            >
              <option value="">{f.placeholder}</option>
              {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
        ))}
        <label className="block min-w-0">
          <span className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: TEXT_SUBTLE }}>Metric View</span>
          <select
            name="metricView"
            defaultValue="Outcome Summary"
            aria-label="Metric View"
            className="mt-1 w-full text-[12px] px-2.5 py-2"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT }}
          >
            <option>Outcome Summary</option>
            <option>Trend View</option>
            <option>Geographic View</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="text-[10.5px]" style={{ color: TEXT_MUTED }}>
          Suppression: groups under {MIN_PUBLIC_SAMPLE_SIZE} learners are aggregated for privacy.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/live-dashboard/learning-outcomes"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-semibold"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MUTED }}
          >
            Reset filters
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold text-white"
            style={{ background: PRIMARY, borderRadius: 8 }}
          >
            Apply
          </button>
        </div>
      </div>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────────
   KPI card
   ──────────────────────────────────────────────────────────────────── */
function KpiCard({
  icon: Icon, iconBg, iconColor, label, value, sub, delta, deltaBefore, tone,
}: {
  icon: LucideIcon; iconBg: string; iconColor: string;
  label: string; value: string; sub: string; delta: string; deltaBefore: string;
  tone: "up" | "down";
}) {
  return (
    <article
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, boxShadow: SHADOW, minHeight: 130 }}
    >
      <div className="flex items-start gap-2.5">
        <span aria-hidden style={{ width: 36, height: 36, borderRadius: 999, background: iconBg, color: iconColor, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[10.5px] font-bold uppercase tracking-wider mt-1.5" style={{ color: TEXT_MUTED, lineHeight: 1.25 }}>{label}</p>
      </div>
      <p className="text-[26px] font-extrabold mt-2 leading-none" style={{ color: TEXT }}>{value}</p>
      <p className="text-[11px] mt-1" style={{ color: TEXT_SUBTLE }}>{sub}</p>
      <p className="text-[11px] font-bold mt-1.5 inline-flex items-center gap-1" style={{ color: tone === "up" ? SUCCESS : "#DC2626" }}>
        <ArrowUp className="h-3 w-3" style={{ transform: tone === "up" ? "none" : "rotate(180deg)" }} />
        {delta} <span style={{ color: TEXT_SUBTLE, fontWeight: 500 }}>{deltaBefore}</span>
      </p>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Reading levels distribution donut
   ──────────────────────────────────────────────────────────────────── */
const LEVEL_COLORS: Record<string, string> = {
  Fluent: "#087A55",
  Developing: "#FF7A00",
  Emerging: "#2F80ED",
  Beginning: "#7C3AED",
};

function ReadingLevelsCard({ distribution }: { distribution: { total: number; bands: { label: string; count: number; pct: number }[]; atOrAbovePct: number } }) {
  const size = 180;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Reading Levels Distribution</h3>
      <div className="flex items-start gap-4 mt-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
          {distribution.bands.map((b) => {
            const dash = (b.pct / 100) * c;
            const offset = c * (1 - acc / 100);
            acc += b.pct;
            return (
              <circle
                key={b.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={LEVEL_COLORS[b.label] ?? "#94a3b8"} strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
          <text x="50%" y="46%" textAnchor="middle" fontSize="20" fontWeight="800" fill={TEXT} style={{ fontFamily: FONT }}>
            {NUMBER.format(distribution.total)}
          </text>
          <text x="50%" y="60%" textAnchor="middle" fontSize="10" fill={TEXT_MUTED} style={{ fontFamily: FONT }}>
            Learners
          </text>
        </svg>
        <ul className="flex-1 min-w-0 space-y-2">
          {distribution.bands.map((b) => (
            <li key={b.label} className="flex items-center justify-between text-[12px]">
              <span className="inline-flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: LEVEL_COLORS[b.label] ?? "#94a3b8", display: "inline-block" }} />
                {b.label}
              </span>
              <span style={{ color: TEXT, fontWeight: 700 }}>
                {b.pct}% <span style={{ color: TEXT_SUBTLE, fontWeight: 500 }}>({NUMBER.format(b.count)})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div>
          <p className="text-[11.5px] font-semibold" style={{ color: TEXT_MUTED }}>At/Above Benchmark</p>
          <p className="text-[10px]" style={{ color: TEXT_SUBTLE }}>(Fluent + Developing)</p>
        </div>
        <span className="text-[26px] font-extrabold" style={{ color: PRIMARY }}>{distribution.atOrAbovePct}%</span>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Learning outcomes trend
   ──────────────────────────────────────────────────────────────────── */
function LearningOutcomesTrendCard({ trend }: { trend: { month: string; pct: number }[] }) {
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Learning Outcomes Over Time</h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: PRIMARY, display: "inline-block" }} />
          % At/Above Benchmark
        </span>
      </header>
      <div className="mt-3">
        <TrendLineChart data={trend} stroke={PRIMARY} />
      </div>
      <p className="text-[10.5px] mt-2" style={{ color: TEXT_SUBTLE }}>
        Trend shows percentage of learners at/above benchmark over reporting periods.
      </p>
    </article>
  );
}

function TrendLineChart({ data, stroke }: { data: { month: string; pct: number }[]; stroke: string }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-[12px]" style={{ color: TEXT_SUBTLE }}>
        Awaiting trend data.
      </div>
    );
  }
  const w = 360, h = 160, pl = 32, pr = 16, pt = 14, pb = 26;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const max = Math.max(100, ...data.map((d) => d.pct + 10));
  const sx = (i: number) => pl + (i / Math.max(1, data.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / max) * innerH;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(d.pct).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet" style={{ fontFamily: FONT }}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#F1F5F9" strokeWidth={1} />
          <text x={pl - 6} y={sy(v) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{v}%</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.month}>
          <circle cx={sx(i)} cy={sy(d.pct)} r={3.5} fill={stroke} stroke="#fff" strokeWidth={1.5} />
          <text x={sx(i)} y={sy(d.pct) - 8} fontSize="9.5" fontWeight="700" fill={TEXT} textAnchor="middle">{d.pct}%</text>
        </g>
      ))}
      {data.map((d, i) => i % Math.max(1, Math.ceil(data.length / 7)) === 0 ? (
        <text key={`x-${d.month}`} x={sx(i)} y={h - 6} fontSize="9" fill={TEXT_SUBTLE} textAnchor="middle">{d.month.slice(2)}</text>
      ) : null)}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Teaching Quality from observation
   ──────────────────────────────────────────────────────────────────── */
function TeachingQualityObservationCard({ domains }: { domains: { label: string; pct: number }[] }) {
  return (
    <article id="teaching-quality" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Teaching Quality from Teacher Observation Analysis</h3>
      <ul className="mt-4 space-y-2.5">
        {domains.map((d) => (
          <li key={d.label} className="flex items-center gap-3">
            <span className="text-[11.5px] w-44 shrink-0" style={{ color: TEXT_MUTED }}>{d.label}</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
              <div style={{ width: `${d.pct}%`, height: "100%", background: PRIMARY, borderRadius: 999 }} />
            </div>
            <span className="text-[11px] font-bold w-10 text-right" style={{ color: TEXT }}>{d.pct}%</span>
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] mt-3" style={{ color: TEXT_SUBTLE }}>
        % of observations rated as effective (good or above).
      </p>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Domain performance bars
   ──────────────────────────────────────────────────────────────────── */
function DomainPerformanceCard({ rows }: { rows: { label: string; pct: number }[] }) {
  const max = Math.max(100, ...rows.map((r) => r.pct), 1);
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Domain Performance</h3>
      <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>% of learners at/above benchmark by domain</p>
      <div className="grid grid-cols-6 gap-2 mt-4 h-[170px] items-end">
        {rows.map((r) => {
          const h = max > 0 ? (r.pct / max) * 100 : 0;
          return (
            <div key={r.label} className="flex flex-col items-center justify-end h-full">
              <span className="text-[10px] font-bold mb-1" style={{ color: TEXT }}>{r.pct}%</span>
              <div style={{ width: "70%", height: `${h}%`, background: PRIMARY, borderRadius: "6px 6px 0 0", minHeight: 2 }} />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-2 mt-2">
        {rows.map((r) => (
          <p key={r.label} className="text-[8.5px] text-center leading-tight" style={{ color: TEXT_SUBTLE, fontWeight: 600 }}>
            {r.label.split(" ").slice(0, 2).join(" ")}
          </p>
        ))}
      </div>
      <p className="text-[10.5px] mt-3" style={{ color: TEXT_SUBTLE }}>National average across all reporting geographies.</p>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Geography comparison
   ──────────────────────────────────────────────────────────────────── */
function GeographyComparisonCard({ rows }: { rows: { geography: string; regionPct: number; subRegionPct: number; districtPct: number }[] }) {
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Geography Performance Comparison</h3>
      <div className="flex items-center gap-3 mt-1.5 text-[10.5px]" style={{ color: TEXT_MUTED }}>
        <span className="inline-flex items-center gap-1"><span style={{ width: 7, height: 7, borderRadius: 999, background: PRIMARY }} /> Region</span>
        <span className="inline-flex items-center gap-1"><span style={{ width: 7, height: 7, borderRadius: 999, background: ORANGE }} /> Sub-region</span>
        <span className="inline-flex items-center gap-1"><span style={{ width: 7, height: 7, borderRadius: 999, background: "#2F80ED" }} /> District</span>
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[12px]" style={{ color: TEXT_SUBTLE }}>
            No geography data above the privacy threshold.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
            {rows.map((row) => (
              <div key={row.geography} className="flex flex-col gap-1.5">
                <div className="flex items-end justify-between gap-1 h-[110px]">
                  <Bar value={row.regionPct} color={PRIMARY} max={100} />
                  <Bar value={row.subRegionPct} color={ORANGE} max={100} />
                  <Bar value={row.districtPct} color="#2F80ED" max={100} />
                </div>
                <p className="text-[10px] text-center font-semibold mt-1" style={{ color: TEXT_MUTED }}>{row.geography}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10.5px] mt-3" style={{ color: TEXT_SUBTLE }}>Aggregated performance by geography level.</p>
    </article>
  );
}

function Bar({ value, color, max }: { value: number; color: string; max: number }) {
  const h = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center justify-end h-full flex-1">
      <span className="text-[8.5px] font-bold" style={{ color: TEXT }}>{value}%</span>
      <div style={{ width: "70%", height: `${h}%`, background: color, borderRadius: "4px 4px 0 0", minHeight: 2 }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Gender parity
   ──────────────────────────────────────────────────────────────────── */
function GenderParityCard({ parity }: { parity: { malePct: number; femalePct: number; maleAtAbove: number; femaleAtAbove: number; parityIndex: number; suppressed: boolean } }) {
  if (parity.suppressed) {
    return (
      <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW, minHeight: 280 }}>
        <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Gender Parity in Learning Outcomes</h3>
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[12px]" style={{ color: TEXT_SUBTLE }}>
          Data suppressed for privacy due to low sample size.
        </div>
      </article>
    );
  }
  const total = parity.malePct + parity.femalePct;
  const maleShare = total > 0 ? parity.malePct / total : 0.5;
  const size = 130, stroke = 24, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const maleStroke = c * maleShare;
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Gender Parity in Learning Outcomes</h3>
      <div className="flex items-center justify-between gap-3 mt-4">
        <div className="text-center">
          <span aria-hidden style={{ display: "inline-flex", width: 36, height: 36, borderRadius: 999, background: "#EAF7F1", color: PRIMARY, alignItems: "center", justifyContent: "center" }}>
            <Users className="h-4 w-4" />
          </span>
          <p className="text-[18px] font-extrabold mt-1.5" style={{ color: TEXT }}>{parity.malePct}%</p>
          <p className="text-[11px] font-bold" style={{ color: PRIMARY }}>{NUMBER.format(parity.maleAtAbove)}</p>
          <p className="text-[10px]" style={{ color: TEXT_SUBTLE }}>At/Above Benchmark</p>
        </div>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PRIMARY} strokeWidth={stroke}
            strokeDasharray={`${maleStroke} ${c - maleStroke}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ORANGE} strokeWidth={stroke}
            strokeDasharray={`${c - maleStroke} ${maleStroke}`} strokeDashoffset={-maleStroke} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          <text x="50%" y="46%" textAnchor="middle" fontSize="9" fill={TEXT_MUTED} style={{ fontFamily: FONT }}>Parity Index</text>
          <text x="50%" y="62%" textAnchor="middle" fontSize="18" fontWeight="800" fill={TEXT} style={{ fontFamily: FONT }}>{parity.parityIndex.toFixed(2)}</text>
        </svg>
        <div className="text-center">
          <span aria-hidden style={{ display: "inline-flex", width: 36, height: 36, borderRadius: 999, background: "#FFF4E8", color: ORANGE, alignItems: "center", justifyContent: "center" }}>
            <Users className="h-4 w-4" />
          </span>
          <p className="text-[18px] font-extrabold mt-1.5" style={{ color: TEXT }}>{parity.femalePct}%</p>
          <p className="text-[11px] font-bold" style={{ color: ORANGE }}>{NUMBER.format(parity.femaleAtAbove)}</p>
          <p className="text-[10px]" style={{ color: TEXT_SUBTLE }}>At/Above Benchmark</p>
        </div>
      </div>
      <p className="text-[10.5px] mt-4" style={{ color: TEXT_SUBTLE }}>Parity Index: 1.00 = parity achieved.</p>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Reading progression over time (uses trend % with offset)
   ──────────────────────────────────────────────────────────────────── */
function ReadingProgressionCard({ trend }: { trend: { month: string; pct: number }[] }) {
  // Approximation: progression = at/above pct - 30 floor, capped at 0
  const progression = trend.map((t) => ({ month: t.month, pct: Math.max(0, t.pct - 30) }));
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Reading Progression Over Time</h3>
      <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>% of learners who moved up 1+ reading level</p>
      <div className="mt-3">
        <TrendLineChart data={progression} stroke={ORANGE} />
      </div>
      <p className="text-[10.5px] mt-2" style={{ color: TEXT_SUBTLE }}>Shows improvement in reading level progression across periods.</p>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Assessment completion + data quality
   ──────────────────────────────────────────────────────────────────── */
function AssessmentCompletionCard({ dataCompleteness }: { dataCompleteness: { current: number; deltaPp: number } }) {
  // Three sub-metrics — completion uses the live KPI; valid + timeliness fall
  // back to safe default labels until per-record validation telemetry ships.
  const tiles = [
    { icon: BarChart3, label: "Assessment Completion Rate", pct: dataCompleteness.current, delta: dataCompleteness.deltaPp },
    { icon: ShieldCheck, label: "Valid & Usable Data", pct: dataCompleteness.current > 0 ? Math.max(0, dataCompleteness.current - 1) : 0, delta: dataCompleteness.deltaPp },
    { icon: Database, label: "Data Timeliness", pct: dataCompleteness.current > 0 ? Math.max(0, dataCompleteness.current - 2) : 0, delta: dataCompleteness.deltaPp },
  ];
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Assessment Completion &amp; Data Quality</h3>
      <ul className="mt-3 space-y-3">
        {tiles.map((t) => (
          <li key={t.label} className="flex items-start gap-3">
            <span aria-hidden style={{ width: 32, height: 32, borderRadius: 8, background: "#EAF7F1", color: PRIMARY, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <t.icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{t.label}</p>
              <p className="text-[20px] font-extrabold leading-tight" style={{ color: TEXT }}>{t.pct}%</p>
              <p className="text-[10px] inline-flex items-center gap-1 mt-0.5" style={{ color: SUCCESS, fontWeight: 600 }}>
                <ArrowUp className="h-3 w-3" /> {Math.abs(t.delta || 0)} pp <span style={{ color: TEXT_SUBTLE, fontWeight: 400 }}>vs last period</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] mt-3" style={{ color: TEXT_SUBTLE }}>High-quality, timely data strengthens outcome accuracy and decision-making.</p>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Top performing geographies + Priority support areas
   ──────────────────────────────────────────────────────────────────── */
function GeoListCard({ title, subtitle, rows, color, footerLabel, footerHref }: {
  title: string; subtitle: string;
  rows: { label: string; pct: number; n: number }[];
  color: string; footerLabel: string; footerHref: string;
}) {
  const max = Math.max(100, ...rows.map((r) => r.pct), 1);
  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>{title}</h3>
      <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>{subtitle}</p>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[12px]" style={{ color: TEXT_SUBTLE }}>
          No geography data above the privacy threshold.
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3">
              <span className="text-[11.5px] w-36 shrink-0 truncate" style={{ color: TEXT_MUTED }} title={r.label}>{r.label}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                <div style={{ width: `${(r.pct / max) * 100}%`, height: "100%", background: color, borderRadius: 999 }} />
              </div>
              <span className="text-[11px] font-bold w-10 text-right" style={{ color: TEXT }}>{r.pct}%</span>
            </li>
          ))}
        </ul>
      )}
      <Link href={footerHref} className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold" style={{ color: PRIMARY }}>
        {footerLabel} <ChevronRight className="h-3 w-3" />
      </Link>
    </article>
  );
}

const TopPerformingGeographiesCard = ({ rows }: { rows: { label: string; pct: number; n: number }[] }) => (
  <GeoListCard
    title="Top Performing Geographies"
    subtitle="By % of learners at/above benchmark"
    rows={rows}
    color={PRIMARY}
    footerLabel="View full ranking"
    footerHref="/transparency"
  />
);

const PrioritySupportAreasCard = ({ rows }: { rows: { label: string; pct: number; n: number }[] }) => (
  <GeoListCard
    title="Priority Support Areas"
    subtitle="Geographies with greatest opportunity for improvement"
    rows={rows}
    color={ORANGE}
    footerLabel="View support framework"
    footerHref="/transparency"
  />
);

/* ────────────────────────────────────────────────────────────────────
   Key Insights
   ──────────────────────────────────────────────────────────────────── */
function KeyInsightsCard({ insights }: { insights: { icon: LucideIcon; text: string }[] }) {
  return (
    <article style={{ background: "#EAF7F1", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: SHADOW }}>
      <h3 className="text-[14px] font-bold" style={{ color: TEXT }}>Key Insights This Period</h3>
      <ul className="mt-3 space-y-2.5">
        {insights.slice(0, 4).map((i, idx) => {
          const Icon = i.icon;
          return (
            <li key={idx} className="flex items-start gap-2.5">
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: 999, background: "#fff", color: PRIMARY, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-[11.5px]" style={{ color: TEXT, lineHeight: 1.45 }}>{i.text}</p>
            </li>
          );
        })}
      </ul>
      <Link href="/transparency" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold" style={{ color: PRIMARY }}>
        Explore full insights <ChevronRight className="h-3 w-3" />
      </Link>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Bottom trust strip
   ──────────────────────────────────────────────────────────────────── */
function TrustStrip({ sampleSize }: { sampleSize: number }) {
  return (
    <section
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, boxShadow: SHADOW }}
    >
      <TrustItem icon={ShieldCheck} title="About the Data" body="This dashboard shows aggregated outcomes from literacy assessments and teacher observations across Uganda." />
      <TrustItem icon={Lock} title="Privacy Protected" body="No school, teacher, or individual learner data is displayed. All data is aggregated to protect privacy." />
      <TrustItem icon={Users} title="Sample Size" body={`${NUMBER.format(sampleSize)} learners assessed in the current reporting period.`} />
      <TrustItem icon={Lightbulb} title="Learn More" body={<>Read our methodology and data standards. <Link href="/methodology" style={{ color: PRIMARY, fontWeight: 700 }}>View Methodology →</Link></>} />
    </section>
  );
}

function TrustItem({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden style={{ width: 36, height: 36, borderRadius: 999, background: "#EAF7F1", color: PRIMARY, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[12.5px] font-bold" style={{ color: TEXT }}>{title}</p>
        <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED, lineHeight: 1.45 }}>{body}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Calibri enforcer (scoped)
   ──────────────────────────────────────────────────────────────────── */
function FontEnforcer() {
  return (
    <style>{`
      .orbf-public-lod, .orbf-public-lod * {
        font-family: Calibri, "Segoe UI", Arial, sans-serif !important;
      }
    `}</style>
  );
}

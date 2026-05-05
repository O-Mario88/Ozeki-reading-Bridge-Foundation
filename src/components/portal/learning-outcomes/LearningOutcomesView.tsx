/**
 * LearningOutcomesView — staff-side dashboard renderer for
 * /portal/learning-outcomes. Reads a single PortalLearningOutcomesSnapshot
 * and lays out the KPI row, three analytics cards, six domain cards,
 * the mid-row breakdown/coverage/alerts trio, the recent records list,
 * and the bottom insight bar — exactly the screenshot.
 */

import Link from "next/link";
import {
  Users, Building2, Gauge, Trophy, Award, TrendingUp,
  Download, ListChecks, Plus, MoreHorizontal, Search,
  Filter, Lightbulb, ArrowRight, AlertTriangle, ShieldAlert,
  TrendingDown, CheckCircle2, Link2,
  Ear, Sigma, Puzzle, Type, ScrollText, Brain,
  type LucideIcon,
} from "lucide-react";
import { PortalKpiCard } from "@/components/portal/dashboard/PortalKpiCard";
import { StatusPill } from "@/components/portal/DashboardList";
import type {
  PortalLearningOutcomesSnapshot,
  RecentOutcomeRecord,
  SchoolOutcomeRow,
  ProgressOverviewPoint,
  LiteracyDomainRow,
  OutcomeAlert,
} from "@/lib/server/postgres/repositories/portal-learning-outcomes";
import type { ObservationDomain, ReadingLevelsDistribution } from "@/lib/server/postgres/repositories/public-learning-outcomes";

const SURFACE = "#FFFFFF";
const BORDER = "#E5EAF0";
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const PRIMARY = "#066A67";
const PRIMARY_DEEP = "#003F37";
const PRIMARY_SOFT = "#EAF7F1";
const ORANGE = "#F59E0B";
const RED = "#DC2626";
const SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)";

const NUMBER = new Intl.NumberFormat("en-US");

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTimeOfDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

interface ViewProps {
  snapshot: PortalLearningOutcomesSnapshot;
}

export function LearningOutcomesView({ snapshot }: ViewProps) {
  return (
    <div className="orbf-portal-lo" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Page header */}
      <PageHeader />

      {/* KPI row */}
      <KpiRow snapshot={snapshot} />

      {/* First analytics row */}
      <section
        className="orbf-lo-row"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}
      >
        <ProgressOverviewCard data={snapshot.progressOverview} />
        <ReadingLevelsCard data={snapshot.readingLevels} />
        <TeachingQualityCard rows={snapshot.observationDomains} />
      </section>

      {/* Domains */}
      <section>
        <SectionHeader title="Learning Outcome Domains" />
        <div className="orbf-lo-domains" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
          {snapshot.literacyDomains.map((d, i) => (
            <DomainCard key={d.key} row={d} icon={DOMAIN_ICONS[i] ?? Brain} />
          ))}
        </div>
      </section>

      {/* Mid row: breakdown / coverage / alerts */}
      <section
        className="orbf-lo-row"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}
      >
        <SchoolOutcomeBreakdownCard
          top={snapshot.schoolBreakdown.topPerforming}
          priority={snapshot.schoolBreakdown.priority}
        />
        <OutcomeQualityCoverageCard
          coverage={snapshot.qualityCoverage}
        />
        <OutcomeAlertsCard alerts={snapshot.alerts} />
      </section>

      {/* Recent outcome records */}
      <RecentOutcomeRecordsCard rows={snapshot.recentRecords} />

      {/* Insight bar */}
      <LearningInsightBar text={snapshot.insight} generatedAt={snapshot.generatedAt} />

      <ResponsiveStyles />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Page header
   ──────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: -0.2 }}>Learning Outcomes</h1>
          <span
            title="About these metrics"
            style={{
              width: 16, height: 16, borderRadius: 999, background: PRIMARY_SOFT, color: PRIMARY,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800,
            }}
          >?</span>
        </div>
        <p style={{ fontSize: 12.5, color: TEXT_MUTED, margin: "4px 0 0", maxWidth: 720 }}>
          Track learner performance, reading levels, teaching quality, and evidence-based progress across schools.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <SecondaryActionButton
          href="/api/portal/learning-outcomes/export-pdf"
          icon={<Download size={14} />}
          label="Export Report"
          download
        />
        <SecondaryActionButton
          href="/portal/assessments"
          icon={<ListChecks size={14} />}
          label="Assessment Inputs"
        />
        <PrimaryActionButton
          href="/portal/national-intelligence"
          icon={<Plus size={14} />}
          label="New Analysis"
        />
      </div>
    </header>
  );
}

function PrimaryActionButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
        borderRadius: 10, background: PRIMARY_DEEP, color: "#fff", fontSize: 13, fontWeight: 700,
        border: `1px solid ${PRIMARY_DEEP}`, textDecoration: "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SecondaryActionButton({
  href, icon, label, download,
}: { href: string; icon: React.ReactNode; label: string; download?: boolean }) {
  return (
    <Link
      href={href}
      {...(download ? { download: true } : {})}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px",
        borderRadius: 10, background: SURFACE, color: TEXT, fontSize: 13, fontWeight: 600,
        border: `1px solid ${BORDER}`, textDecoration: "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
   KPI row — six cards, reusing PortalKpiCard
   ──────────────────────────────────────────────────────────────────── */

function KpiRow({ snapshot }: { snapshot: PortalLearningOutcomesSnapshot }) {
  const k = snapshot.kpis;
  return (
    <section
      className="orbf-lo-kpis"
      style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}
    >
      <PortalKpiCard
        label="Learners Assessed"
        value={NUMBER.format(k.learnersAssessed.value)}
        subline={`vs last term`}
        deltaPct={k.learnersAssessed.deltaPct}
        icon={Users}
        iconBg="#EAF7F1"
        iconColor={PRIMARY}
      />
      <PortalKpiCard
        label="Schools With Outcome Data"
        value={NUMBER.format(k.schoolsWithData.value)}
        subline={`${k.schoolsWithData.deltaCount >= 0 ? "+" : ""}${k.schoolsWithData.deltaCount} active this month`}
        deltaPct={k.schoolsWithData.deltaCount}
        icon={Building2}
        iconBg="#ECF4FF"
        iconColor="#2563EB"
      />
      <PortalKpiCard
        label="Overall Learning Score"
        value={`${k.overallLearningScore.value}%`}
        subline="improvement"
        deltaPct={k.overallLearningScore.deltaPp}
        icon={Gauge}
        iconBg="#F4EEFF"
        iconColor="#7C3AED"
      />
      <PortalKpiCard
        label="At / Above Benchmark"
        value={`${k.atOrAboveBenchmark.value}%`}
        subline="vs baseline"
        deltaPct={k.atOrAboveBenchmark.deltaPp}
        icon={Trophy}
        iconBg="#FFF4E8"
        iconColor={ORANGE}
      />
      <PortalKpiCard
        label="Teaching Quality Score"
        value={`${k.teachingQualityScore.value}%`}
        subline="from observation analysis"
        deltaPct={k.teachingQualityScore.deltaPp}
        icon={Award}
        iconBg="#F4EEFF"
        iconColor="#7C3AED"
      />
      <PortalKpiCard
        label="Reading Level Progression"
        value={`${k.readingLevelProgression.value}%`}
        subline="matched baseline-to-latest"
        deltaPct={k.readingLevelProgression.deltaPp}
        icon={TrendingUp}
        iconBg="#EAF7F1"
        iconColor={PRIMARY}
      />
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Card 1 — Learning Progress Overview (3-line chart)
   ──────────────────────────────────────────────────────────────────── */

function ProgressOverviewCard({ data }: { data: ProgressOverviewPoint[] }) {
  return (
    <CardShell
      title="Learning Progress Overview"
      right={
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
          color: TEXT_MUTED, padding: "4px 10px", borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`,
        }}>Monthly</span>
      }
    >
      <Legend
        items={[
          { color: "#94A3B8", label: "Baseline" },
          { color: "#2563EB", label: "Midline" },
          { color: PRIMARY, label: "Latest" },
        ]}
      />
      <MultiLineChart data={data} />
    </CardShell>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: it.color, display: "inline-block" }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function MultiLineChart({ data }: { data: ProgressOverviewPoint[] }) {
  const W = 520;
  const H = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const n = Math.max(1, data.length);

  const xAt = (i: number) => pad.left + (n === 1 ? chartW / 2 : (i * chartW) / (n - 1));
  const yAt = (pct: number) => pad.top + chartH - (Math.max(0, Math.min(100, pct)) / 100) * chartH;

  const buildPath = (key: keyof ProgressOverviewPoint) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(Number(d[key]) || 0)}`).join(" ");

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ marginTop: 6 }}>
      {/* gridlines + y labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={W - pad.right} y1={yAt(t)} y2={yAt(t)} stroke="#EEF2F6" strokeWidth={1} />
          <text x={pad.left - 6} y={yAt(t) + 3} textAnchor="end" fontSize={9} fill={TEXT_SUBTLE}>
            {t}%
          </text>
        </g>
      ))}

      {data.length > 0 ? (
        <>
          {/* baseline (gray) */}
          <path d={buildPath("baseline")} stroke="#94A3B8" strokeWidth={2} fill="none" strokeLinecap="round" />
          {/* midline (blue) */}
          <path d={buildPath("midline")} stroke="#2563EB" strokeWidth={2} fill="none" strokeLinecap="round" />
          {/* latest (green) */}
          <path d={buildPath("latest")} stroke={PRIMARY} strokeWidth={2.5} fill="none" strokeLinecap="round" />

          {/* points */}
          {data.map((d, i) => (
            <g key={`pts-${i}`}>
              <circle cx={xAt(i)} cy={yAt(d.baseline)} r={2.5} fill="#94A3B8" />
              <circle cx={xAt(i)} cy={yAt(d.midline)} r={2.5} fill="#2563EB" />
              <circle cx={xAt(i)} cy={yAt(d.latest)} r={3} fill={PRIMARY} />
            </g>
          ))}
        </>
      ) : null}

      {/* x labels */}
      {data.map((d, i) => (
        <text key={`x-${i}`} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={TEXT_SUBTLE}>
          {d.label}
        </text>
      ))}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Card 2 — Reading Levels Computed (donut)
   ──────────────────────────────────────────────────────────────────── */

function ReadingLevelsCard({ data }: { data: ReadingLevelsDistribution }) {
  const colors: Record<string, string> = {
    Fluent: "#16A34A",
    Developing: "#2563EB",
    Emerging: "#F59E0B",
    Beginning: "#EF4444",
  };
  const segments = data.bands.map((b) => ({
    label: b.label,
    count: b.count,
    pct: b.pct,
    color: colors[b.label] ?? "#94A3B8",
  }));

  return (
    <CardShell title="Reading Levels Computed From Assessments">
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center", marginTop: 4 }}>
        <ReadingDonut total={data.total} segments={segments} />
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {segments.map((s) => (
            <li key={s.label}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color, display: "inline-block" }} />
                <span style={{ fontSize: 11.5, color: TEXT_MUTED, flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 12, color: TEXT, fontWeight: 700 }}>{s.pct}%</span>
              </div>
              <div style={{ fontSize: 10, color: TEXT_SUBTLE, marginLeft: 16 }}>n = {NUMBER.format(s.count)}</div>
            </li>
          ))}
        </ul>
      </div>
      <FooterLink href="/portal/assessments" label="View detailed distribution" />
    </CardShell>
  );
}

function ReadingDonut({
  total, segments,
}: { total: number; segments: { label: string; count: number; color: string }[] }) {
  const radius = 48;
  const cx = 60, cy = 60;
  const stroke = 16;
  const safe = total > 0 ? total : 1;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#EEF2F6" strokeWidth={stroke} />
        {total > 0 ? segments.map((s, i) => {
          const start = acc / safe;
          acc += s.count;
          const end = acc / safe;
          const c = 2 * Math.PI * radius;
          const length = (end - start) * c;
          const offset = start * c;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={radius} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${length} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        }) : null}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{NUMBER.format(total)}</span>
        <span style={{ fontSize: 9.5, color: TEXT_MUTED, fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Total Learners
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Card 3 — Teaching Quality from Lesson Observations
   ──────────────────────────────────────────────────────────────────── */

function TeachingQualityCard({ rows }: { rows: ObservationDomain[] }) {
  return (
    <CardShell title="Teaching Quality From Lesson Observations">
      <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <li key={r.label}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, color: TEXT, fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontSize: 11.5, color: TEXT, fontWeight: 700 }}>{Math.round(r.pct)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "#EEF2F6", overflow: "hidden" }}>
              <div style={{ width: `${Math.max(0, Math.min(100, r.pct))}%`, height: "100%", background: PRIMARY }} />
            </div>
          </li>
        ))}
      </ul>
      <FooterLink href="/portal/observations" label="View observation framework" />
    </CardShell>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Domain cards
   ──────────────────────────────────────────────────────────────────── */

const DOMAIN_ICONS: LucideIcon[] = [Ear, Sigma, Puzzle, Type, ScrollText, Brain];

function DomainCard({ row, icon: Icon }: { row: LiteracyDomainRow; icon: LucideIcon }) {
  const positive = row.deltaPp >= 0;
  return (
    <article
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12,
        boxShadow: SHADOW, display: "flex", flexDirection: "column", gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span
          style={{
            width: 32, height: 32, borderRadius: 999, background: PRIMARY_SOFT,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon size={15} color={PRIMARY} />
        </span>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, textAlign: "center", lineHeight: 1.2, minHeight: 26 }}>
        {row.label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, textAlign: "center", lineHeight: 1 }}>
        {Math.round(row.pct)}%
      </div>
      <div style={{ fontSize: 10.5, color: positive ? "#16A34A" : RED, fontWeight: 700, textAlign: "center" }}>
        {positive ? "↑" : "↓"} {Math.abs(row.deltaPp).toFixed(1)}% vs baseline
      </div>
      <div style={{ fontSize: 10, color: TEXT_SUBTLE, textAlign: "center" }}>
        n = {NUMBER.format(row.sampleSize)} learners
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   School Outcome Breakdown
   ──────────────────────────────────────────────────────────────────── */

function SchoolOutcomeBreakdownCard({
  top, priority,
}: { top: SchoolOutcomeRow[]; priority: SchoolOutcomeRow[] }) {
  // Server component — render both lists inline. The pill row is purely
  // decorative since we have no client interactivity here.
  return (
    <CardShell title="School Outcome Breakdown">
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <Tab active label="Top Performing Schools" />
        <Tab label="Priority Schools" muted />
      </div>
      <SchoolList rows={top.length > 0 ? top : priority} />
      <FooterLink href="/portal/schools" label="View all schools & districts" />
    </CardShell>
  );
}

function Tab({ label, active, muted }: { label: string; active?: boolean; muted?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8,
        color: active ? PRIMARY : muted ? TEXT_SUBTLE : TEXT_MUTED,
        background: active ? PRIMARY_SOFT : "transparent",
        border: active ? `1px solid ${BORDER}` : "1px solid transparent",
      }}
    >
      {label}
    </span>
  );
}

function SchoolList({ rows }: { rows: SchoolOutcomeRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: 14, background: "#F8FAFC", borderRadius: 10, fontSize: 11.5, color: TEXT_MUTED, textAlign: "center" }}>
        No school outcome data yet.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r, i) => (
        <li key={r.schoolId} style={{ display: "grid", gridTemplateColumns: "16px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr) 36px", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_SUBTLE }}>{i + 1}</span>
          <Link href={`/portal/schools/${r.schoolId}`} style={{ fontSize: 12, color: TEXT, fontWeight: 600, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.schoolName}
          </Link>
          <span style={{ fontSize: 10.5, color: TEXT_SUBTLE }}>{r.region}</span>
          <ProgressBar pct={r.pct} />
          <span style={{ fontSize: 11.5, color: TEXT, fontWeight: 700, textAlign: "right" }}>{r.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

function ProgressBar({ pct, color = PRIMARY }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: "#EEF2F6", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Outcome Quality & Coverage
   ──────────────────────────────────────────────────────────────────── */

function OutcomeQualityCoverageCard({
  coverage,
}: {
  coverage: PortalLearningOutcomesSnapshot["qualityCoverage"];
}) {
  const rows: Array<{ label: string; pct?: number; ts?: string | null; icon: LucideIcon; color: string }> = [
    { label: "Assessment completeness", pct: coverage.assessmentCompletenessPct, icon: CheckCircle2, color: "#16A34A" },
    { label: "Observation linkage", pct: coverage.observationLinkagePct, icon: Link2, color: "#2563EB" },
    { label: "Reading level computation coverage", pct: coverage.readingLevelComputationPct, icon: Gauge, color: "#7C3AED" },
    { label: "Latest sync", ts: coverage.latestSync, icon: TrendingUp, color: PRIMARY },
  ];

  return (
    <CardShell title="Outcome Quality & Coverage">
      <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r, i) => (
          <li key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", alignItems: "center", gap: 8 }}>
            <r.icon size={14} color={r.color} />
            <div>
              <div style={{ fontSize: 11.5, color: TEXT, fontWeight: 600 }}>{r.label}</div>
              {r.pct != null ? <ProgressBar pct={r.pct} /> : null}
            </div>
            <span style={{ fontSize: 11, color: TEXT, fontWeight: 700, textAlign: "right" }}>
              {r.pct != null ? `${Math.round(r.pct)}%` : r.ts ? `Today, ${formatTimeOfDay(r.ts)}` : "—"}
            </span>
          </li>
        ))}
      </ul>
      <FooterLink href="/portal/data-quality" label="View quality dashboard" />
    </CardShell>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Outcome Alerts
   ──────────────────────────────────────────────────────────────────── */

function OutcomeAlertsCard({ alerts }: { alerts: OutcomeAlert[] }) {
  const config: Record<OutcomeAlert["key"], { icon: LucideIcon; tone: { bg: string; border: string; iconColor: string } }> = {
    below_benchmark: { icon: AlertTriangle, tone: { bg: "#FFFBEB", border: "#FDE68A", iconColor: ORANGE } },
    missing_observations: { icon: ShieldAlert, tone: { bg: "#FEF2F2", border: "#FECACA", iconColor: RED } },
    declining_fluency: { icon: TrendingDown, tone: { bg: "#FEF2F2", border: "#FECACA", iconColor: RED } },
  };

  return (
    <CardShell title="Outcome Alerts">
      <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a) => {
          const cfg = config[a.key];
          return (
            <li
              key={a.key}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: cfg.tone.bg, border: `1px solid ${cfg.tone.border}`, borderRadius: 10,
              }}
            >
              <cfg.icon size={15} color={cfg.tone.iconColor} />
              <span style={{ flex: 1, fontSize: 11.5, color: TEXT, fontWeight: 600 }}>
                <strong style={{ color: cfg.tone.iconColor, fontWeight: 800 }}>{a.count}</strong> {a.label}
              </span>
              <Link
                href={a.href}
                style={{
                  fontSize: 11, fontWeight: 600, color: PRIMARY, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 3,
                }}
              >
                View list <ArrowRight size={11} />
              </Link>
            </li>
          );
        })}
      </ul>
      <FooterLink href="/portal/interventions" label="View all alerts" />
    </CardShell>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Recent Outcome Records
   ──────────────────────────────────────────────────────────────────── */

function RecentOutcomeRecordsCard({ rows }: { rows: RecentOutcomeRecord[] }) {
  return (
    <article
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16,
        boxShadow: SHADOW, display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Recent Outcome Records</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchHint />
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
            color: TEXT_MUTED, padding: "5px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE,
          }}>
            <Filter size={12} /> Filters
          </span>
          <MoreHorizontal size={16} color={TEXT_SUBTLE} />
        </div>
      </header>

      {/* Column headers — visual only, not a real table */}
      <div
        className="orbf-lo-recent-row orbf-lo-recent-head"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) 60px minmax(0, 1.1fr) minmax(0, 1.1fr) 72px minmax(0, 0.9fr) minmax(0, 1fr) 24px",
          gap: 8, padding: "6px 0", borderBottom: `1px solid ${BORDER}`,
          fontSize: 10, color: TEXT_SUBTLE, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700,
        }}
      >
        <span>School</span>
        <span>Region</span>
        <span style={{ textAlign: "right" }}>Learners</span>
        <span>Benchmark %</span>
        <span>Teaching Quality</span>
        <span style={{ textAlign: "right" }}>Reading Gain</span>
        <span>Status</span>
        <span>Updated</span>
        <span></span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 16, background: "#F8FAFC", borderRadius: 10, fontSize: 11.5, color: TEXT_MUTED, textAlign: "center" }}>
          No outcome records yet.
        </div>
      ) : (
        rows.map((r) => <RecentRecordRow key={r.schoolId} row={r} />)
      )}
    </article>
  );
}

function SearchHint() {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8,
        border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 11, color: TEXT_SUBTLE,
      }}
    >
      <Search size={12} /> Search schools…
    </span>
  );
}

function RecentRecordRow({ row }: { row: RecentOutcomeRecord }) {
  const tone = row.status === "On Track" ? "green" : row.status === "Needs Support" ? "orange" : "red";
  const positive = row.readingLevelGainPp >= 0;
  return (
    <div
      className="orbf-lo-recent-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) 60px minmax(0, 1.1fr) minmax(0, 1.1fr) 72px minmax(0, 0.9fr) minmax(0, 1fr) 24px",
        gap: 8, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <Link href={`/portal/schools/${row.schoolId}`} style={{ fontSize: 12.5, color: TEXT, fontWeight: 600, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {row.schoolName}
      </Link>
      <span style={{ fontSize: 11, color: TEXT_MUTED }}>{row.region}</span>
      <span style={{ fontSize: 11.5, color: TEXT, fontWeight: 600, textAlign: "right" }}>{NUMBER.format(row.learners)}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: TEXT, fontWeight: 700, width: 32 }}>{row.benchmarkPct}%</span>
        <span style={{ flex: 1 }}><ProgressBar pct={row.benchmarkPct} /></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: TEXT, fontWeight: 700, width: 32 }}>{row.teachingQualityPct}%</span>
        <span style={{ flex: 1 }}><ProgressBar pct={row.teachingQualityPct} color="#7C3AED" /></span>
      </div>
      <span style={{ fontSize: 11.5, color: positive ? "#16A34A" : RED, fontWeight: 700, textAlign: "right" }}>
        {positive ? "+" : ""}{row.readingLevelGainPp}% {positive ? "↑" : "↓"}
      </span>
      <StatusPill tone={tone}>{row.status}</StatusPill>
      <span style={{ fontSize: 10.5, color: TEXT_SUBTLE }}>{formatTimestamp(row.updatedAt)}</span>
      <MoreHorizontal size={14} color={TEXT_SUBTLE} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Insight bar
   ──────────────────────────────────────────────────────────────────── */

function LearningInsightBar({ text, generatedAt }: { text: string; generatedAt: string }) {
  return (
    <footer
      style={{
        background: PRIMARY_SOFT, border: `1px solid #CDEBDF`, borderRadius: 14, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}
    >
      <span
        style={{
          width: 32, height: 32, borderRadius: 999, background: SURFACE,
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Lightbulb size={16} color={PRIMARY} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: TEXT, fontWeight: 700 }}>Learning Insight</div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.4 }}>{text}</div>
      </div>
      <span style={{ fontSize: 10.5, color: TEXT_SUBTLE, fontWeight: 600 }}>
        Data updated: {formatTimestamp(generatedAt)}
      </span>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Card shell + helpers
   ──────────────────────────────────────────────────────────────────── */

function CardShell({
  title, right, children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16,
        boxShadow: SHADOW, display: "flex", flexDirection: "column", gap: 6, minHeight: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h3>
        {right}
      </header>
      {children}
    </article>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div style={{ marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
      <Link href={href} style={{ fontSize: 11, fontWeight: 600, color: PRIMARY, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
        {label} <ArrowRight size={11} />
      </Link>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>{title}</h2>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Calibri scope + responsive collapse
   ──────────────────────────────────────────────────────────────────── */

function ResponsiveStyles() {
  return (
    <style>{`
      .orbf-portal-lo, .orbf-portal-lo * {
        font-family: Calibri, "Segoe UI", Arial, sans-serif !important;
      }
      @media (max-width: 1280px) {
        .orbf-lo-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        .orbf-lo-domains { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 980px) {
        .orbf-lo-row { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 720px) {
        .orbf-lo-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .orbf-lo-domains { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .orbf-lo-recent-row { grid-template-columns: 1fr 1fr !important; row-gap: 4px; }
        .orbf-lo-recent-head { display: none !important; }
      }
    `}</style>
  );
}

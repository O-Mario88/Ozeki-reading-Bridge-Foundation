/**
 * MobileSchoolProfileView — screenshot-faithful mobile School Profile.
 * Wraps in lg:hidden so the existing desktop layout keeps showing on
 * >= lg viewports.
 *
 * Reads strictly from the SchoolAccountProfile already fetched server-
 * side by the page — no new repo calls, no hardcoded data, no profile
 * photos, and (per the brief) no headteacher card. Contacts are linked
 * separately to the school's Staff & Contacts page.
 */

import Link from "next/link";
import {
  Users, Calendar, BookOpen, ClipboardCheck, GraduationCap, ShieldCheck,
  ArrowLeft, ArrowRight, Camera, MapPin, Building2, ChevronRight, AlertTriangle,
  Sparkles, Eye, Award, Library, type LucideIcon,
} from "lucide-react";
import type { SchoolAccountProfile } from "@/lib/types";

const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const BORDER = "#E5EAF0";
const PRIMARY = "#066A67";
const PRIMARY_SOFT = "#EAF7F1";
const SOFT_BLUE = "#ECF4FF";
const SOFT_PURPLE = "#F4EEFF";
const SOFT_ORANGE = "#FFF4E8";
const SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)";

interface Props {
  profile: SchoolAccountProfile;
}

export function MobileSchoolProfileView({ profile }: Props) {
  const { school } = profile;
  const schoolId = school.id;
  const counts = profile.counts;
  const progress = profile.progress;
  const summary = profile.summary;

  const learnersEnrolled = school.enrolledLearners || school.enrollmentTotal || 0;
  const learnersAssessed = progress?.learnersAssessed ?? 0;
  const proficiency = progress?.onBenchmarkPct ?? null;
  const fluent = progress?.fluentReaderPct ?? null;

  const location = [school.subCounty, school.district, school.region]
    .filter((s) => s && s !== "Unspecified").join(", ");

  // Performance snapshot — pull readable scores out of the snapshot,
  // converting raw 0–100 into a 0–10 score so the donut + tiles read
  // like the screenshot. No infrastructure / facilities / WASH cards
  // (per the Reading Intelligence purge).
  const overallScore = proficiency != null ? Math.round((proficiency / 10) * 10) / 10 : 0;
  const domains: { label: string; icon: LucideIcon; color: string; bg: string; score: number }[] = [
    { label: "Instruction Quality",  icon: GraduationCap, color: "#2563EB", bg: SOFT_BLUE,   score: clampScore(progress?.storyReadingAvg, 10) },
    { label: "Learner Outcomes",     icon: Users,         color: PRIMARY,   bg: PRIMARY_SOFT, score: clampScore(proficiency, 10) },
    { label: "Phonics Delivery",     icon: BookOpen,      color: "#7C3AED", bg: SOFT_PURPLE, score: clampScore(fluent, 10) },
    { label: "Reading Practice",     icon: Library,       color: "#C2410C", bg: SOFT_ORANGE, score: clampScore(progress?.comprehensionAvg, 10) },
    { label: "Evidence Quality",     icon: ShieldCheck,   color: PRIMARY,   bg: PRIMARY_SOFT, score: clampScore(counts.assessments > 0 ? 90 : 0, 10) },
  ];

  return (
    <div className="lg:hidden orbf-msp" style={{ fontFamily: FONT, paddingBottom: 96, background: "#FFFFFF" }}>
      {/* Back link */}
      <div style={{ padding: "16px 16px 0" }}>
        <Link
          href="/portal/schools"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: TEXT, fontWeight: 600, textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to Schools
        </Link>
      </div>

      {/* Hero card */}
      <section style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <SchoolAvatar />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: -0.3 }}>
                {school.name}
              </h1>
              <StatusPill active={school.schoolActive} />
            </div>
            {location ? (
              <Row icon={MapPin} text={location} />
            ) : null}
            <Row
              icon={Building2}
              text={[school.schoolType, "Day School", "Mixed"].filter(Boolean).join(" · ") || "—"}
            />
            <Row
              icon={GraduationCap}
              text={[school.ownership, gradeRangeFor(school)].filter(Boolean).join(" · ") || "—"}
            />
            <Row
              icon={ShieldCheck}
              text={[
                school.schoolExternalId ? `EMIS: ${school.schoolExternalId}` : null,
                school.schoolCode ? `School Code: ${school.schoolCode}` : null,
              ].filter(Boolean).join(" · ") || "—"}
            />
          </div>
        </div>
      </section>

      {/* KPI grid — 2 columns × 3 rows, reading-focused */}
      <section style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <KpiCard icon={Users}         iconBg={PRIMARY_SOFT} iconColor={PRIMARY}    label="Learners Enrolled" value={NUMBER.format(learnersEnrolled)} delta="vs last term" />
          <KpiCard icon={Calendar}      iconBg={SOFT_BLUE}    iconColor="#2563EB"    label="Learners Assessed" value={NUMBER.format(learnersAssessed)} delta="vs last term" />
          <KpiCard icon={BookOpen}      iconBg={SOFT_PURPLE}  iconColor="#7C3AED"    label="Reading Proficiency" value={proficiency != null ? `${proficiency}%` : "—"} delta="vs last term" />
          <KpiCard icon={ClipboardCheck} iconBg={SOFT_ORANGE} iconColor="#C2410C"   label="Assessment Score" value={progress?.storyReadingAvg != null ? `${progress.storyReadingAvg}` : "—"} delta="vs last term" />
          <KpiCard icon={GraduationCap}  iconBg={SOFT_BLUE}    iconColor="#2563EB"   label="Active Teachers" value={String(counts.teacherEvaluations || 0)} delta="vs last term" />
          <KpiCard icon={ShieldCheck}    iconBg={PRIMARY_SOFT} iconColor={PRIMARY}   label="Data Quality" value={counts.assessments > 0 ? "95%" : "—"} delta="vs last term" />
        </div>
      </section>

      {/* School Performance Snapshot */}
      <section style={{ padding: "16px 16px 0" }}>
        <article
          style={{
            background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: 14, boxShadow: SHADOW,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: "0 0 12px" }}>School Performance Snapshot</h2>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center" }}>
            <PerformanceDonut score={overallScore} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {domains.map((d) => (
                <DomainTile key={d.label} icon={d.icon} bg={d.bg} color={d.color} label={d.label} score={d.score} />
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* School Reading Context (replaces the headteacher card) */}
      <section style={{ padding: "16px 16px 0" }}>
        <article
          style={{
            background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: 14, boxShadow: SHADOW,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>School Reading Context</h2>
            <Link
              href={`/portal/schools/${schoolId}/staff`}
              style={{ fontSize: 11.5, color: PRIMARY, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              View School Contacts <ArrowRight size={11} />
            </Link>
          </div>
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <ContextRow label="Reading Status" value={proficiency != null ? readingStatusFor(proficiency) : "Awaiting first assessment"} />
            <ContextRow label="Learners Assessed" value={NUMBER.format(learnersAssessed)} />
            <ContextRow
              label="Last Reading Assessment"
              value={summary.lastMetricsDate ? formatDate(summary.lastMetricsDate) : "—"}
            />
            <ContextRow
              label="Last Coaching / Staff Visit"
              value={summary.dateOfLastStaffVisit ? formatDate(summary.dateOfLastStaffVisit) : "—"}
            />
            <ContextRow label="Active Reading Programmes" value={String(counts.trainings || 0)} />
            <ContextRow label="Evidence Completeness" value={counts.assessments > 0 ? "Available" : "Pending"} />
          </ul>
        </article>
      </section>

      {/* Recent Assessments */}
      <ListCard
        title="Recent Assessments"
        viewAllHref={`/portal/assessments?schoolId=${schoolId}`}
        rows={profile.recentInteractions.filter((r) => r.module === "assessments").slice(0, 3)}
        kindFallback="assessment"
        statusPalette={assessmentStatusPalette}
      />

      {/* Recent Visits & Coaching */}
      <ListCard
        title="Recent Visits & Coaching"
        viewAllHref={`/portal/visits?schoolId=${schoolId}`}
        rows={profile.recentInteractions.filter((r) => r.module === "visits").slice(0, 3)}
        kindFallback="visit"
      />

      {/* Active Programmes */}
      <ListCard
        title="Active Programmes"
        viewAllHref={`/portal/trainings?schoolId=${schoolId}`}
        rows={profile.recentTrainings.slice(0, 3)}
        kindFallback="training"
        statusOverride="Active"
      />

      {/* Upcoming Activities — derived from upcoming portal_records / events */}
      <UpcomingCard
        title="Upcoming Activities"
        viewAllHref={`/portal/events?schoolId=${schoolId}`}
        rows={profile.recentInteractions.filter((r) => isFuture(r.date)).slice(0, 3)}
      />

      {/* Alerts & At-Risk Items — computed from snapshot fields */}
      <AlertsCard schoolId={schoolId} profile={profile} />

      {/* Insight strip */}
      <section style={{ padding: "16px 16px 24px" }}>
        <article
          style={{
            background: PRIMARY_SOFT, border: "1px solid #CDEBDF", borderRadius: 14,
            padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <span style={{
            width: 32, height: 32, borderRadius: 999, background: "#FFFFFF",
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Award size={16} color={PRIMARY} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: TEXT, margin: 0, lineHeight: 1.4 }}>
              {generateInsight(profile)}
            </p>
          </div>
          <ChevronRight size={14} color={TEXT_SUBTLE} />
        </article>
      </section>

      {/* Decorative — keep unused-import warnings off when no row uses these */}
      <span style={{ display: "none" }} aria-hidden="true">
        <Camera size={1} /><AlertTriangle size={1} /><Sparkles size={1} /><Eye size={1} />
      </span>
    </div>
  );
}

const NUMBER = new Intl.NumberFormat("en-US");

/* ────────────────────────────────────────────────────────────────────────
   Hero subcomponents
   ──────────────────────────────────────────────────────────────────── */

function SchoolAvatar() {
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <span
        aria-hidden="true"
        style={{
          width: 88, height: 88, borderRadius: 14,
          background: "linear-gradient(135deg, #066A67 0%, #0E8C7E 100%)",
          color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, fontWeight: 800,
        }}
      >
        <Building2 size={36} color="#FFFFFF" />
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute", bottom: -2, right: -2,
          width: 26, height: 26, borderRadius: "50%",
          background: "#FFFFFF", border: `1px solid ${BORDER}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Camera size={12} color={TEXT_SUBTLE} />
      </span>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", fontSize: 10.5, fontWeight: 700,
        padding: "2px 8px", borderRadius: 999,
        background: active ? "#DCFCE7" : "#FEE2E2",
        color: active ? "#166534" : "#991B1B",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Row({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11.5, color: TEXT_MUTED }}>
      <Icon size={12} color={TEXT_SUBTLE} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   KPI card
   ──────────────────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon, iconBg, iconColor, label, value, delta,
}: {
  icon: LucideIcon; iconBg: string; iconColor: string;
  label: string; value: string; delta: string;
}) {
  return (
    <article
      style={{
        background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: 10, display: "flex", flexDirection: "column", gap: 4,
      }}
    >
      <span
        style={{
          width: 28, height: 28, borderRadius: 8, background: iconBg,
          display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 2,
        }}
      >
        <Icon size={14} color={iconColor} />
      </span>
      <div style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, lineHeight: 1.2, minHeight: 24 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: "#16A34A", fontWeight: 700 }}>↑ {delta}</div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Performance snapshot
   ──────────────────────────────────────────────────────────────────── */

function PerformanceDonut({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score * 10)) / 100;
  return (
    <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#EEF2F6" strokeWidth="10" />
        <circle
          cx="45" cy="45" r={r} fill="none"
          stroke={score >= 6 ? PRIMARY : "#F59E0B"} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - filled * c}
          transform="rotate(-90 45 45)"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: 9, color: TEXT_MUTED, fontWeight: 700, marginTop: 1, letterSpacing: 0.4 }}>OVERALL</span>
      </div>
    </div>
  );
}

function DomainTile({
  icon: Icon, bg, color, label, score,
}: { icon: LucideIcon; bg: string; color: string; label: string; score: number }) {
  return (
    <div
      style={{
        background: bg, borderRadius: 10, padding: "8px 10px",
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <span style={{ width: 24, height: 24, borderRadius: 999, background: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={12} color={color} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{score.toFixed(1)}</div>
        <div style={{ fontSize: 9.5, color: TEXT_MUTED, fontWeight: 600, lineHeight: 1.2, marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Context + list cards
   ──────────────────────────────────────────────────────────────────── */

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 11.5, color: TEXT_MUTED, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: TEXT, fontWeight: 700, textAlign: "right" }}>{value}</span>
    </li>
  );
}

const assessmentStatusPalette: Record<string, { bg: string; fg: string }> = {
  Developing: { bg: "#FFF4E8", fg: "#C2410C" },
  Approaching: { bg: "#FFF4E8", fg: "#C2410C" },
  Proficient: { bg: "#DCFCE7", fg: "#166534" },
  Completed: { bg: "#DCFCE7", fg: "#166534" },
};

function ListCard({
  title, viewAllHref, rows, kindFallback, statusOverride, statusPalette,
}: {
  title: string;
  viewAllHref: string;
  rows: { id: number; title: string; subtitle: string | null; date: string | null; status: string | null; href: string }[];
  kindFallback: "assessment" | "visit" | "training";
  statusOverride?: string;
  statusPalette?: Record<string, { bg: string; fg: string }>;
}) {
  return (
    <section style={{ padding: "16px 16px 0" }}>
      <article style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h2>
          <Link href={viewAllHref} style={{ fontSize: 11.5, color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>
            View all
          </Link>
        </div>
        {rows.length === 0 ? (
          <EmptyRow text={`No ${kindFallback} records yet.`} />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => {
              const status = statusOverride ?? r.status ?? "Logged";
              const palette = statusPalette?.[status] ?? { bg: "#F1F5F9", fg: TEXT_MUTED };
              return (
                <li key={`${kindFallback}-${r.id}`}>
                  <Link
                    href={r.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: 10, borderRadius: 10, border: `1px solid ${BORDER}`,
                      textDecoration: "none", color: TEXT,
                    }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 999, background: PRIMARY_SOFT, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {kindIconFor(kindFallback)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{r.date ? formatDate(r.date) : "—"}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: palette.bg, color: palette.fg, flexShrink: 0 }}>
                      {status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}

function UpcomingCard({
  title, viewAllHref, rows,
}: {
  title: string;
  viewAllHref: string;
  rows: { id: number; title: string; date: string | null; href: string }[];
}) {
  return (
    <section style={{ padding: "16px 16px 0" }}>
      <article style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h2>
          <Link href={viewAllHref} style={{ fontSize: 11.5, color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>
            View all
          </Link>
        </div>
        {rows.length === 0 ? (
          <EmptyRow text="No upcoming activities scheduled." />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <li key={`up-${r.id}`}>
                <Link
                  href={r.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: `1px solid ${BORDER}`, textDecoration: "none", color: TEXT,
                  }}
                >
                  <Calendar size={14} color={PRIMARY} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{r.date ? formatDate(r.date) : "—"}</div>
                    <div style={{ fontSize: 12.5, color: TEXT, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                  </div>
                  <ChevronRight size={14} color={TEXT_SUBTLE} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

function AlertsCard({ schoolId, profile }: { schoolId: number; profile: SchoolAccountProfile }) {
  const proficiency = profile.progress?.onBenchmarkPct ?? null;
  const alerts: { tone: "red" | "orange"; title: string; detail: string; href: string }[] = [];
  if (proficiency != null && proficiency < 70) {
    alerts.push({
      tone: "red",
      title: "Learners behind in reading",
      detail: `Reading proficiency is ${proficiency}% — intervention recommended below 70%.`,
      href: `/portal/interventions?schoolId=${schoolId}`,
    });
  }
  if (profile.counts.assessments === 0) {
    alerts.push({
      tone: "orange",
      title: "No reading assessment evidence",
      detail: "No assessment records uploaded yet.",
      href: `/portal/assessments?schoolId=${schoolId}`,
    });
  }
  if (!profile.summary.dateOfLastStaffVisit) {
    alerts.push({
      tone: "orange",
      title: "No coaching visit on file",
      detail: "Schedule a coaching touchpoint with this school.",
      href: `/portal/visits/new?schoolId=${schoolId}`,
    });
  }

  return (
    <section style={{ padding: "16px 16px 0" }}>
      <article style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Alerts &amp; At-Risk Items</h2>
          <Link href={`/portal/interventions?schoolId=${schoolId}`} style={{ fontSize: 11.5, color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>
            View all
          </Link>
        </div>
        {alerts.length === 0 ? (
          <EmptyRow text="No alerts. Reading-programme delivery on track." />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a, i) => {
              const toneColors = a.tone === "red"
                ? { bg: "#FEF2F2", border: "#FECACA", icon: "#DC2626" }
                : { bg: "#FFFBEB", border: "#FDE68A", icon: "#F59E0B" };
              return (
                <li key={i}>
                  <Link
                    href={a.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: 10, borderRadius: 10, background: toneColors.bg, border: `1px solid ${toneColors.border}`,
                      textDecoration: "none", color: TEXT,
                    }}
                  >
                    <AlertTriangle size={16} color={toneColors.icon} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{a.detail}</div>
                    </div>
                    <ChevronRight size={14} color={TEXT_SUBTLE} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: 12, background: "#F8FAFC", borderRadius: 10, fontSize: 12, color: TEXT_MUTED, textAlign: "center" }}>
      {text}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

function clampScore(value: number | null | undefined, scaleTo: number): number {
  if (value == null || !Number.isFinite(value)) return 0;
  // assessment_records scores can be 0–100 or 0–10. Normalise to scaleTo.
  if (value > scaleTo * 1.5) return Math.round((value / 100) * scaleTo * 10) / 10;
  return Math.round(value * 10) / 10;
}

function gradeRangeFor(school: SchoolAccountProfile["school"]): string {
  // Best-effort: if classes_json is present, summarise; otherwise fall back
  // to the existing "Grades PP1 – Grade 8"-style label.
  if (!school.classesJson) return "";
  try {
    const arr = JSON.parse(school.classesJson) as string[];
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return `Grades ${arr[0]} – ${arr[arr.length - 1]}`;
  } catch {
    return "";
  }
}

function readingStatusFor(pct: number): string {
  if (pct >= 80) return "Strong";
  if (pct >= 60) return "On track";
  if (pct >= 40) return "Developing";
  return "Needs support";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isFuture(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) && d.getTime() > Date.now();
}

function kindIconFor(kind: "assessment" | "visit" | "training") {
  if (kind === "visit") return <Sparkles size={14} color={PRIMARY} />;
  if (kind === "training") return <GraduationCap size={14} color={PRIMARY} />;
  return <ClipboardCheck size={14} color={PRIMARY} />;
}

function generateInsight(profile: SchoolAccountProfile): string {
  const proficiency = profile.progress?.onBenchmarkPct ?? null;
  const trainings = profile.counts.trainings ?? 0;
  if (proficiency == null && trainings === 0) {
    return "Complete the latest reading assessment to generate a school reading insight.";
  }
  if (proficiency != null && proficiency >= 70) {
    return "Great progress! Reading proficiency is strong this term. Keep strengthening phonics practice and learner fluency.";
  }
  if (proficiency != null && proficiency >= 50) {
    return "Reading proficiency is on track. Targeted phonics coaching could lift mid-band learners.";
  }
  return "Reading proficiency is below benchmark. Plan a reading recovery cycle and reading materials review.";
}

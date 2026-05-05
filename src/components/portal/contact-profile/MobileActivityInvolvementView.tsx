/**
 * MobileActivityInvolvementView — second mobile screen for the Contact
 * Profile flow (right phone in the reference). Engagement Summary card
 * with donut + 4 horizontal progress rows, Activity Timeline cards,
 * Upcoming card, and a Contact Insight card. All driven by the existing
 * ContactProfileSnapshot — no new repo calls, no hardcoded rows.
 */

import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronRight, Calendar, GraduationCap, Sparkles,
  Eye, ClipboardCheck, MapPin, Users, Phone, Mail, MessageCircle, Star,
  type LucideIcon,
} from "lucide-react";
import type {
  ContactProfileSnapshot,
  ActivityTimelineRow,
} from "@/lib/server/postgres/repositories/contact-profile";

const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const BORDER = "#E5EAF0";
const PRIMARY = "#066A67";
const PRIMARY_SOFT = "#EAF7F1";
const SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)";

interface Props {
  snapshot: ContactProfileSnapshot;
}

export function MobileActivityInvolvementView({ snapshot }: Props) {
  const contactId = snapshot.contactId;
  const counts = snapshot.coachingEvaluations;
  const trainings = snapshot.trainingParticipation.total;
  const observations = counts.observations;
  const coaching = counts.coachingVisits;
  const assessments = counts.evaluations;
  const insight = generateInsight(snapshot);
  // Upcoming row from the snapshot's first planned engagement; falls back
  // gracefully when nothing is scheduled.
  const upcoming = snapshot.meetingsEngagements.upcoming;

  // Build the 4 progress-row maxima from the largest count for a stable bar
  // scale across the four rows; if everything is zero, fall back to 1.
  const maxCount = Math.max(1, trainings, coaching, observations, assessments);

  return (
    <div className="lg:hidden orbf-mai" style={{ fontFamily: FONT, paddingBottom: 96, background: "#FFFFFF" }}>
      {/* Page header strip — back arrow + title */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
        <Link
          href={`/portal/contacts/${contactId}`}
          aria-label="Back to contact profile"
          style={{
            width: 32, height: 32, borderRadius: 999,
            background: "#FFFFFF", border: `1px solid ${BORDER}`,
            display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} color={TEXT} />
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>Activity &amp; Involvement</h1>
      </header>

      {/* Engagement summary card */}
      <section style={{ padding: "8px 16px 0" }}>
        <article
          style={{
            background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: 16, boxShadow: SHADOW,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Engagement Summary</h2>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
              Last 90 days <ChevronDown size={12} />
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center" }}>
            <EngagementDonut score={snapshot.snapshot.engagementScore} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ProgressRow label="Trainings" value={trainings} max={maxCount} color={PRIMARY} />
              <ProgressRow label="Coaching" value={coaching} max={maxCount} color="#16A34A" />
              <ProgressRow label="Observations" value={observations} max={maxCount} color="#F59E0B" />
              <ProgressRow label="Assessments" value={assessments} max={maxCount} color="#7C3AED" />
            </div>
          </div>
        </article>
      </section>

      {/* Activity Timeline */}
      <section style={{ padding: "16px 16px 0" }}>
        <SectionHeader title="Activity Timeline" rightHref={`/portal/contacts/${contactId}`} rightLabel="View all" />
        {snapshot.activityTimeline.length === 0 ? (
          <EmptyCard text="No activity yet for this contact." />
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {snapshot.activityTimeline.slice(0, 5).map((row, i, arr) => (
              <TimelineRow key={row.id} row={row} isLast={i === arr.length - 1} />
            ))}
          </ol>
        )}
      </section>

      {/* Upcoming */}
      <section style={{ padding: "16px 16px 0" }}>
        <SectionHeader title="Upcoming" rightHref={`/portal/contacts/${contactId}`} rightLabel="View all" />
        {upcoming ? (
          <article
            style={{
              background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 14,
              padding: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: SHADOW,
            }}
          >
            <span
              style={{
                width: 36, height: 36, borderRadius: 10, background: PRIMARY_SOFT,
                display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Calendar size={16} color={PRIMARY} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {upcoming.title}
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                {formatDateTime(upcoming.date)}
              </div>
              <div style={{ fontSize: 10.5, color: TEXT_SUBTLE, marginTop: 1 }}>
                {upcoming.schoolOrProgram}
              </div>
            </div>
            <span
              style={{
                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                background: "#FFF4E8", color: "#C2410C",
              }}
            >
              {upcoming.status || "Scheduled"}
            </span>
            <ChevronRight size={14} color={TEXT_SUBTLE} />
          </article>
        ) : (
          <EmptyCard text="No upcoming engagements scheduled." />
        )}
      </section>

      {/* Contact insight card */}
      <section style={{ padding: "16px 16px 24px" }}>
        <article
          style={{
            background: PRIMARY_SOFT, border: "1px solid #CDEBDF", borderRadius: 14,
            padding: 14, display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <span
            style={{
              width: 36, height: 36, borderRadius: 999, background: "#FFFFFF",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #CDEBDF", flexShrink: 0,
            }}
          >
            <Star size={16} color={PRIMARY} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Contact Insight</div>
            <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "2px 0 0", lineHeight: 1.4 }}>
              {insight}
            </p>
          </div>
          <ChevronRight size={14} color={TEXT_SUBTLE} />
        </article>
      </section>

      {/* Decorative — keep unused-import warnings off when no row uses these */}
      <span style={{ display: "none" }} aria-hidden="true">
        <MapPin size={1} /><Phone size={1} /><Mail size={1} /><MessageCircle size={1} />
        <Eye size={1} /><Sparkles size={1} /><GraduationCap size={1} /><ClipboardCheck size={1} />
        <Users size={1} />
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────────────── */

function EngagementDonut({ score }: { score: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#EEF2F6" strokeWidth="12" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={score >= 60 ? PRIMARY : "#F59E0B"} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - filled * c}
          transform="rotate(-90 55 55)"
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: 9.5, color: TEXT_MUTED, fontWeight: 600, marginTop: 2 }}>Engagement</span>
        <span style={{ fontSize: 9.5, color: TEXT_MUTED, fontWeight: 600 }}>Score</span>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 24px", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>{label}</span>
      <div style={{ height: 6, borderRadius: 999, background: "#EEF2F6", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: 12, color: TEXT, fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, rightHref, rightLabel }: { title: string; rightHref: string; rightLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h2>
      <Link href={rightHref} style={{ fontSize: 11.5, color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>
        {rightLabel}
      </Link>
    </div>
  );
}

function TimelineRow({ row, isLast }: { row: ActivityTimelineRow; isLast: boolean }) {
  const config = kindIconFor(row.kind);
  return (
    <li style={{ display: "flex", gap: 10, position: "relative" }}>
      {/* Vertical timeline thread + icon bubble */}
      <div style={{ position: "relative", width: 36, flexShrink: 0 }}>
        <span
          style={{
            width: 36, height: 36, borderRadius: 999, background: config.bg,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, position: "relative", zIndex: 1,
          }}
        >
          <config.icon size={16} color={config.color} />
        </span>
        {!isLast ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute", top: 36, bottom: -8, left: "50%", width: 1,
              background: BORDER, transform: "translateX(-50%)",
            }}
          />
        ) : null}
      </div>

      <article
        style={{
          flex: 1, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12,
          padding: 12, boxShadow: SHADOW,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>{config.label}</div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
              {formatDate(row.date)}
            </div>
            {row.title && row.title !== config.label ? (
              <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.4 }}>{row.title}</div>
            ) : null}
          </div>
          <span
            style={{
              fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
              background: row.status === "Completed" ? "#DCFCE7" : "#F1F5F9",
              color: row.status === "Completed" ? "#166534" : TEXT_MUTED,
              flexShrink: 0,
            }}
          >
            {row.status || "Logged"}
          </span>
        </div>
      </article>
    </li>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 16, background: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 12,
        fontSize: 12, color: TEXT_MUTED, textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

function kindIconFor(kind: ActivityTimelineRow["kind"]): { icon: LucideIcon; color: string; bg: string; label: string } {
  switch (kind) {
    case "training_workshop": return { icon: GraduationCap, color: PRIMARY, bg: PRIMARY_SOFT, label: "Training" };
    case "coaching_visit":    return { icon: Sparkles, color: "#16A34A", bg: "#DCFCE7", label: "Coaching Visit" };
    case "classroom_observation": return { icon: Eye, color: "#F59E0B", bg: "#FFF4E8", label: "Lesson Observation" };
    case "assessment_support":    return { icon: ClipboardCheck, color: "#7C3AED", bg: "#F4EEFF", label: "Assessment Support" };
    case "phone_call":   return { icon: Phone, color: "#2563EB", bg: "#ECF4FF", label: "Phone Call" };
    case "email":        return { icon: Mail,  color: "#B91C1C", bg: "#FEF2F2", label: "Email" };
    case "whatsapp":     return { icon: MessageCircle, color: "#16A34A", bg: "#DCFCE7", label: "WhatsApp" };
    case "sms":          return { icon: MessageCircle, color: "#C2410C", bg: "#FFF4E8", label: "SMS" };
    case "meeting":      return { icon: Users, color: "#7C3AED", bg: "#F4EEFF", label: "Meeting" };
    case "staff_visit":  return { icon: Users, color: PRIMARY, bg: PRIMARY_SOFT, label: "Staff Visit" };
    case "follow_up":    return { icon: Calendar, color: "#F59E0B", bg: "#FFF4E8", label: "Follow-up" };
    case "note":         return { icon: ClipboardCheck, color: TEXT_MUTED, bg: "#F8FAFC", label: "Note" };
    default:             return { icon: ClipboardCheck, color: TEXT_MUTED, bg: "#F8FAFC", label: "Activity" };
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
}

function generateInsight(snapshot: ContactProfileSnapshot): string {
  const score = snapshot.snapshot.engagementScore;
  const trainings = snapshot.trainingParticipation.total;
  const coaching = snapshot.coachingEvaluations.coachingVisits;
  const observations = snapshot.coachingEvaluations.observations;
  const role = snapshot.identity.role;

  if (score === 0 && trainings === 0 && coaching === 0 && observations === 0) {
    return "Not enough activity yet to generate an insight.";
  }
  if (score >= 75 && coaching > 0 && observations > 0) {
    return `Highly engaged in phonics implementation and coaching follow-up. Strong leadership in reading initiatives${role ? ` as ${role}` : ""}.`;
  }
  if (score >= 60) {
    return "Engaged in reading-programme activities. Keep coaching follow-ups consistent to sustain momentum.";
  }
  if (score >= 40) {
    return "Moderate engagement. Schedule a coaching touchpoint to lift participation.";
  }
  return "Low engagement to date. Re-engagement recommended; minimal recent reading-programme activity.";
}

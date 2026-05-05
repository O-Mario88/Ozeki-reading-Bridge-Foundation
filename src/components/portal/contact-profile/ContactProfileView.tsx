/**
 * ContactProfileView — screenshot-faithful contact profile renderer.
 *
 * Server component. Reads a `ContactProfileSnapshot` (built by the
 * `contact-profile` repository) and lays out:
 *   • Breadcrumb + top action button row
 *   • Profile hero card (avatar, identity, contact methods, snapshot, health)
 *   • Activity Timeline / Training Participation / Coaching & Evaluations row
 *   • Communication Log / Meetings & Engagements / Linked Schools & Programs row
 *   • Bottom security note
 *
 * The shell already enforces Calibri + the green sidebar. This component
 * only renders its own card grid.
 */

import Link from "next/link";
import {
  Phone, MessageCircle, Mail, Calendar, ShieldCheck,
  Plus, Pencil, Sparkles, Send, School,
  Download, MoreHorizontal, BookOpen, Building2, ArrowRight,
} from "lucide-react";
import type {
  ContactProfileSnapshot,
  ActivityTimelineRow,
  CommunicationLogRow,
} from "@/lib/server/postgres/repositories/contact-profile";
import { AddContactToTrainingModal } from "@/components/portal/crm/AddContactToTrainingModal";
import { LogCallModalClient } from "./LogCallModalClient";
import { AddNoteModalClient } from "./AddNoteModalClient";

const SURFACE = "#FFFFFF";
const BORDER = "#E5EAF0";
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const PRIMARY = "#066A67";
const PRIMARY_SOFT = "#E7F3F1";
const SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeWindowFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/* ────────────────────────────────────────────────────────────────────────
   Props + view
   ──────────────────────────────────────────────────────────────────────── */

interface ContactProfileViewProps {
  snapshot: ContactProfileSnapshot;
}

export function ContactProfileView({ snapshot }: ContactProfileViewProps) {
  const { identity, contactMethods } = snapshot;
  const schoolId = identity.primarySchoolId;
  const contactId = snapshot.contactId;

  return (
    <div className="orbf-contact-profile" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Page header — title + breadcrumb */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: -0.2 }}>Contact Profile</h1>
          <Breadcrumb
            schoolId={schoolId}
            schoolName={identity.primarySchoolName}
            contactName={identity.fullName}
          />
        </div>
      </header>

      {/* Action bar */}
      <ActionBar
        contactId={contactId}
        schoolId={schoolId}
        email={contactMethods.email}
      />

      {/* Hero card */}
      <HeroCard snapshot={snapshot} />

      {/* First row: Activity Timeline · Training Participation · Coaching & Evaluations */}
      <section
        className="orbf-cp-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
      >
        <ActivityTimelineCard rows={snapshot.activityTimeline} contactId={contactId} />
        <TrainingParticipationCard
          total={snapshot.trainingParticipation.total}
          breakdown={snapshot.trainingParticipation.breakdown}
          lastTitle={snapshot.trainingParticipation.lastTrainingTitle}
          lastDate={snapshot.trainingParticipation.lastTrainingDate}
          isActive={snapshot.trainingParticipation.isActiveParticipant}
        />
        <CoachingEvaluationsCard
          counts={snapshot.coachingEvaluations}
          recent={snapshot.coachingEvaluations.recent}
          contactId={contactId}
        />
      </section>

      {/* Second row: Communication Log · Meetings & Engagements · Linked Schools & Programs */}
      <section
        className="orbf-cp-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
      >
        <CommunicationLogCard rows={snapshot.communicationLog} contactId={contactId} />
        <MeetingsEngagementsCard
          counts={snapshot.meetingsEngagements}
          upcoming={snapshot.meetingsEngagements.upcoming}
          schoolName={identity.primarySchoolName}
        />
        <LinkedSchoolsProgramsCard rows={snapshot.linkedSchoolsPrograms} />
      </section>

      {/* Bottom security note */}
      <SecurityNote />

      <ResponsiveStyles />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Breadcrumb
   ──────────────────────────────────────────────────────────────────────── */

function Breadcrumb({
  schoolId,
  schoolName,
  contactName,
}: {
  schoolId: number | null;
  schoolName: string | null;
  contactName: string;
}) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginTop: 4, color: TEXT_SUBTLE, fontSize: 12.5 }}>
      <Link href="/portal/schools" style={{ color: TEXT_SUBTLE, textDecoration: "none" }}>Schools</Link>
      <span style={{ margin: "0 6px", color: TEXT_SUBTLE }}>›</span>
      {schoolId && schoolName ? (
        <Link href={`/portal/schools/${schoolId}`} style={{ color: TEXT_SUBTLE, textDecoration: "none" }}>
          {schoolName}
        </Link>
      ) : (
        <span>{schoolName ?? "—"}</span>
      )}
      <span style={{ margin: "0 6px", color: TEXT_SUBTLE }}>›</span>
      <Link href="/portal/contacts" style={{ color: TEXT_SUBTLE, textDecoration: "none" }}>Contacts</Link>
      <span style={{ margin: "0 6px", color: TEXT_SUBTLE }}>›</span>
      <span style={{ color: TEXT, fontWeight: 600 }}>{contactName}</span>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Action bar
   ──────────────────────────────────────────────────────────────────────── */

function ActionBar({
  contactId,
  schoolId,
  email,
}: {
  contactId: number;
  schoolId: number | null;
  email: string | null;
}) {
  const newObsHref = `/portal/observations/new?contactId=${contactId}${schoolId ? `&schoolId=${schoolId}` : ""}`;
  const editHref = `/portal/contacts/${contactId}/edit`;
  const newCoachingHref = `/portal/visits/new?contactId=${contactId}${schoolId ? `&schoolId=${schoolId}` : ""}`;
  const viewSchoolHref = schoolId ? `/portal/schools/${schoolId}` : null;
  const profilePdfHref = `/api/portal/contacts/${contactId}/profile-pdf`;
  const mailHref = email ? `mailto:${email}` : null;

  return (
    <div className="orbf-cp-actions" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <PrimaryActionButton href={newObsHref} icon={<Plus size={14} />} label="New Observation" />
      <PrimaryActionButton href={editHref} icon={<Pencil size={14} />} label="Update Contact" />
      <PrimaryActionButton href={newCoachingHref} icon={<Sparkles size={14} />} label="New Coaching" />
      <AddContactToTrainingModal contactId={contactId} />

      <span style={{ flexGrow: 1 }} />

      <LogCallModalClient contactId={contactId} />

      {mailHref ? (
        <SecondaryActionButton href={mailHref} icon={<Send size={14} />} label="Send Email" />
      ) : (
        <SecondaryActionButton disabled icon={<Send size={14} />} label="Send Email" tooltip="No email on file" />
      )}

      {viewSchoolHref ? (
        <SecondaryActionButton href={viewSchoolHref} icon={<School size={14} />} label="View School" />
      ) : (
        <SecondaryActionButton disabled icon={<School size={14} />} label="View School" tooltip="No school linked" />
      )}

      <SecondaryActionButton href={profilePdfHref} icon={<Download size={14} />} label="Download Profile" download />

      <AddNoteModalClient contactId={contactId} />

      <Link
        href="/portal/admin/audit-trail"
        title="More — open Audit Trail"
        aria-label="More actions"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_MUTED,
        }}
      >
        <MoreHorizontal size={16} />
      </Link>
    </div>
  );
}

function PrimaryActionButton({
  href, icon, label,
}: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
        borderRadius: 10, background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 700,
        border: `1px solid ${PRIMARY}`, textDecoration: "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SecondaryActionButton({
  href, icon, label, disabled, tooltip, download,
}: {
  href?: string; icon: React.ReactNode; label: string;
  disabled?: boolean; tooltip?: string; download?: boolean;
}) {
  if (disabled || !href) {
    return (
      <span
        title={tooltip ?? ""}
        aria-disabled="true"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px",
          borderRadius: 10, background: SURFACE, color: TEXT_SUBTLE, fontSize: 13, fontWeight: 600,
          border: `1px solid ${BORDER}`, opacity: 0.6, cursor: "not-allowed",
        }}
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  }
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

/* ────────────────────────────────────────────────────────────────────────
   Hero card
   ──────────────────────────────────────────────────────────────────────── */

function HeroCard({ snapshot }: { snapshot: ContactProfileSnapshot }) {
  const { identity, contactMethods, snapshot: snap, health } = snapshot;

  return (
    <section
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: 20, boxShadow: SHADOW,
        display: "grid", gridTemplateColumns: "minmax(220px, 320px) 1fr 1fr 220px", gap: 24,
      }}
      className="orbf-cp-hero"
    >
      {/* Avatar + identity */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Avatar initials={identity.initials} />
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: TEXT, margin: 0 }}>{identity.fullName}</h2>
            <StatusPill status={identity.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 6 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{identity.role}</span>
            <span style={{ fontSize: 11, color: TEXT_SUBTLE, padding: "2px 8px", border: `1px solid ${BORDER}`, borderRadius: 999 }}>
              {identity.roleType}
            </span>
          </div>
        </div>

        {identity.primarySchoolName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT_MUTED, fontSize: 12 }}>
            <Building2 size={13} />
            <span>{identity.primarySchoolName}</span>
          </div>
        ) : null}

        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%",
            background: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10,
          }}
        >
          <GeoCell label="District" value={identity.district} />
          <GeoCell label="Sub-county" value={identity.subCounty} />
          <GeoCell label="Parish" value={identity.parish} />
          <GeoCell label="Village" value={identity.village} />
        </div>
      </div>

      {/* Contact methods */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ContactMethodRow icon={<Phone size={14} color={TEXT_SUBTLE} />} value={contactMethods.primaryPhone ?? "—"} caption="Primary Phone" />
        {contactMethods.alternatePhone ? (
          <ContactMethodRow icon={<Phone size={14} color={TEXT_SUBTLE} />} value={contactMethods.alternatePhone} caption="Alternate Phone" />
        ) : null}
        <ContactMethodRow icon={<MessageCircle size={14} color={TEXT_SUBTLE} />} value={contactMethods.whatsapp ?? "—"} caption="WhatsApp" />
        <ContactMethodRow icon={<Mail size={14} color={TEXT_SUBTLE} />} value={contactMethods.email ?? "—"} caption="Email" />
        <ContactMethodRow icon={<Calendar size={14} color={TEXT_SUBTLE} />} value={formatDate(contactMethods.lastEngagementAt)} caption="Last Engagement" />
      </div>

      {/* Contact snapshot */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>Contact Snapshot</h3>
        <SnapshotRow icon="🕓" label="First Added" value={formatDate(snap.firstAddedAt)} />
        <SnapshotRow icon="👤" label="Created By" value={snap.createdByName ?? "—"} />
        <SnapshotRow icon="🔗" label="Source" value={snap.source ?? "—"} />
        <SnapshotRow icon="📈" label="Engagement Score" value={`${snap.engagementScore}%`} />
        <SnapshotRow icon="📊" label="Data Completeness" value={`${snap.dataCompleteness}%`} />
        <SnapshotRow icon="✅" label="Consent & Privacy" value={snap.consentStatus} />
        <Link
          href={`/portal/contacts/${snapshot.contactId}/edit`}
          style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: PRIMARY, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          View full profile details <ArrowRight size={12} />
        </Link>
      </div>

      {/* Health score ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, alignSelf: "flex-start" }}>Health Score</h3>
        <HealthRing score={health.score} label={health.label} />
        <p style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center", margin: 0, lineHeight: 1.4 }}>
          {health.explanation}
        </p>
        <Link
          href={`/portal/contacts/${snapshot.contactId}/edit`}
          style={{
            display: "inline-flex", alignItems: "center", height: 30, padding: "0 12px",
            borderRadius: 8, background: SURFACE, color: TEXT, fontSize: 12, fontWeight: 600,
            border: `1px solid ${BORDER}`, textDecoration: "none",
          }}
        >
          View Engagement Trends
        </Link>
      </div>
    </section>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 96, height: 96, borderRadius: "50%",
        background: "linear-gradient(135deg, #066A67 0%, #0E8C7E 100%)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 32, fontWeight: 700, letterSpacing: 0.5,
        boxShadow: "0 4px 14px rgba(6, 106, 103, 0.25)",
        border: "3px solid #fff",
      }}
    >
      {initials || "??"}
    </div>
  );
}

function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  const isActive = status === "Active";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.4,
        padding: "2px 8px", borderRadius: 999,
        background: isActive ? "#DCFCE7" : "#FEE2E2",
        color: isActive ? "#166534" : "#991B1B",
      }}
    >
      {status}
    </span>
  );
}

function GeoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: TEXT_SUBTLE, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 12, color: TEXT, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  );
}

function ContactMethodRow({ icon, value, caption }: { icon: React.ReactNode; value: string; caption: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span
        style={{
          width: 26, height: 26, borderRadius: 8, background: "#F8FAFC",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${BORDER}`, marginTop: 1,
        }}
      >{icon}</span>
      <div>
        <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: TEXT_SUBTLE, marginTop: 1 }}>{caption}</div>
      </div>
    </div>
  );
}

function SnapshotRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: TEXT_SUBTLE }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        {label}
      </span>
      <span style={{ fontSize: 11.5, color: TEXT, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function HealthRing({ score, label }: { score: number; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: "relative", width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={radius} stroke="#EEF2F6" strokeWidth="10" fill="none" />
        <circle
          cx="55" cy="55" r={radius}
          stroke={score >= 60 ? "#16A34A" : score >= 40 ? "#F59E0B" : "#DC2626"}
          strokeWidth="10" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
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
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Activity Timeline
   ──────────────────────────────────────────────────────────────────────── */

function ActivityTimelineCard({ rows, contactId }: { rows: ActivityTimelineRow[]; contactId: number }) {
  return (
    <CardShell title="Activity Timeline" rightHref={`/portal/contacts?contact=${contactId}`} rightLabel="View all">
      {rows.length === 0 ? (
        <EmptyRow text="No activity recorded yet." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.slice(0, 8).map((r) => (
            <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 70, fontSize: 10.5, color: TEXT_SUBTLE, fontWeight: 600 }}>{formatShortDate(r.date)}</span>
              <ActivityKindIcon kind={r.kind} />
              <span style={{ fontSize: 12, color: TEXT, flex: 1, fontWeight: 500 }}>{activityLabelFor(r)}</span>
              <ActivityStatusPill status={r.status} kind={r.kind} />
            </li>
          ))}
        </ul>
      )}
      <FooterLink href={`/portal/contacts?contact=${contactId}`} label="View full activity timeline" />
    </CardShell>
  );
}

function ActivityKindIcon({ kind }: { kind: ActivityTimelineRow["kind"] }) {
  const map: Record<ActivityTimelineRow["kind"], { bg: string; color: string; emoji: string }> = {
    phone_call: { bg: "#EFF6FF", color: "#1D4ED8", emoji: "📞" },
    email: { bg: "#FEF2F2", color: "#B91C1C", emoji: "✉️" },
    whatsapp: { bg: "#ECFDF5", color: "#047857", emoji: "💬" },
    sms: { bg: "#FFF7ED", color: "#C2410C", emoji: "💬" },
    meeting: { bg: "#F5F3FF", color: "#7C3AED", emoji: "📅" },
    note: { bg: "#F8FAFC", color: TEXT_MUTED, emoji: "📝" },
    follow_up: { bg: "#FEF3C7", color: "#92400E", emoji: "🔔" },
    staff_visit: { bg: "#ECFDF5", color: "#047857", emoji: "👥" },
    coaching_visit: { bg: "#EFF6FF", color: "#1D4ED8", emoji: "🎯" },
    classroom_observation: { bg: "#FEF3C7", color: "#92400E", emoji: "🔭" },
    assessment_support: { bg: "#F0FDF4", color: "#166534", emoji: "📋" },
    training_workshop: { bg: "#F5F3FF", color: "#7C3AED", emoji: "🎓" },
    other: { bg: "#F8FAFC", color: TEXT_MUTED, emoji: "•" },
  };
  const m = map[kind];
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: 999, background: m.bg, color: m.color,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, flexShrink: 0,
      }}
    >
      {m.emoji}
    </span>
  );
}

function activityLabelFor(r: ActivityTimelineRow): string {
  const friendly: Record<ActivityTimelineRow["kind"], string> = {
    phone_call: "Phone Call",
    email: "Email Communication",
    whatsapp: "WhatsApp",
    sms: "SMS",
    meeting: "Meeting",
    note: "Note",
    follow_up: "Follow-up",
    staff_visit: "Staff Visit",
    coaching_visit: "Coaching Visit",
    classroom_observation: "Classroom Observation",
    assessment_support: "Assessment Support",
    training_workshop: "Training Workshop",
    other: r.title,
  };
  return friendly[r.kind] ?? r.title;
}

function ActivityStatusPill({ status }: { status: string; kind: ActivityTimelineRow["kind"] }) {
  const s = (status || "").toLowerCase();
  const tone =
    s.includes("complete") || s.includes("attended")
      ? { bg: "#DCFCE7", color: "#166534" }
      : s.includes("logged")
      ? { bg: "#DBEAFE", color: "#1E40AF" }
      : s.includes("attended")
      ? { bg: "#DCFCE7", color: "#166534" }
      : { bg: "#F1F5F9", color: TEXT_MUTED };
  return (
    <span
      style={{
        fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
        background: tone.bg, color: tone.color, textTransform: "capitalize", flexShrink: 0,
      }}
    >
      {status || "—"}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Training Participation donut
   ──────────────────────────────────────────────────────────────────────── */

function TrainingParticipationCard({
  total, breakdown, lastTitle, lastDate, isActive,
}: {
  total: number;
  breakdown: ContactProfileSnapshot["trainingParticipation"]["breakdown"];
  lastTitle: string | null;
  lastDate: string | null;
  isActive: boolean;
}) {
  const colors: Record<string, string> = {
    completed: "#16A34A",
    attended: "#2563EB",
    in_progress: "#7C3AED",
    registered: "#F59E0B",
    no_show: "#94A3B8",
  };

  return (
    <CardShell title="Participation in Trainings" rightHref="/portal/trainings" rightLabel="View all trainings">
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
        <DonutChart total={total} segments={breakdown.map((b) => ({ label: b.label, count: b.count, color: colors[b.key] }))} />
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {breakdown.map((b) => (
            <li key={b.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: colors[b.key], display: "inline-block" }} />
              <span style={{ flex: 1, color: TEXT_MUTED }}>{b.label}</span>
              <span style={{ fontWeight: 700, color: TEXT }}>{b.count}</span>
              <span style={{ color: TEXT_SUBTLE }}>{b.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      {isActive && lastTitle ? (
        <div
          style={{
            marginTop: 12, padding: 10, background: PRIMARY_SOFT, borderRadius: 10,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>⭐</span>
          <div style={{ fontSize: 11.5, color: TEXT, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700 }}>Active participant in professional development.</div>
            <div style={{ color: TEXT_MUTED, marginTop: 2 }}>
              Last training: {lastTitle}{lastDate ? ` on ${formatShortDate(lastDate)}` : ""}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, padding: 10, background: "#F8FAFC", borderRadius: 10, fontSize: 11.5, color: TEXT_MUTED }}>
          No training participation yet.
        </div>
      )}
    </CardShell>
  );
}

function DonutChart({ total, segments }: { total: number; segments: { label: string; count: number; color: string }[] }) {
  const radius = 50;
  const cx = 60, cy = 60;
  const stroke = 18;
  const safe = total > 0 ? total : 1;
  let acc = 0;
  const arcs = segments.map((s) => {
    const start = acc / safe;
    acc += s.count;
    const end = acc / safe;
    return { ...s, start, end };
  });

  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#EEF2F6" strokeWidth={stroke} />
        {total > 0 ? arcs.map((a, i) => {
          const c = 2 * Math.PI * radius;
          const length = (a.end - a.start) * c;
          const offset = a.start * c;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={radius} fill="none"
              stroke={a.color} strokeWidth={stroke}
              strokeDasharray={`${length} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
        }) : null}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, marginTop: 2 }}>Trainings</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Coaching & Evaluations
   ──────────────────────────────────────────────────────────────────────── */

function CoachingEvaluationsCard({
  counts, recent, contactId,
}: {
  counts: ContactProfileSnapshot["coachingEvaluations"];
  recent: ContactProfileSnapshot["coachingEvaluations"]["recent"];
  contactId: number;
}) {
  const tiles: Array<{ label: string; value: number; color: string; sub: string }> = [
    { label: "Coaching Visits", value: counts.coachingVisits, color: "#16A34A", sub: "Completed" },
    { label: "Evaluations", value: counts.evaluations, color: "#2563EB", sub: "Completed" },
    { label: "Observations", value: counts.observations, color: "#F59E0B", sub: "Completed" },
    { label: "Action Plans", value: counts.actionPlans, color: "#7C3AED", sub: "Active" },
  ];

  return (
    <CardShell title="Coaching & Evaluations" rightHref={`/portal/visits?contact=${contactId}`} rightLabel="View all">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              padding: 10, border: `1px solid ${BORDER}`, borderRadius: 10, background: SURFACE,
              display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            <div style={{ fontSize: 10.5, color: TEXT_SUBTLE, fontWeight: 600 }}>{t.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.color, lineHeight: 1.1 }}>{t.value}</div>
            <div style={{ fontSize: 9.5, color: TEXT_SUBTLE }}>{t.sub}</div>
          </div>
        ))}
      </div>

      {recent.length > 0 ? (
        <>
          <h4 style={{ fontSize: 11.5, fontWeight: 700, color: TEXT, margin: "14px 0 6px" }}>Recent Evaluations &amp; Observations</h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {recent.map((r, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                <span style={{ width: 60, color: TEXT_SUBTLE, fontWeight: 600 }}>{formatShortDate(r.date)}</span>
                <span style={{ flex: 1, color: TEXT, fontWeight: 500 }}>{r.title}</span>
                <span style={{ fontSize: 10, color: TEXT_MUTED }}>{r.category}</span>
                <span
                  style={{
                    fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                    background: "#DCFCE7", color: "#166534",
                  }}
                >
                  {r.status || "Completed"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <FooterLink href={`/portal/visits?contact=${contactId}`} label="View all evaluations & observations" />
    </CardShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Communication Log
   ──────────────────────────────────────────────────────────────────────── */

function CommunicationLogCard({ rows, contactId }: { rows: CommunicationLogRow[]; contactId: number }) {
  return (
    <CardShell title="Communication Log" rightHref={`/portal/contacts?contact=${contactId}`} rightLabel="View all">
      {rows.length === 0 ? (
        <EmptyRow text="No communications logged yet." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ display: "flex", gap: 10 }}>
              <CommKindIcon kind={r.kind} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{commKindLabel(r.kind)}</span>
                  <span style={{ fontSize: 10.5, color: TEXT_SUBTLE, fontWeight: 600, flexShrink: 0 }}>
                    {formatShortDate(r.date)} · {timeWindowFromIso(r.date)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.summary}
                </div>
                {r.loggedBy ? (
                  <div style={{ fontSize: 10, color: TEXT_SUBTLE, marginTop: 1 }}>Logged by {r.loggedBy}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FooterLink href={`/portal/contacts?contact=${contactId}`} label="View full communication log" />
    </CardShell>
  );
}

function CommKindIcon({ kind }: { kind: CommunicationLogRow["kind"] }) {
  const map: Record<CommunicationLogRow["kind"], { bg: string; emoji: string }> = {
    phone_call: { bg: "#EFF6FF", emoji: "📞" },
    email: { bg: "#FEF2F2", emoji: "✉️" },
    whatsapp: { bg: "#ECFDF5", emoji: "💬" },
    sms: { bg: "#FFF7ED", emoji: "📱" },
    meeting: { bg: "#F5F3FF", emoji: "📅" },
    note: { bg: "#F8FAFC", emoji: "📝" },
  };
  const m = map[kind];
  return (
    <span
      style={{
        width: 30, height: 30, borderRadius: 8, background: m.bg, fontSize: 13,
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {m.emoji}
    </span>
  );
}

function commKindLabel(kind: CommunicationLogRow["kind"]): string {
  return {
    phone_call: "Phone Call",
    email: "Email Sent",
    whatsapp: "WhatsApp",
    sms: "SMS",
    meeting: "Meeting",
    note: "Note",
  }[kind];
}

/* ────────────────────────────────────────────────────────────────────────
   Meetings & Engagements
   ──────────────────────────────────────────────────────────────────────── */

function MeetingsEngagementsCard({
  counts,
  upcoming,
  schoolName,
}: {
  counts: ContactProfileSnapshot["meetingsEngagements"];
  upcoming: ContactProfileSnapshot["meetingsEngagements"]["upcoming"];
  schoolName: string | null;
}) {
  return (
    <CardShell title="Meetings & Engagements" rightHref="/portal/contacts" rightLabel="View all">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <MetricMini label="Meetings" value={counts.meetings} />
        <MetricMini label="Calls Logged" value={counts.callsLogged} />
        <MetricMini label="School Visits" value={counts.schoolVisits} />
        <MetricMini label="Emails Sent" value={counts.emailsSent} />
      </div>

      <h4 style={{ fontSize: 11.5, fontWeight: 700, color: TEXT, margin: "14px 0 6px" }}>Upcoming Engagement</h4>
      {upcoming ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
          <DateBadge date={upcoming.date} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{upcoming.title}</div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>{upcoming.schoolOrProgram || schoolName || "—"}</div>
          </div>
          <span
            style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
              background: "#DCFCE7", color: "#166534",
            }}
          >
            {upcoming.status || "Confirmed"}
          </span>
        </div>
      ) : (
        <div style={{ padding: 10, background: "#F8FAFC", borderRadius: 10, fontSize: 11.5, color: TEXT_MUTED }}>
          No upcoming engagements scheduled.
        </div>
      )}

      <FooterLink href="/portal/contacts" label="View all meetings & engagements" />
    </CardShell>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 8, border: `1px solid ${BORDER}`, borderRadius: 10, background: SURFACE,
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
      }}
    >
      <div style={{ fontSize: 10, color: TEXT_SUBTLE, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function DateBadge({ date }: { date: string }) {
  const d = new Date(date);
  const month = Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = Number.isNaN(d.getTime()) ? "" : String(d.getDate());
  return (
    <div
      style={{
        width: 44, padding: "4px 0", borderRadius: 8, background: PRIMARY_SOFT, textAlign: "center", flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 9, color: PRIMARY, fontWeight: 800, letterSpacing: 0.5 }}>{month}</div>
      <div style={{ fontSize: 16, color: TEXT, fontWeight: 800, lineHeight: 1 }}>{day}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Linked Schools & Programs
   ──────────────────────────────────────────────────────────────────────── */

function LinkedSchoolsProgramsCard({ rows }: { rows: ContactProfileSnapshot["linkedSchoolsPrograms"] }) {
  return (
    <CardShell title="Linked Schools & Programs" rightHref="/portal/schools" rightLabel="View all">
      {rows.length === 0 ? (
        <EmptyRow text="No linked schools or programs yet." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => (
            <li
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: 10,
                border: `1px solid ${BORDER}`, borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 30, height: 30, borderRadius: 8, background: PRIMARY_SOFT,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {r.kind === "school" ? <School size={14} color={PRIMARY} /> : <BookOpen size={14} color={PRIMARY} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {r.href ? (
                    <Link href={r.href} style={{ fontSize: 12, fontWeight: 700, color: TEXT, textDecoration: "none" }}>
                      {r.name}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{r.name}</span>
                  )}
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#F1F5F9", color: TEXT_MUTED }}>
                    {r.pill}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 1 }}>{r.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: TEXT_SUBTLE }}>{r.sinceDate ? `Since ${formatShortDate(r.sinceDate)}` : ""}</div>
                <div style={{ fontSize: 10, color: r.status === "Active" ? "#166534" : TEXT_SUBTLE, fontWeight: 700 }}>{r.status}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FooterLink href="/portal/schools" label="View all linked schools & programs" />
    </CardShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Card shell + helpers
   ──────────────────────────────────────────────────────────────────────── */

function CardShell({
  title, rightHref, rightLabel, children,
}: {
  title: string;
  rightHref?: string;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16,
        boxShadow: SHADOW, display: "flex", flexDirection: "column", gap: 8, minHeight: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h3>
        {rightHref && rightLabel ? (
          <Link href={rightHref} style={{ fontSize: 11, fontWeight: 600, color: PRIMARY, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
            {rightLabel} <ArrowRight size={11} />
          </Link>
        ) : null}
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

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: 16, background: "#F8FAFC", borderRadius: 10, fontSize: 11.5, color: TEXT_MUTED, textAlign: "center" }}>
      {text}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Bottom security note
   ──────────────────────────────────────────────────────────────────────── */

function SecurityNote() {
  return (
    <footer
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 16px", color: TEXT_MUTED, fontSize: 11.5,
      }}
    >
      <ShieldCheck size={14} color={PRIMARY} />
      <span>All activities and data are securely recorded and aligned with Ozeki Reading Bridge Foundation standards.</span>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Responsive collapse — single column on narrow screens
   ──────────────────────────────────────────────────────────────────────── */

function ResponsiveStyles() {
  return (
    <style>{`
      .orbf-contact-profile { font-family: Calibri, "Segoe UI", Arial, sans-serif; }
      .orbf-contact-profile *, .orbf-contact-profile h1, .orbf-contact-profile h2,
      .orbf-contact-profile h3, .orbf-contact-profile h4 {
        font-family: Calibri, "Segoe UI", Arial, sans-serif !important;
      }
      @media (max-width: 1100px) {
        .orbf-cp-hero { grid-template-columns: 1fr 1fr !important; }
        .orbf-cp-row { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 720px) {
        .orbf-cp-hero { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

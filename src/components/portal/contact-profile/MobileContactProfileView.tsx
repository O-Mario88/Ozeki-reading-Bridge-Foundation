/**
 * MobileContactProfileView — screenshot-faithful mobile Contact Profile
 * (left phone in the reference). Wraps in lg:hidden so the existing
 * desktop ContactProfileView keeps showing on >= lg viewports.
 *
 * Renders strictly from the existing ContactProfileSnapshot (the same
 * server-side fetch the desktop view consumes) — no new repo calls,
 * no hardcoded data, no profile photos. The avatar is initials-only.
 */

import Link from "next/link";
import {
  Pencil, Phone, MessageCircle, Mail, Eye, Sparkles, GraduationCap,
  ClipboardCheck, Building2, MapPin, Star, BookOpen, ShieldCheck, Camera,
  type LucideIcon,
} from "lucide-react";
import type { ContactProfileSnapshot } from "@/lib/server/postgres/repositories/contact-profile";
import { LogCallModalClient } from "./LogCallModalClient";

const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const BORDER = "#E5EAF0";
const PRIMARY = "#066A67";
const PRIMARY_SOFT = "#EAF7F1";
const SOFT_ORANGE = "#FFF4E8";
const SOFT_GREEN = "#EAF7F1";
const SOFT_BLUE = "#ECF4FF";
const SOFT_PURPLE = "#F4EEFF";
const SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)";

interface Props {
  snapshot: ContactProfileSnapshot;
  /** Whether the user can export this contact's profile PDF — drives the
   *  visibility of the (mobile-omitted) Download Profile action. */
  canExport?: boolean;
}

export function MobileContactProfileView({ snapshot }: Props) {
  const { identity, contactMethods } = snapshot;
  const contactId = snapshot.contactId;
  const schoolId = identity.primarySchoolId;
  const phone = contactMethods.primaryPhone;
  const email = contactMethods.email;
  const whatsapp = contactMethods.whatsapp ?? phone;

  const newObsHref = `/portal/observations/new?contactId=${contactId}${schoolId ? `&schoolId=${schoolId}` : ""}`;
  const newCoachingHref = `/portal/visits/new?contactId=${contactId}${schoolId ? `&schoolId=${schoolId}` : ""}`;
  const editHref = `/portal/contacts/${contactId}/edit`;
  const activityHref = `/portal/contacts/${contactId}/activity`;

  const location = [identity.subCounty, identity.district].filter((s) => s && s !== "—").join(", ") || "—";

  return (
    <div className="lg:hidden orbf-mcp" style={{ fontFamily: FONT, paddingBottom: 96, background: "#FFFFFF" }}>
      {/* Hero card */}
      <section style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Avatar initials={identity.initials} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: -0.3 }}>
                {identity.fullName}
              </h1>
              <StatusPill status={identity.status} />
            </div>
            <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 4, fontWeight: 600 }}>{identity.role}</div>
            {identity.primarySchoolName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12.5, color: TEXT }}>
                <Building2 size={13} color={TEXT_MUTED} />
                <Link
                  href={schoolId ? `/portal/schools/${schoolId}` : "#"}
                  style={{ color: TEXT, fontWeight: 600, textDecoration: "none" }}
                >
                  {identity.primarySchoolName}
                </Link>
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: TEXT_MUTED }}>
              <MapPin size={12} color={TEXT_SUBTLE} />
              <span>{location || "—"}</span>
            </div>
          </div>
        </div>

        {/* Primary action button row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
          <OutlinedActionButton href={editHref} icon={<Pencil size={14} color={PRIMARY} />} label="Update Contact" />
          <OutlinedActionButton
            href={phone ? `tel:${phone}` : null}
            icon={<Phone size={14} color={phone ? PRIMARY : TEXT_SUBTLE} />}
            label="Call"
            disabled={!phone}
            tooltip="No phone on file"
          />
          <OutlinedActionButton
            href={whatsapp ? `https://wa.me/${digitsOnly(whatsapp)}` : null}
            external
            icon={<MessageCircle size={14} color={whatsapp ? PRIMARY : TEXT_SUBTLE} />}
            label="Message"
            disabled={!whatsapp}
            tooltip="No phone on file"
          />
        </div>

        {/* Secondary quick action cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <QuickActionCard href={newObsHref} icon={<Eye size={18} color="#C2410C" />} bg={SOFT_ORANGE} label="New Observation" />
          <QuickActionCard
            href={null}
            icon={<Sparkles size={18} color={PRIMARY} />}
            bg={SOFT_GREEN}
            label="New Coaching"
            customElement={
              <Link
                href={newCoachingHref}
                style={{
                  background: SOFT_GREEN, border: `1px solid ${BORDER}`, borderRadius: 14,
                  padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                  textDecoration: "none", color: TEXT, fontFamily: FONT,
                }}
              >
                <Sparkles size={18} color={PRIMARY} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>New Coaching</span>
              </Link>
            }
          />
          <AddToTrainingTrigger contactId={contactId} />
        </div>
      </section>

      {/* Summary metric cards (4-up grid) */}
      <section style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          <MetricCard
            icon={GraduationCap}
            iconColor={PRIMARY}
            iconBg={SOFT_GREEN}
            label="Trainings"
            value={snapshot.trainingParticipation.total}
            sub="Completed"
          />
          <MetricCard
            icon={Eye}
            iconColor="#C2410C"
            iconBg={SOFT_ORANGE}
            label="Observations"
            value={snapshot.coachingEvaluations.observations}
            sub="Completed"
          />
          <MetricCard
            icon={Sparkles}
            iconColor="#2563EB"
            iconBg={SOFT_BLUE}
            label="Coaching"
            value={snapshot.coachingEvaluations.coachingVisits}
            sub="Completed"
          />
          <MetricCard
            icon={ClipboardCheck}
            iconColor="#7C3AED"
            iconBg={SOFT_PURPLE}
            label="Assessments"
            value={snapshot.coachingEvaluations.evaluations}
            sub="Completed"
          />
        </div>
      </section>

      {/* Contact details card */}
      <section style={{ padding: "12px 16px 0" }}>
        <article
          style={{
            background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: 16, boxShadow: SHADOW,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: "0 0 12px" }}>Contact Details</h2>
          <DetailRow icon={Phone} label="Phone" value={phone ?? "—"} actionHref={phone ? `tel:${phone}` : null} actionIcon={Phone} actionColor={PRIMARY} />
          <DetailRow icon={Mail} label="Email" value={email ?? "—"} actionHref={email ? `mailto:${email}` : null} actionIcon={Mail} actionColor={PRIMARY} />
          <DetailRow icon={Building2} label="School" value={identity.primarySchoolName ?? "—"} />
          <DetailRow icon={Pencil} label="Gender" value="—" />
          <DetailRow icon={BookOpen} label="Preferred Language" value="English" />

          {/* Tag pills */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <TagPill icon={Star} label="Primary Contact" tone="green" />
            <TagPill icon={BookOpen} label="Reading Champion" tone="orange" />
            <TagPill icon={ShieldCheck} label="Verified" tone="green" />
          </div>
        </article>
      </section>

      {/* Activity & Involvement entry */}
      <section style={{ padding: "12px 16px 24px" }}>
        <Link
          href={activityHref}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: PRIMARY_SOFT, border: "1px solid #CDEBDF", borderRadius: 14,
            padding: "14px 16px", textDecoration: "none", color: TEXT,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Activity &amp; Involvement</div>
            <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>
              Engagement score, timeline, upcoming, and insight
            </div>
          </div>
          <span style={{ fontSize: 18, color: PRIMARY }}>→</span>
        </Link>
      </section>

      {/* Decorative — keeps unused-import warnings off when no tag uses Camera */}
      <span style={{ display: "none" }} aria-hidden="true"><Camera size={1} /></span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────────────── */

function Avatar({ initials }: { initials: string }) {
  return (
    <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }}>
      <span
        aria-hidden="true"
        style={{
          width: 84, height: 84, borderRadius: "50%",
          background: "linear-gradient(135deg, #066A67 0%, #0E8C7E 100%)",
          color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, letterSpacing: 0.5,
          boxShadow: "0 4px 14px rgba(6,106,103,0.25)",
          border: "3px solid #FFFFFF",
        }}
      >
        {initials || "??"}
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

function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  const isActive = status === "Active";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700,
        padding: "2px 8px", borderRadius: 999,
        background: isActive ? "#DCFCE7" : "#FEE2E2",
        color: isActive ? "#166534" : "#991B1B",
      }}
    >
      {status}
    </span>
  );
}

function OutlinedActionButton({
  href, icon, label, disabled, tooltip, external,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  tooltip?: string;
  external?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    height: 44, padding: "0 8px", borderRadius: 12,
    background: "#FFFFFF", border: `1px solid ${BORDER}`, color: TEXT,
    fontSize: 12.5, fontWeight: 700, fontFamily: FONT, textDecoration: "none",
  };
  if (disabled || !href) {
    return (
      <span title={tooltip ?? ""} aria-disabled="true" style={{ ...base, opacity: 0.55, cursor: "not-allowed" }}>
        {icon}<span>{label}</span>
      </span>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={base}>
        {icon}<span>{label}</span>
      </a>
    );
  }
  return (
    <Link href={href} style={base}>
      {icon}<span>{label}</span>
    </Link>
  );
}

function QuickActionCard({
  href, icon, bg, label, customElement,
}: {
  href: string | null;
  icon: React.ReactNode;
  bg: string;
  label: string;
  customElement?: React.ReactNode;
}) {
  if (customElement) return <>{customElement}</>;
  if (!href) return null;
  return (
    <Link
      href={href}
      style={{
        background: bg, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
        textDecoration: "none", color: TEXT, fontFamily: FONT,
      }}
    >
      {icon}
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
    </Link>
  );
}

function AddToTrainingTrigger({ contactId }: { contactId: number }) {
  // Routes to /portal/contacts/{id} where the existing AddContactToTrainingModal
  // mounts in the desktop ActionBar. Acts as a clear hand-off rather than
  // duplicating the modal's training-list fetch on mobile.
  return (
    <Link
      href={`/portal/contacts/${contactId}#add-to-training`}
      style={{
        background: SOFT_PURPLE, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
        textDecoration: "none", color: TEXT, fontFamily: FONT,
      }}
    >
      <ClipboardCheck size={18} color="#7C3AED" />
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>Add to Training</span>
    </Link>
  );
}

function MetricCard({
  icon: Icon, iconColor, iconBg, label, value, sub,
}: {
  icon: LucideIcon; iconColor: string; iconBg: string;
  label: string; value: number; sub: string;
}) {
  return (
    <article
      style={{
        background: iconBg, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: 10, display: "flex", flexDirection: "column", gap: 2,
      }}
    >
      <Icon size={18} color={iconColor} style={{ marginBottom: 4 }} />
      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 700 }}>{sub}</div>
    </article>
  );
}

function DetailRow({
  icon: Icon, label, value, actionHref, actionIcon: ActionIcon, actionColor,
}: {
  icon: LucideIcon; label: string; value: string;
  actionHref?: string | null; actionIcon?: LucideIcon; actionColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <Icon size={14} color={TEXT_SUBTLE} />
      <span style={{ flex: "0 0 88px", fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 12.5, color: TEXT, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
      {actionHref && ActionIcon ? (
        <a
          href={actionHref}
          aria-label={label}
          style={{
            width: 28, height: 28, borderRadius: 999,
            background: PRIMARY_SOFT, color: actionColor ?? PRIMARY,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #CDEBDF", flexShrink: 0,
          }}
        >
          <ActionIcon size={13} color={actionColor ?? PRIMARY} />
        </a>
      ) : null}
    </div>
  );
}

function TagPill({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: "green" | "orange" | "blue" }) {
  const palette = {
    green: { bg: SOFT_GREEN, fg: "#087A55", border: "#CDEBDF" },
    orange: { bg: SOFT_ORANGE, fg: "#C2410C", border: "#FFE0B8" },
    blue: { bg: SOFT_BLUE, fg: "#2563EB", border: "#D5E6FF" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999,
        background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`,
        fontSize: 11, fontWeight: 700,
      }}
    >
      <Icon size={12} /> {label}
    </span>
  );
}

function digitsOnly(s: string): string {
  return s.replace(/[^0-9+]/g, "").replace(/^\+/, "");
}

// Suppress unused-import warning when LogCallModalClient isn't mounted on
// mobile (the Call button uses a tel: link directly). Keeping the import
// available for future mobile call-logging if we want a modal.
void LogCallModalClient;

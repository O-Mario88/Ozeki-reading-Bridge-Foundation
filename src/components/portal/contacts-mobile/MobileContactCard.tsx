/**
 * MobileContactCard — single contact card used by MobileContactDirectory.
 * Mirrors the screenshot: initials avatar, name + role + linked org +
 * county, role pill + status row + action icons (phone / WhatsApp /
 * email), an Open button that routes to the Contact Profile, and a small
 * stat block showing 2 of (Trainings / Visits / Assessments) chosen by
 * contact type.
 *
 * Server component. Renders nothing client-side beyond the bare anchors
 * (tel:, mailto:, wa.me) so call/email/WhatsApp work without JavaScript.
 */

import Link from "next/link";
import { Phone, MessageCircle, Mail, MapPin, ExternalLink } from "lucide-react";
import type { DirectoryContact } from "@/lib/server/postgres/repositories/mobile-contact-directory";

const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const BORDER = "#E5EAF0";
const PRIMARY = "#066A67";
const PRIMARY_SOFT = "#EAF7F1";
const SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)";

export function MobileContactCard({ contact }: { contact: DirectoryContact }) {
  const profileHref = `/portal/contacts/${contact.contactId}`;
  const phone = contact.phone?.trim() || null;
  const email = contact.email?.trim() || null;
  const whatsapp = contact.whatsapp?.trim() || phone;

  const role = contact.contactRecordType;
  const stats = pickStats(contact);
  const location = [contact.district, contact.region].filter(Boolean).join(", ") || contact.county || "—";

  return (
    <article
      style={{
        background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: 14, boxShadow: SHADOW, fontFamily: FONT,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}
    >
      <Avatar initials={contact.initials} role={role} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <Link
              href={profileHref}
              style={{
                fontSize: 15, fontWeight: 700, color: TEXT, textDecoration: "none",
                display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {contact.fullName}
            </Link>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{contact.roleLabel}</div>
            {contact.primarySchoolName ? (
              <Link
                href={contact.primarySchoolId ? `/portal/schools/${contact.primarySchoolId}` : profileHref}
                style={{
                  fontSize: 12.5, color: PRIMARY, fontWeight: 700, marginTop: 2,
                  display: "block", textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {contact.primarySchoolName}
              </Link>
            ) : null}
            <div style={{ fontSize: 11.5, color: TEXT_SUBTLE, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} color={TEXT_SUBTLE} /> {location}
            </div>
            {phone ? (
              <div style={{ fontSize: 11.5, color: TEXT_SUBTLE, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} color={TEXT_SUBTLE} /> {phone}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <RolePill role={role} />
            <StatusRow status={contact.status} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <ActionBtn
              href={phone ? `tel:${phone}` : null}
              icon={<Phone size={14} color={phone ? PRIMARY : TEXT_SUBTLE} />}
              ariaLabel="Call"
              tooltip={phone ? `Call ${phone}` : "No phone on file"}
            />
            <ActionBtn
              href={whatsapp ? `https://wa.me/${digitsOnly(whatsapp)}` : null}
              external
              icon={<MessageCircle size={14} color={whatsapp ? PRIMARY : TEXT_SUBTLE} />}
              ariaLabel="WhatsApp"
              tooltip={whatsapp ? "Open WhatsApp chat" : "No phone on file"}
            />
            <ActionBtn
              href={email ? `mailto:${email}` : null}
              icon={<Mail size={14} color={email ? PRIMARY : TEXT_SUBTLE} />}
              ariaLabel="Email"
              tooltip={email ? `Email ${email}` : "No email on file"}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {stats.length > 0 ? (
              <div style={{ display: "flex", gap: 14 }}>
                {stats.map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9.5, color: TEXT_SUBTLE, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 14, color: TEXT, fontWeight: 800, marginTop: 1 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <Link
              href={profileHref}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4, height: 30, padding: "0 12px",
                borderRadius: 10, border: `1px solid ${PRIMARY}`, color: PRIMARY,
                fontSize: 12, fontWeight: 700, background: "#FFFFFF", textDecoration: "none",
              }}
            >
              Open <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────────────── */

function Avatar({ initials, role }: { initials: string; role: string }) {
  // Soft pastel background per role for a hint of variety while staying
  // calm — no profile photos, ever.
  const palette: Record<string, { bg: string; fg: string }> = {
    Coach: { bg: "#F4EEFF", fg: "#7C3AED" },
    Teacher: { bg: "#FFF4E8", fg: "#C2410C" },
    "School Contact": { bg: PRIMARY_SOFT, fg: PRIMARY },
  };
  const colors = palette[role] ?? palette["School Contact"];
  return (
    <span
      aria-hidden="true"
      style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: colors.bg, color: colors.fg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, letterSpacing: 0.4,
      }}
    >
      {initials || "??"}
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    Coach: { bg: "#F4EEFF", fg: "#7C3AED", border: "#E5D7FF" },
    Teacher: { bg: "#FFF4E8", fg: "#C2410C", border: "#FFE0B8" },
    "School Contact": { bg: PRIMARY_SOFT, fg: "#087A55", border: "#CDEBDF" },
  };
  const c = palette[role] ?? palette["School Contact"];
  const label = role === "Teacher" ? "Reading Teacher" : role;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999,
        background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
        fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function StatusRow({ status }: { status: "Active" | "Inactive" }) {
  const isActive = status === "Active";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: isActive ? "#16A34A" : TEXT_SUBTLE }}>
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 999, background: isActive ? "#16A34A" : TEXT_SUBTLE, display: "inline-block" }}
      />
      {status}
    </span>
  );
}

function ActionBtn({
  href, icon, ariaLabel, tooltip, external,
}: {
  href: string | null;
  icon: React.ReactNode;
  ariaLabel: string;
  tooltip: string;
  external?: boolean;
}) {
  if (!href) {
    return (
      <span
        title={tooltip}
        aria-disabled="true"
        style={{
          width: 32, height: 32, borderRadius: 999, border: `1px solid ${BORDER}`, background: "#F8FAFC",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          opacity: 0.5,
        }}
      >
        {icon}
      </span>
    );
  }
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        aria-label={ariaLabel}
        style={{
          width: 32, height: 32, borderRadius: 999, border: `1px solid ${BORDER}`, background: "#FFFFFF",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {icon}
      </a>
    );
  }
  return (
    <a
      href={href}
      title={tooltip}
      aria-label={ariaLabel}
      style={{
        width: 32, height: 32, borderRadius: 999, border: `1px solid ${BORDER}`, background: "#FFFFFF",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {icon}
    </a>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Stat selection: two of three counters per card. Coaches/headteachers
   typically host coaching visits; teachers host assessments. School
   Contacts get the safe default.
   ──────────────────────────────────────────────────────────────────── */

function pickStats(c: DirectoryContact): { label: string; value: number }[] {
  if (c.contactRecordType === "Teacher") {
    return [
      { label: "Trainings", value: c.trainingCount },
      { label: "Assessments", value: c.assessmentCount },
    ];
  }
  return [
    { label: "Trainings", value: c.trainingCount },
    { label: "Visits", value: c.visitCount },
  ];
}

function digitsOnly(s: string): string {
  return s.replace(/[^0-9+]/g, "").replace(/^\+/, "");
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, Phone, UserPlus } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { getSchoolAccountProfile } from "@/services/dataService";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff & Contacts | Ozeki Portal" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const SURFACE = "#FFFFFF";
const BORDER = "#E5EAF0";
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const PRIMARY = "#066A67";
const PRIMARY_SOFT = "#EAF7F1";

export default async function SchoolStaffListPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id: idStr } = await params;
  const schoolId = Number(idStr);
  if (!Number.isInteger(schoolId) || schoolId <= 0) notFound();

  const profile = await getSchoolAccountProfile(schoolId);
  if (!profile) notFound();

  const school = profile.school;
  const contacts = profile.contacts ?? [];

  // Stable sort: primary contact first, then by name.
  const sorted = [...contacts].sort((a, b) => {
    if (a.isPrimaryContact !== b.isPrimaryContact) return a.isPrimaryContact ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      hideFrame
      subtitle={`Here's what's happening at ${school.name}.`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}>
        {/* Page header */}
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <Link
              href={`/portal/schools/${schoolId}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: TEXT_SUBTLE, textDecoration: "none", marginBottom: 6 }}
            >
              <ArrowLeft size={12} /> Back to school profile
            </Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: -0.2 }}>Staff &amp; Contacts</h1>
            <nav aria-label="Breadcrumb" style={{ marginTop: 4, color: TEXT_SUBTLE, fontSize: 12.5 }}>
              <Link href="/portal/schools" style={{ color: TEXT_SUBTLE, textDecoration: "none" }}>Schools</Link>
              <span style={{ margin: "0 6px" }}>›</span>
              <Link href={`/portal/schools/${schoolId}`} style={{ color: TEXT_SUBTLE, textDecoration: "none" }}>{school.name}</Link>
              <span style={{ margin: "0 6px" }}>›</span>
              <span style={{ color: TEXT, fontWeight: 600 }}>Staff &amp; Contacts</span>
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px",
                borderRadius: 10, background: PRIMARY_SOFT, color: PRIMARY, fontSize: 13, fontWeight: 700,
                border: `1px solid ${BORDER}`,
              }}
              aria-label={`${sorted.length} staff and contacts`}
            >
              {sorted.length} {sorted.length === 1 ? "contact" : "contacts"}
            </span>
            <Link
              href={`/portal/schools/${schoolId}#new-contact`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
                borderRadius: 10, background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 700,
                border: `1px solid ${PRIMARY}`, textDecoration: "none",
              }}
            >
              <UserPlus size={14} /> New Contact
            </Link>
          </div>
        </header>

        {/* List card */}
        <article
          style={{
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16,
            boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          {/* Column headers — visual only */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 0.9fr) minmax(0, 1.4fr) 80px minmax(0, 1fr) minmax(0, 1.4fr) 24px",
              gap: 12, padding: "6px 4px", borderBottom: `1px solid ${BORDER}`,
              fontSize: 10, color: TEXT_SUBTLE, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700,
            }}
          >
            <span>Staff ID</span>
            <span>Staff Name</span>
            <span>Gender</span>
            <span>Phone</span>
            <span>Email</span>
            <span></span>
          </div>

          {sorted.length === 0 ? (
            <div style={{ padding: 24, background: "#F8FAFC", borderRadius: 10, fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
              No staff or contacts on file for this school yet.
            </div>
          ) : (
            sorted.map((c) => {
              const phone = c.phone ?? null;
              const email = c.email ?? null;
              return (
                <Link
                  key={c.contactId}
                  href={`/portal/contacts/${c.contactId}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(120px, 0.9fr) minmax(0, 1.4fr) 80px minmax(0, 1fr) minmax(0, 1.4fr) 24px",
                    gap: 12, alignItems: "center", padding: "12px 4px",
                    borderBottom: `1px solid ${BORDER}`, textDecoration: "none",
                  }}
                  className="orbf-staff-row"
                >
                  <span style={{ fontSize: 11.5, color: TEXT_SUBTLE, fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.contactUid || `C-${c.contactId}`}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Avatar name={c.fullName} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: TEXT, fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.fullName}
                      </span>
                      <span style={{ fontSize: 10.5, color: TEXT_SUBTLE, display: "block" }}>
                        {c.roleTitle || c.category || "Contact"}
                        {c.isPrimaryContact ? " · Primary" : ""}
                      </span>
                    </span>
                  </span>
                  <span style={{ fontSize: 11.5, color: TEXT_MUTED }}>{c.gender || "—"}</span>
                  <span style={{ fontSize: 11.5, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {phone ? (
                      <>
                        <Phone size={12} color={TEXT_SUBTLE} />
                        {phone}
                      </>
                    ) : (
                      <span style={{ color: TEXT_SUBTLE }}>—</span>
                    )}
                  </span>
                  <span style={{ fontSize: 11.5, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email ? (
                      <>
                        <Mail size={12} color={TEXT_SUBTLE} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                      </>
                    ) : (
                      <span style={{ color: TEXT_SUBTLE }}>—</span>
                    )}
                  </span>
                  <ArrowRight size={14} color={TEXT_SUBTLE} />
                </Link>
              );
            })
          )}
        </article>

        <ResponsiveStyles />
      </div>
    </PortalShell>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span
      aria-hidden="true"
      style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #066A67 0%, #0E8C7E 100%)",
        color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      }}
    >
      {initials || "??"}
    </span>
  );
}

function ResponsiveStyles() {
  return (
    <style>{`
      .orbf-staff-row:hover { background: #F8FAFC; }
      @media (max-width: 720px) {
        .orbf-staff-row { grid-template-columns: 1fr 1fr !important; row-gap: 4px; }
      }
    `}</style>
  );
}

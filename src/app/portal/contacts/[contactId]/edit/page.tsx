import { notFound, redirect } from "next/navigation";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { isPostgresConfigured, queryPostgres } from "@/lib/server/postgres/client";
import { EditContactForm } from "@/components/portal/crm/EditContactForm";
import Link from "next/link";

export const metadata = {
  title: "Edit Contact | Portal",
};

export default async function EditContactPage(props: {
  params: Promise<{ contactId: string }>;
}) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    redirect("/portal/login");
  }

  if (!isPostgresConfigured()) {
    notFound();
  }

  const { contactId: rawId } = await props.params;
  const contactId = Number(rawId);
  if (Number.isNaN(contactId)) {
    notFound();
  }

  const result = await queryPostgres(
    `
      SELECT
        sc.contact_id AS id,
        sc.contact_uid AS "contactUid",
        sc.school_id AS "schoolId",
        sc.full_name AS "fullName",
        sc.gender,
        sc.phone,
        sc.email,
        sc.whatsapp,
        sc.category,
        sc.role_title AS "roleTitle",
        sc.is_primary_contact AS "isPrimaryContact",
        sc.class_taught AS "classTaught",
        sc.subject_taught AS "subjectTaught",
        sc.teacher_uid AS "teacherUid",
        sc.contact_record_type AS "contactRecordType",
        sc.nickname,
        sc.leadership_role AS "leadershipRole",
        sc.sub_role AS "subRole",
        sc.role_formula AS "roleFormula",
        sc.last_ssa_sent::text AS "lastSsaSent",
        COALESCE(sc.trainer, FALSE) AS trainer,
        sc.notes
      FROM school_contacts sc
      WHERE sc.contact_id = $1
      LIMIT 1
    `,
    [contactId],
  );

  const row = result.rows[0];
  if (!row) {
    notFound();
  }

  const initialData = {
    uid: String(row.contactUid ?? ""),
    id: Number(row.id),
    fullName: String(row.fullName ?? ""),
    gender: String(row.gender ?? ""),
    category: String(row.category ?? ""),
    roleTitle: row.roleTitle ? String(row.roleTitle) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    whatsapp: row.whatsapp ? String(row.whatsapp) : undefined,
    contactRecordType: row.contactRecordType ? String(row.contactRecordType) : undefined,
    nickname: row.nickname ? String(row.nickname) : undefined,
    leadershipRole: Boolean(row.leadershipRole),
    subRole: row.subRole ? String(row.subRole) : undefined,
    roleFormula: row.roleFormula ? String(row.roleFormula) : undefined,
    lastSsaSent: row.lastSsaSent ? String(row.lastSsaSent) : undefined,
    trainer: Boolean(row.trainer),
    notes: row.notes ? String(row.notes) : undefined,
    classTaught: row.classTaught ? String(row.classTaught) : undefined,
    subjectTaught: row.subjectTaught ? String(row.subjectTaught) : undefined,
  };

  return (
    <div className="crm-workspace" style={{ padding: "1.5rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      <header className="crm-workspace-header" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href={`/portal/contacts/${contactId}`}
            style={{ color: "#4b5563", textDecoration: "none", fontWeight: 500 }}
          >
            &larr; Back to Contact
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Edit Contact: {initialData.fullName}
          </h1>
        </div>
      </header>

      <main>
        <EditContactForm initialData={initialData} />
      </main>
    </div>
  );
}

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { withPostgresClient, queryPostgres } from "@/lib/server/postgres/client";
import type { PoolClient } from "pg";

export const runtime = "nodejs";

const sanitizePhone = (val: string) => {
  const cleaned = val.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("0")) return `+256${cleaned.slice(1)}`;
  if (cleaned.length === 9) return `+256${cleaned}`;
  if (!cleaned.startsWith("+") && cleaned.startsWith("256")) return `+${cleaned}`;
  return cleaned;
};

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters."),
  category: z.enum([
    "Head Teacher",
    "Deputy Head Teacher",
    "Classroom Teacher",
    "Proprietor",
    "Director",
    "Teacher",
    "Other",
  ]),
  gender: z.enum(["Male", "Female", "Other"]).optional().default("Other"),
  phone: z.string().trim().default("").transform(sanitizePhone),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  whatsapp: z.string().trim().default("").transform(sanitizePhone),
  isPrimaryContact: z.boolean().optional().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const schoolId = Number(id);
    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return NextResponse.json({ error: "Invalid school ID." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const input = parsed.data;

    // Verify school exists
    const schoolCheck = await queryPostgres<{ id: number }>(
      `SELECT id FROM schools_directory WHERE id = $1 LIMIT 1`,
      [schoolId],
    );
    if (!schoolCheck.rows[0]) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    // Determine role title from category
    const roleTitle =
      input.category === "Head Teacher"
        ? "Head Teacher"
        : input.category === "Deputy Head Teacher"
          ? "Deputy Head Teacher"
          : input.category === "Classroom Teacher" || input.category === "Teacher"
            ? "Teacher"
            : input.category === "Proprietor"
              ? "Proprietor"
              : input.category === "Director"
                ? "Director"
                : input.category;

    const isTeacher =
      input.category === "Classroom Teacher" ||
      input.category === "Teacher" ||
      input.category === "Head Teacher" ||
      input.category === "Deputy Head Teacher";

    const contactId = await withPostgresClient(async (client: PoolClient) => {
      await client.query("BEGIN");

      try {
        // Create teacher roster entry if this is a teacher category
        let teacherUid: string | null = null;
        if (isTeacher) {
          const uid = `tch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          await client.query(
            `INSERT INTO teacher_roster (teacher_uid, school_id, full_name, gender, phone, email, role_title, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [uid, schoolId, input.fullName, input.gender, input.phone || null, input.email || null, roleTitle],
          );
          teacherUid = uid;
        }

        // Insert school contact
        const contactResult = await client.query<{ contactId: number }>(
          `INSERT INTO school_contacts (
            contact_uid, school_id, full_name, gender, phone, email, whatsapp,
            category, role_title, is_primary_contact, teacher_uid,
            contact_record_type, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, NOW(), NOW()
          )
          RETURNING contact_id AS "contactId"`,
          [
            `cnt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            schoolId,
            input.fullName,
            input.gender,
            input.phone || null,
            input.email || null,
            input.whatsapp || null,
            input.category,
            roleTitle,
            input.isPrimaryContact,
            teacherUid,
            isTeacher ? "Teacher" : "School Contact",
          ],
        );

        const newContactId = contactResult.rows[0]?.contactId;

        // If primary, demote others
        if (input.isPrimaryContact && newContactId) {
          await client.query(
            `UPDATE school_contacts SET is_primary_contact = FALSE, updated_at = NOW()
             WHERE school_id = $1 AND contact_id != $2`,
            [schoolId, newContactId],
          );
        }

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, detail, payload_after)
           VALUES ($1, $2, $3, 'school_contacts', $4, $5, $6)`,
          [
            user.id,
            user.fullName,
            "create",
            String(newContactId),
            `Created contact ${input.fullName} for school ${schoolId}.`,
            JSON.stringify({ schoolId, fullName: input.fullName, category: input.category }),
          ],
        );

        await client.query("COMMIT");
        revalidateTag("crm-contact");
        return newContactId;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    return NextResponse.json({
      success: true,
      contactId,
      message: `Contact "${input.fullName}" created successfully.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

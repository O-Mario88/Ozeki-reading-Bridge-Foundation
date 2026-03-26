import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { RouteError, jsonSuccess, withRouteHandler } from "@/lib/server/http/route-utils";
import { withPostgresClient } from "@/lib/server/postgres/client";
import type { PortalUser } from "@/lib/types";

export const runtime = "nodejs";

const addToTrainingSchema = z.object({
  contactId: z.coerce.number().int().positive(),
  trainingRecordId: z.coerce.number().int().positive(),
});

async function addContactToTrainingSession(
  actor: PortalUser,
  contactId: number,
  trainingRecordId: number,
) {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      /* ── Load contact ──────────────────────────────────────────── */
      const contactResult = await client.query<{
        contactId: number;
        contactUid: string;
        schoolId: number;
        fullName: string;
        gender: string;
        phone: string | null;
        email: string | null;
        category: string;
        roleTitle: string | null;
        teacherUid: string | null;
      }>(
        `
          SELECT
            contact_id AS "contactId",
            contact_uid AS "contactUid",
            school_id AS "schoolId",
            full_name AS "fullName",
            CASE
              WHEN lower(COALESCE(gender, '')) = 'male' THEN 'Male'
              WHEN lower(COALESCE(gender, '')) = 'female' THEN 'Female'
              ELSE 'Other'
            END AS gender,
            phone,
            email,
            category,
            role_title AS "roleTitle",
            teacher_uid AS "teacherUid"
          FROM school_contacts
          WHERE contact_id = $1
          LIMIT 1
        `,
        [contactId],
      );
      const contact = contactResult.rows[0];
      if (!contact) {
        throw new Error("Contact not found.");
      }

      /* ── Load training record ──────────────────────────────────── */
      const trainingResult = await client.query<{
        id: number;
        recordCode: string;
        payloadJson: string;
      }>(
        `
          SELECT
            id,
            record_code AS "recordCode",
            COALESCE(payload_json, '{}') AS "payloadJson"
          FROM portal_records
          WHERE id = $1
            AND module = 'training'
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [trainingRecordId],
      );
      const training = trainingResult.rows[0];
      if (!training) {
        throw new Error("Training session not found.");
      }

      /* ── Load school ───────────────────────────────────────────── */
      const schoolResult = await client.query<{
        id: number;
        name: string;
        region: string;
        district: string;
      }>(
        `
          SELECT
            id,
            name,
            COALESCE(region, '') AS region,
            COALESCE(district, '') AS district
          FROM schools_directory
          WHERE id = $1
          LIMIT 1
        `,
        [contact.schoolId],
      );
      const school = schoolResult.rows[0];
      if (!school) {
        throw new Error("School for contact not found.");
      }

      /* ── Check for existing registration ───────────────────────── */
      const existingResult = await client.query<{ id: number }>(
        `
          SELECT id
          FROM portal_training_attendance
          WHERE portal_record_id = $1
            AND contact_id = $2
          LIMIT 1
        `,
        [trainingRecordId, contactId],
      );
      if (existingResult.rows[0]) {
        await client.query("ROLLBACK");
        return { action: "ALREADY_REGISTERED" as const, trainingRecordId, contactId };
      }

      /* ── Determine role ────────────────────────────────────────── */
      const categoryLower = (contact.category ?? "").toLowerCase();
      const roleTitleLower = (contact.roleTitle ?? "").toLowerCase();
      const isLeader =
        categoryLower.includes("head teacher") ||
        categoryLower.includes("deputy") ||
        categoryLower.includes("proprietor") ||
        categoryLower.includes("dos") ||
        categoryLower.includes("administrator") ||
        roleTitleLower.includes("leader") ||
        roleTitleLower.includes("head");
      const participantRole = isLeader ? "School Leader" : "Classroom teacher";

      /* ── Insert attendance record ──────────────────────────────── */
      const participantCode = `TP-${trainingRecordId}-${contactId}`;
      await client.query(
        `
          INSERT INTO portal_training_attendance (
            portal_record_id,
            school_id,
            contact_id,
            contact_uid,
            participant_code,
            participant_name,
            participant_role,
            participant_type,
            invited,
            confirmed,
            role_at_time,
            gender,
            teacher_uid,
            attended,
            phone,
            email,
            mobile_number,
            school_name_snapshot,
            school_region_snapshot,
            school_district_snapshot,
            attendance_status,
            certificate_status,
            notes,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'In Person', TRUE, FALSE,
            $8, $9, $10, FALSE, $11, $12, $13, $14, $15, $16,
            'Registered', 'Pending', NULL, NOW(), NOW()
          )
        `,
        [
          trainingRecordId,
          school.id,
          contact.contactId,
          contact.contactUid,
          participantCode,
          contact.fullName,
          participantRole,
          participantRole,
          contact.gender,
          contact.teacherUid,
          contact.phone,
          contact.email,
          contact.phone,
          school.name,
          school.region,
          school.district,
        ],
      );

      /* ── Update training payload JSON participants array ─────── */
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(training.payloadJson) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      const participants = Array.isArray(payload.participants) ? payload.participants as Array<Record<string, unknown>> : [];
      participants.push({
        contactId: contact.contactId,
        contactUid: contact.contactUid,
        participantName: contact.fullName,
        schoolAccountId: school.id,
        schoolAttachedTo: school.name,
        role: isLeader ? "Leader" : "Teacher",
        gender: contact.gender,
        phoneContact: contact.phone ?? "",
        email: contact.email ?? "",
        participantType: "In Person",
        invited: true,
        confirmed: false,
        attended: false,
        attendanceStatus: "Registered",
        certificateStatus: "Pending",
      });
      payload.participants = participants;

      /* ── Update summary counts ─────────────────────────────────── */
      payload.classroomTeachers = participants.filter((p) => p.role === "Teacher").length;
      payload.schoolLeaders = participants.filter((p) => p.role === "Leader").length;

      await client.query(
        `
          UPDATE portal_records
          SET
            payload_json = $2,
            updated_by_user_id = $3,
            updated_at = NOW()
          WHERE id = $1
        `,
        [trainingRecordId, JSON.stringify(payload), actor.id],
      );

      /* ── Audit log ─────────────────────────────────────────────── */
      await client.query(
        `
          INSERT INTO audit_logs (
            user_id,
            user_name,
            action,
            target_table,
            target_id,
            payload_after,
            detail
          ) VALUES (
            $1, $2, $3, 'portal_training_attendance', $4, $5, $6
          )
        `,
        [
          actor.id,
          actor.fullName,
          "create",
          String(trainingRecordId),
          JSON.stringify({
            trainingRecordId,
            contactId,
            schoolId: school.id,
            attendanceStatus: "Registered",
          }),
          `Added training participant ${contact.fullName} from Contact Profile.`,
        ],
      );

      await client.query("COMMIT");
      return { action: "CREATED" as const, trainingRecordId, contactId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/portal/contacts/add-to-training",
    method: "POST",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      const body = addToTrainingSchema.parse(await request.json());
      const result = await addContactToTrainingSession(user, body.contactId, body.trainingRecordId);
      return jsonSuccess({ result }, requestId);
    },
  });
}

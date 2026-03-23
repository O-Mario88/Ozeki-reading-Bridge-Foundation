import { queryPostgres } from "@/lib/server/postgres/client";
import type { SupportRequestRecord, SupportRequestInput } from "@/lib/types";

export async function createSupportRequestPostgres(input: SupportRequestInput, userId: number): Promise<SupportRequestRecord> {
  const result = await queryPostgres(
    `
    INSERT INTO support_requests (
      school_id, contact_name, contact_role, contact_info, urgency, message, support_types, status, created_by_user_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING id, school_id AS "schoolId", contact_name AS "contactName", contact_role AS "contactRole", contact_info AS "contactInfo", urgency, message, support_types AS "supportTypes", status, created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [input.schoolId || null, input.contactName, input.contactRole, input.contactInfo, input.urgency, input.message, JSON.stringify(input.supportTypes || []), "New", userId]
  );
  return result.rows[0] as unknown as SupportRequestRecord;
}

export async function listSupportRequestsPostgres(filters?: { schoolId?: number; createdByUserId?: number; }): Promise<SupportRequestRecord[]> {
  const params: (string | number)[] = [];
  let query = `SELECT id, school_id AS "schoolId", contact_name AS "contactName", contact_role AS "contactRole", contact_info AS "contactInfo", urgency, message, support_types AS "supportTypes", status, created_by_user_id AS "createdByUserId", created_at AS "createdAt", updated_at AS "updatedAt" FROM support_requests`;
  
  const conditions: string[] = [];
  
  if (filters?.schoolId) {
    params.push(filters.schoolId);
    conditions.push(`school_id = $${params.length}`);
  }

  if (filters?.createdByUserId) {
    params.push(filters.createdByUserId);
    conditions.push(`created_by_user_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY created_at DESC`;
  try {
    const result = await queryPostgres(query, params);
    return result.rows as unknown as SupportRequestRecord[];
  } catch (error) {
    console.error("[SupportRepository] Failed to list support requests (schema might be missing):", error);
    return [];
  }
}

export async function createConceptNoteRequestPostgres(input: Record<string, unknown>, options: { submittedByUserId: number | null }): Promise<Record<string, unknown>> {
    const result = await queryPostgres(
        `INSERT INTO concept_note_requests (requester_type, source_page, region, sub_region, district, payload_json, submitted_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at AS "createdAt"`,
        [input.requesterType, input.sourcePage, input.region, input.subRegion, input.district, JSON.stringify(input.payload), options.submittedByUserId]
    );
    return { id: result.rows[0].id, ...input, createdAt: result.rows[0].createdAt };
}

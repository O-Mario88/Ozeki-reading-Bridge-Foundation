import { queryPostgres } from "@/lib/server/postgres/client";
import type { PortalRecord, PortalRecordInput, PortalRecordFilters } from "@/lib/types";

export async function createPortalRecordPostgres(input: PortalRecordInput, userId: number): Promise<PortalRecord> {
  const result = await queryPostgres(
    `
    INSERT INTO portal_records (
      school_id, module, status, payload_json, created_by_user_id, updated_at, follow_up_date, follow_up_type, follow_up_owner_user_id
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
    RETURNING id, school_id AS "schoolId", module, status, payload_json AS "payload", updated_at AS "createdAt", updated_at AS "updatedAt", follow_up_date::text AS "followUpDate", follow_up_type AS "followUpType", follow_up_owner_user_id AS "followUpOwnerUserId"
    `,
    [
      input.schoolId,
      input.module,
      input.status,
      JSON.stringify(input.payload),
      userId,
      input.followUpDate || null,
      input.followUpType || null,
      input.followUpOwnerUserId || null,
    ]
  );
  return result.rows[0] as unknown as PortalRecord;
}

export async function listPortalRecordsPostgres(filters: PortalRecordFilters, _user?: unknown): Promise<PortalRecord[]> {
  const params: unknown[] = [];
  let query = `SELECT id, school_id AS "schoolId", module, status, payload_json AS "payload", updated_at AS "createdAt", updated_at AS "updatedAt", follow_up_date::text AS "followUpDate", follow_up_type AS "followUpType", follow_up_owner_user_id AS "followUpOwnerUserId" FROM portal_records WHERE 1=1`;
  
  if (filters.module) {
    params.push(filters.module);
    query += ` AND module = $${params.length}`;
  }
  if (filters.status) {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }
  if (filters.school) {
    params.push(filters.school);
    query += ` AND school_id = $${params.length}`;
  }

  query += ` ORDER BY updated_at DESC`;
  const result = await queryPostgres(query, params);
  return result.rows as unknown as PortalRecord[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveObservationRubricPostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO observation_rubrics (school_id, teacher_uid, date, lesson_type, indicators_json, overall_score, strengths, gaps, coaching_actions, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, created_at AS "createdAt"`,
        [input.schoolId, input.teacherUid, input.date, input.lessonType, JSON.stringify(input.indicators), input.overallScore || 0, input.strengths, input.gaps, input.coachingActions, userId]
    );
    return { id: result.rows[0].id, ...input, createdByUserId: userId, createdAt: result.rows[0].createdAt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveInterventionGroupPostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO intervention_groups (school_id, grade, target_skill, learners_json, schedule, start_date, end_date, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at AS "createdAt"`,
        [input.schoolId, input.grade, input.targetSkill, JSON.stringify(input.learnerUids), input.schedule, input.startDate, input.endDate, userId]
    );
    return { id: result.rows[0].id, ...input, createdByUserId: userId, createdAt: result.rows[0].createdAt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveConsentRecordPostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO consent_records (school_id, consent_type, source, date, allowed_usage, linked_files, expiry_date, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at AS "createdAt"`,
        [input.schoolId, input.consentType, input.source, input.date, input.allowedUsage, input.linkedFiles, input.expiryDate, userId]
    );
    return { id: result.rows[0].id, ...input, createdByUserId: userId, createdAt: result.rows[0].createdAt };
}

export async function getPortalRecordByIdPostgres(id: number): Promise<PortalRecord | null> {
  const result = await queryPostgres(
    `SELECT id, school_id AS "schoolId", module, status, payload_json AS "payload", updated_at AS "createdAt", updated_at AS "updatedAt", follow_up_date::text AS "followUpDate", follow_up_type AS "followUpType", follow_up_owner_user_id AS "followUpOwnerUserId" FROM portal_records WHERE id = $1`,
    [id]
  );
  return (result.rows[0] as unknown as PortalRecord) || null;
}

export async function updatePortalRecordPostgres(id: number, input: Partial<PortalRecordInput>): Promise<PortalRecord> {
  const params: unknown[] = [];
  let query = `UPDATE portal_records SET updated_at = NOW()`;
  
  if (input.status) {
    params.push(input.status);
    query += `, status = $${params.length}`;
  }
  if (input.payload) {
    params.push(JSON.stringify(input.payload));
    query += `, payload_json = $${params.length}`;
  }
  if (input.schoolId) {
    params.push(input.schoolId);
    query += `, school_id = $${params.length}`;
  }
  if (input.followUpDate !== undefined) {
    params.push(input.followUpDate || null);
    query += `, follow_up_date = $${params.length}`;
  }
  if (input.followUpType !== undefined) {
    params.push(input.followUpType || null);
    query += `, follow_up_type = $${params.length}`;
  }
  if (input.followUpOwnerUserId !== undefined) {
    params.push(input.followUpOwnerUserId || null);
    query += `, follow_up_owner_user_id = $${params.length}`;
  }

  params.push(id);
  query += ` WHERE id = $${params.length} RETURNING id, school_id AS "schoolId", module, status, payload_json AS "payload", updated_at AS "createdAt", updated_at AS "updatedAt", follow_up_date::text AS "followUpDate", follow_up_type AS "followUpType", follow_up_owner_user_id AS "followUpOwnerUserId"`;
  
  const result = await queryPostgres(query, params);
  return result.rows[0] as unknown as PortalRecord;
}

export async function softDeletePortalRecordPostgres(id: number, _userId: number, _reason: string): Promise<void> {
  await queryPostgres(
    `DELETE FROM portal_records WHERE id = $1`,
    [id]
  );
}

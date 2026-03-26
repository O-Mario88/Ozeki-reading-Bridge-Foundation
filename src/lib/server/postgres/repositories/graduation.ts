import { queryPostgres } from "@/lib/server/postgres/client";
import type { GraduationEligibilityRecord, GraduationSettingsRecord } from "@/lib/types";

export async function getGraduationSettingsPostgres(): Promise<GraduationSettingsRecord | null> {
  const result = await queryPostgres(
    `SELECT * FROM graduation_settings LIMIT 1`,
    []
  );
  return (result.rows[0] as unknown as GraduationSettingsRecord) || null;
}

export async function listGraduationEligibilityPostgres(schoolId?: number): Promise<GraduationEligibilityRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];
  let query = `SELECT * FROM graduation_eligibility`;
  
  if (schoolId) {
    params.push(schoolId);
    query += ` WHERE school_id = $1`;
  }

  query += ` ORDER BY created_at DESC`;
  const result = await queryPostgres(query, params);
  return result.rows as unknown as GraduationEligibilityRecord[];
}

export async function updateGraduationEligibilityPostgres(schoolId: number, status: string): Promise<void> {
  await queryPostgres(
    `UPDATE graduation_eligibility SET status = $1, updated_at = NOW() WHERE school_id = $2`,
    [status, schoolId]
  );
}

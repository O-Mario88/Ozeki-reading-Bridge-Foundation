import { queryPostgres } from "@/lib/server/postgres/client";
import type { PortalEvidenceRecord } from "@/lib/types";

export { listPortalEvidencePostgres };

async function listPortalEvidencePostgres(recordId: number): Promise<PortalEvidenceRecord[]>;
async function listPortalEvidencePostgres(filters?: any): Promise<any[]>;
async function listPortalEvidencePostgres(arg?: any): Promise<any[]> {
  if (typeof arg === "number") {
    const result = await queryPostgres(
      `
      SELECT id, record_id AS "recordId", file_name AS "fileName", stored_path AS "storedPath", uploaded_at AS "uploadedAt"
      FROM portal_evidence
      WHERE record_id = $1
      ORDER BY uploaded_at DESC
      `,
      [arg]
    );
    return result.rows as unknown as PortalEvidenceRecord[];
  }
  
  const filters = arg || {};
  let query = `SELECT * FROM portal_evidence WHERE 1=1`;
  const params: any[] = [];
  if (filters.schoolId) {
    params.push(filters.schoolId);
    query += ` AND school_id = $${params.length}`;
  }
  query += ` ORDER BY created_at DESC`;
  const result = await queryPostgres(query, params);
  return result.rows;
}

export async function addPortalEvidencePostgres(recordId: number, fileName: string, storedPath: string): Promise<PortalEvidenceRecord> {
  const result = await queryPostgres(
    `
    INSERT INTO portal_evidence (record_id, file_name, stored_path, uploaded_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, record_id AS "recordId", file_name AS "fileName", stored_path AS "storedPath", uploaded_at AS "uploadedAt"
    `,
    [recordId, fileName, storedPath]
  );
  return result.rows[0] as unknown as PortalEvidenceRecord;
}

export async function getPortalEvidenceByIdPostgres(id: number): Promise<any> {
    const result = await queryPostgres(`SELECT * FROM portal_evidence WHERE id = $1`, [id]);
    return result.rows[0];
}


export async function savePortalEvidencePostgres(input: any, userId: number): Promise<any> {
    const result = await queryPostgres(
        `INSERT INTO portal_evidence (title, description, file_path, school_id, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at AS "createdAt"`,
        [input.title, input.description, input.filePath, input.schoolId, userId]
    );
    return { id: result.rows[0].id, ...input, createdAt: result.rows[0].createdAt };
}

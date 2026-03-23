import { queryPostgres } from "@/lib/server/postgres/client";

export async function listPortalEvidencePostgres(filters?: any, user?: any): Promise<any[]> {
    const params: any[] = [];
    let query = `
      SELECT 
        id, 
        record_id AS "recordId", 
        module, 
        date, 
        school_name AS "schoolName", 
        file_name AS "fileName", 
        stored_path AS "storedPath", 
        mime_type AS "mimeType", 
        size_bytes AS "sizeBytes", 
        uploaded_by_user_id AS "uploadedByUserId", 
        created_at AS "createdAt"
      FROM portal_evidence WHERE 1=1
    `;

    if (filters?.module) {
        params.push(filters.module);
        query += ` AND module = $${params.length}`;
    }
    if (filters?.dateFrom) {
        params.push(filters.dateFrom);
        query += ` AND date >= $${params.length}`;
    }
    if (filters?.dateTo) {
        params.push(filters.dateTo);
        query += ` AND date <= $${params.length}`;
    }
    if (filters?.school) {
        params.push(`%${filters.school}%`);
        query += ` AND school_name ILIKE $${params.length}`;
    }
    if (filters?.recordId) {
        params.push(filters.recordId);
        query += ` AND record_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 500`;

    const result = await queryPostgres(query, params);
    return result.rows;
}

export async function savePortalEvidencePostgres(input: any): Promise<any> {
    const result = await queryPostgres(
        `
        INSERT INTO portal_evidence (
            record_id, module, date, school_name, file_name, stored_path, mime_type, size_bytes, uploaded_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING 
            id, 
            record_id AS "recordId", 
            module, 
            date, 
            school_name AS "schoolName", 
            file_name AS "fileName", 
            stored_path AS "storedPath", 
            mime_type AS "mimeType", 
            size_bytes AS "sizeBytes", 
            uploaded_by_user_id AS "uploadedByUserId", 
            created_at AS "createdAt"
        `,
        [
            input.recordId || null,
            input.module,
            input.date,
            input.schoolName,
            input.fileName,
            input.storedPath,
            input.mimeType,
            input.sizeBytes,
            input.uploadedByUserId
        ]
    );
    return result.rows[0];
}

export async function getPortalEvidenceByIdPostgres(id: number, user?: any): Promise<any> {
    const result = await queryPostgres(
        `
        SELECT 
            id, 
            record_id AS "recordId", 
            module, 
            date, 
            school_name AS "schoolName", 
            file_name AS "fileName", 
            stored_path AS "storedPath", 
            mime_type AS "mimeType", 
            size_bytes AS "sizeBytes", 
            uploaded_by_user_id AS "uploadedByUserId", 
            created_at AS "createdAt"
        FROM portal_evidence 
        WHERE id = $1
        `,
        [id]
    );
    return result.rows[0] || null;
}

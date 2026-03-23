import { queryPostgres } from "../client";

export type ImpactGalleryEntryRecord = {
  id: number;
  imageUrl: string;
  quoteText: string;
  personName: string;
  personRole: string;
  activityType: string;
  district: string;
  region: string;
  recordedYear: string;
  fileName: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export async function addImpactGalleryEntryPostgres(
  input: {
    imageUrl: string;
    quoteText: string;
    personName: string;
    personRole: string;
    activityType: string;
    district: string;
    region: string;
    recordedYear: string;
    fileName?: string;
    sizeBytes?: number;
    mimeType?: string;
  },
  actor: { id: number; fullName?: string }
): Promise<ImpactGalleryEntryRecord> {
  const result = await queryPostgres(
    `INSERT INTO portal_impact_gallery (
      image_url, quote_text, person_name, person_role, activity_type, district, region,
      recorded_year, file_name, size_bytes, mime_type, created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING *`,
    [
      input.imageUrl,
      input.quoteText,
      input.personName,
      input.personRole,
      input.activityType,
      input.district,
      input.region,
      input.recordedYear,
      input.fileName || null,
      input.sizeBytes || null,
      input.mimeType || null,
      actor.id,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    imageUrl: row.image_url,
    quoteText: row.quote_text,
    personName: row.person_name,
    personRole: row.person_role,
    activityType: row.activity_type,
    district: row.district,
    region: row.region,
    recordedYear: row.recorded_year,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    createdByName: actor.fullName || "Portal Staff",
  };
}

export async function listImpactGalleryEntriesPostgres(limit = 400): Promise<ImpactGalleryEntryRecord[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 1000));
  const result = await queryPostgres(
    `SELECT g.*, u.full_name as created_by_name 
     FROM portal_impact_gallery g
     LEFT JOIN portal_users u ON g.created_by_user_id = u.id
     ORDER BY g.created_at DESC
     LIMIT $1`,
    [safeLimit]
  );

  return result.rows.map(row => ({
    id: row.id,
    imageUrl: row.image_url,
    quoteText: row.quote_text,
    personName: row.person_name,
    personRole: row.person_role,
    activityType: row.activity_type,
    district: row.district,
    region: row.region,
    recordedYear: row.recorded_year,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name || "Unknown",
  }));
}

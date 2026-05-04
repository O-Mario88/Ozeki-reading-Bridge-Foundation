import { queryPostgres } from "@/lib/server/postgres/client";

export type EvidencePhotoParentType =
  | "coaching_visit"
  | "training_session"
  | "training_record";

export type EvidencePhotoRow = {
  id: number;
  parentType: EvidencePhotoParentType;
  parentId: number;
  schoolId: number | null;
  capturedAt: string | null;
  lat: number | null;
  lng: number | null;
  gpsAccuracyM: number | null;
  exifJson: Record<string, unknown> | null;
  photoHashSha256: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  caption: string | null;
  uploadedByUserId: number | null;
  createdAt: string;
};

export type SaveEvidencePhotoInput = {
  parentType: EvidencePhotoParentType;
  parentId: number;
  schoolId?: number | null;
  capturedAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  gpsAccuracyM?: number | null;
  exifJson?: Record<string, unknown> | null;
  photoHashSha256: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  widthPx?: number | null;
  heightPx?: number | null;
  caption?: string | null;
  uploadedByUserId?: number | null;
};

const SELECT_COLUMNS = `
  id,
  parent_type AS "parentType",
  parent_id AS "parentId",
  school_id AS "schoolId",
  captured_at AS "capturedAt",
  lat,
  lng,
  gps_accuracy_m AS "gpsAccuracyM",
  exif_json AS "exifJson",
  photo_hash_sha256 AS "photoHashSha256",
  file_name AS "fileName",
  stored_path AS "storedPath",
  mime_type AS "mimeType",
  size_bytes AS "sizeBytes",
  width_px AS "widthPx",
  height_px AS "heightPx",
  caption,
  uploaded_by_user_id AS "uploadedByUserId",
  created_at AS "createdAt"
`;

export async function saveEvidencePhotoPostgres(
  input: SaveEvidencePhotoInput,
): Promise<EvidencePhotoRow> {
  const result = await queryPostgres(
    `
    INSERT INTO evidence_photos (
      parent_type, parent_id, school_id, captured_at, lat, lng, gps_accuracy_m,
      exif_json, photo_hash_sha256, file_name, stored_path, mime_type, size_bytes,
      width_px, height_px, caption, uploaded_by_user_id, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
    )
    RETURNING ${SELECT_COLUMNS}
    `,
    [
      input.parentType,
      input.parentId,
      input.schoolId ?? null,
      input.capturedAt ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.gpsAccuracyM ?? null,
      input.exifJson ? JSON.stringify(input.exifJson) : null,
      input.photoHashSha256,
      input.fileName,
      input.storedPath,
      input.mimeType,
      input.sizeBytes,
      input.widthPx ?? null,
      input.heightPx ?? null,
      input.caption ?? null,
      input.uploadedByUserId ?? null,
    ],
  );
  return result.rows[0] as EvidencePhotoRow;
}

export async function listEvidencePhotosByParentPostgres(
  parentType: EvidencePhotoParentType,
  parentId: number,
): Promise<EvidencePhotoRow[]> {
  const result = await queryPostgres(
    `
    SELECT ${SELECT_COLUMNS}
    FROM evidence_photos
    WHERE parent_type = $1 AND parent_id = $2
    ORDER BY captured_at DESC NULLS LAST, created_at DESC
    `,
    [parentType, parentId],
  );
  return result.rows as EvidencePhotoRow[];
}

export async function getEvidencePhotoByIdPostgres(
  id: number,
): Promise<EvidencePhotoRow | null> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM evidence_photos WHERE id = $1`,
    [id],
  );
  return (result.rows[0] as EvidencePhotoRow | undefined) ?? null;
}

export async function deleteEvidencePhotoPostgres(id: number): Promise<void> {
  await queryPostgres(`DELETE FROM evidence_photos WHERE id = $1`, [id]);
}

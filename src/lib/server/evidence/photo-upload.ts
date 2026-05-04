import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import exifr from "exifr";
import { getRuntimeDataDir } from "@/lib/runtime-paths";
import { logger } from "@/lib/logger";
import {
  type EvidencePhotoParentType,
  type EvidencePhotoRow,
  saveEvidencePhotoPostgres,
} from "@/lib/server/postgres/repositories/evidence-photos";

export type ClientGeolocation = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
};

export type IngestEvidencePhotoInput = {
  parentType: EvidencePhotoParentType;
  parentId: number;
  schoolId?: number | null;
  uploadedByUserId?: number | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  caption?: string | null;
  clientGeolocation?: ClientGeolocation | null;
};

const ALLOWED_MIME_PREFIX = "image/";

function sanitizeBaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "photo";
}

function toIsoStringSafe(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

type ExtractedExif = {
  capturedAt: string | null;
  lat: number | null;
  lng: number | null;
  widthPx: number | null;
  heightPx: number | null;
  raw: Record<string, unknown> | null;
};

async function extractExif(buffer: Buffer): Promise<ExtractedExif> {
  try {
    const parsed = (await exifr.parse(buffer, {
      gps: true,
      tiff: true,
      ifd0: true,
      exif: true,
      reviveValues: true,
      translateValues: true,
      mergeOutput: true,
    } as unknown as Parameters<typeof exifr.parse>[1])) as Record<string, unknown> | undefined;

    if (!parsed) {
      return { capturedAt: null, lat: null, lng: null, widthPx: null, heightPx: null, raw: null };
    }

    const capturedAt =
      toIsoStringSafe(parsed.DateTimeOriginal) ??
      toIsoStringSafe(parsed.CreateDate) ??
      toIsoStringSafe(parsed.ModifyDate);

    const lat = asNumberOrNull(parsed.latitude);
    const lng = asNumberOrNull(parsed.longitude);

    const widthPx =
      asNumberOrNull(parsed.ExifImageWidth) ??
      asNumberOrNull(parsed.ImageWidth) ??
      asNumberOrNull(parsed.PixelXDimension);
    const heightPx =
      asNumberOrNull(parsed.ExifImageHeight) ??
      asNumberOrNull(parsed.ImageHeight) ??
      asNumberOrNull(parsed.PixelYDimension);

    return { capturedAt, lat, lng, widthPx, heightPx, raw: parsed };
  } catch (error) {
    logger.warn("[evidence-photo] exif parse failed", { error: String(error) });
    return { capturedAt: null, lat: null, lng: null, widthPx: null, heightPx: null, raw: null };
  }
}

export async function ingestEvidencePhoto(
  input: IngestEvidencePhotoInput,
): Promise<EvidencePhotoRow> {
  if (!input.mimeType.toLowerCase().startsWith(ALLOWED_MIME_PREFIX)) {
    throw new Error(`Unsupported mime type: ${input.mimeType}`);
  }
  if (!input.buffer || input.buffer.byteLength <= 0) {
    throw new Error("Empty photo buffer.");
  }

  const sha256 = crypto.createHash("sha256").update(input.buffer).digest("hex");

  const exif = await extractExif(input.buffer);

  const lat = exif.lat ?? input.clientGeolocation?.lat ?? null;
  const lng = exif.lng ?? input.clientGeolocation?.lng ?? null;
  const gpsAccuracyM =
    exif.lat !== null && exif.lng !== null
      ? null
      : (input.clientGeolocation?.accuracyM ?? null);

  const monthSegment = new Date().toISOString().slice(0, 7);
  const photoDir = path.join(getRuntimeDataDir(), "evidence_photos", monthSegment);
  await fs.mkdir(photoDir, { recursive: true });

  const ext = path.extname(input.fileName).slice(0, 8) || ".jpg";
  const baseName = sanitizeBaseName(path.basename(input.fileName, path.extname(input.fileName)));
  const storedFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${baseName}${ext}`;
  const storedPath = path.join(photoDir, storedFileName);

  await fs.writeFile(storedPath, input.buffer);

  return saveEvidencePhotoPostgres({
    parentType: input.parentType,
    parentId: input.parentId,
    schoolId: input.schoolId ?? null,
    capturedAt: exif.capturedAt,
    lat,
    lng,
    gpsAccuracyM,
    exifJson: exif.raw,
    photoHashSha256: sha256,
    fileName: input.fileName,
    storedPath,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    widthPx: exif.widthPx,
    heightPx: exif.heightPx,
    caption: input.caption ?? null,
    uploadedByUserId: input.uploadedByUserId ?? null,
  });
}

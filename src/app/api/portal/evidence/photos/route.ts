import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";
import { ingestEvidencePhoto } from "@/lib/server/evidence/photo-upload";
import { listEvidencePhotosByParentPostgres } from "@/lib/server/postgres/repositories/evidence-photos";
import { sanitisedErrorResponse } from "@/lib/server/http/error-response";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // 25 MB — phone photos can be large

const parentTypeSchema = z.enum([
  "coaching_visit",
  "training_session",
  "training_record",
]);

const listSchema = z.object({
  parentType: parentTypeSchema,
  parentId: z.coerce.number().int().positive(),
});

const uploadMetaSchema = z.object({
  parentType: parentTypeSchema,
  parentId: z.coerce.number().int().positive(),
  schoolId: z.coerce.number().int().positive().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  accuracyM: z.coerce.number().nonnegative().optional(),
  caption: z.string().trim().max(400).optional(),
});

function publicShape(row: Awaited<ReturnType<typeof listEvidencePhotosByParentPostgres>>[number]) {
  return {
    id: row.id,
    parentType: row.parentType,
    parentId: row.parentId,
    schoolId: row.schoolId,
    capturedAt: row.capturedAt,
    lat: row.lat,
    lng: row.lng,
    gpsAccuracyM: row.gpsAccuracyM,
    photoHashSha256: row.photoHashSha256,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    widthPx: row.widthPx,
    heightPx: row.heightPx,
    caption: row.caption,
    uploadedByUserId: row.uploadedByUserId,
    createdAt: row.createdAt,
    downloadUrl: `/api/portal/evidence/photos/${row.id}/download`,
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = listSchema.parse({
      parentType: searchParams.get("parentType"),
      parentId: searchParams.get("parentId"),
    });

    const rows = await listEvidencePhotosByParentPostgres(
      parsed.parentType,
      parsed.parentId,
    );
    return NextResponse.json({ photos: rows.map(publicShape) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid photo query." },
        { status: 400 },
      );
    }
    return sanitisedErrorResponse("api/portal/evidence/photos GET", error);
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing photo file." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: `Photo must be between 1 byte and ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)}MB.` },
        { status: 400 },
      );
    }
    if (!file.type.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
    }

    const meta = uploadMetaSchema.parse({
      parentType: form.get("parentType"),
      parentId: form.get("parentId"),
      schoolId: form.get("schoolId") || undefined,
      lat: form.get("lat") || undefined,
      lng: form.get("lng") || undefined,
      accuracyM: form.get("accuracyM") || undefined,
      caption: form.get("caption") || undefined,
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    const clientGeolocation =
      typeof meta.lat === "number" && typeof meta.lng === "number"
        ? { lat: meta.lat, lng: meta.lng, accuracyM: meta.accuracyM ?? null }
        : null;

    const photo = await ingestEvidencePhoto({
      parentType: meta.parentType,
      parentId: meta.parentId,
      schoolId: meta.schoolId ?? null,
      uploadedByUserId: user.id,
      fileName: file.name,
      mimeType: file.type,
      buffer,
      caption: meta.caption ?? null,
      clientGeolocation,
    });

    await auditLog({
      actor: user,
      action: "create",
      targetTable: "evidence_photos",
      targetId: photo.id,
      after: {
        parentType: photo.parentType,
        parentId: photo.parentId,
        fileName: photo.fileName,
        sizeBytes: photo.sizeBytes,
        hasGps: photo.lat !== null && photo.lng !== null,
        capturedAt: photo.capturedAt,
      },
      detail: `Uploaded photo evidence "${photo.fileName}" (${(photo.sizeBytes / 1024).toFixed(1)} kB) for ${photo.parentType} #${photo.parentId}`,
      request,
    });

    return NextResponse.json({ ok: true, photo: publicShape(photo) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid photo upload payload." },
        { status: 400 },
      );
    }
    return sanitisedErrorResponse("api/portal/evidence/photos POST", error);
  }
}

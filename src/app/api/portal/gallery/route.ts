import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { addImpactGalleryEntryPostgres, listImpactGalleryEntriesPostgres } from "@/lib/server/postgres/repositories/impact-gallery";
import { inferRegionFromDistrict } from "@/lib/uganda-locations";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const textSchema = z.object({
  quoteText: z.string().trim().min(5).max(400),
  personName: z.string().trim().min(2).max(100),
  personRole: z.string().trim().min(2).max(100),
  activityType: z.enum(["Training", "Coaching", "Assessments", "Materials", "Story Project"]),
  district: z.string().trim().min(2),
  recordedYear: z.string().trim().min(4).max(4),
});

function sanitizeSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizeExtension(name: string, fallbackType: string) {
  const ext = path.extname(name).toLowerCase();
  if (allowedExt.has(ext)) return ext;
  if (fallbackType === "image/jpeg") return ".jpg";
  if (fallbackType === "image/png") return ".png";
  if (fallbackType === "image/webp") return ".webp";
  if (fallbackType === "image/gif") return ".gif";
  if (fallbackType === "image/avif") return ".avif";
  return "";
}

function canManageGallery(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedPortalUser>>>) {
  return user.role !== "Volunteer";
}

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageGallery(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await listImpactGalleryEntriesPostgres(500);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageGallery(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const parsed = textSchema.parse({
      quoteText: formData.get("quoteText"),
      personName: formData.get("personName"),
      personRole: formData.get("personRole"),
      activityType: formData.get("activityType"),
      district: formData.get("district"),
      recordedYear: formData.get("recordedYear"),
    });

    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Choose an image file first." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be 12MB or less." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
    }

    const ext = normalizeExtension(file.name, file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported image format. Use JPG, PNG, WEBP, GIF, or AVIF." },
        { status: 400 },
      );
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const baseDir = path.join(process.cwd(), "public", "uploads", "gallery", year, month);
    await fs.mkdir(baseDir, { recursive: true });

    const baseName =
      sanitizeSegment(path.basename(file.name, path.extname(file.name))).slice(0, 60) || "gallery";
    const storedFile = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${baseName}${ext}`;
    const storedPath = path.join(baseDir, storedFile);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storedPath, buffer);

    const publicUrl = `/uploads/gallery/${year}/${month}/${storedFile}`;

    const item = await addImpactGalleryEntryPostgres({
      imageUrl: publicUrl,
      quoteText: parsed.quoteText,
      personName: parsed.personName,
      personRole: parsed.personRole,
      activityType: parsed.activityType,
      district: parsed.district,
      region: inferRegionFromDistrict(parsed.district) ?? "Unknown",
      recordedYear: parsed.recordedYear,
      fileName: file.name,
      sizeBytes: buffer.byteLength,
      mimeType: file.type || "image/jpeg",
    }, user);

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

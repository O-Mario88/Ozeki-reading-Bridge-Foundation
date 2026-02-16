import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listPortalTestimonials, savePortalTestimonial } from "@/lib/db";
import { resolveMimeType } from "@/lib/media-response";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const MAX_PHOTO_SIZE_BYTES = 20 * 1024 * 1024;
const allowedVideoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const allowedPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const textSchema = z.object({
  storytellerName: z.string().trim().min(2).max(120),
  storytellerRole: z.string().trim().min(2).max(120),
  schoolName: z.string().trim().min(2).max(160),
  district: z.string().trim().min(2).max(120),
  storyText: z.string().trim().min(30).max(6000),
});

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromName(fileName: string) {
  return path.extname(fileName).slice(0, 12);
}

function validateVideo(file: File) {
  if (file.size <= 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error("Video must be between 1 byte and 150MB.");
  }

  const mime = file.type.toLowerCase();
  const extension = path.extname(file.name).toLowerCase();
  const hasVideoMime = mime.startsWith("video/");
  const hasVideoExtension = allowedVideoExtensions.has(extension);
  if (!(hasVideoMime || hasVideoExtension)) {
    throw new Error("Only video files are allowed for the testimonial video.");
  }
}

function validateOptionalPhoto(file: File | null) {
  if (!file) {
    return;
  }

  if (file.size <= 0 || file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("Photo must be between 1 byte and 20MB.");
  }

  const mime = file.type.toLowerCase();
  const extension = path.extname(file.name).toLowerCase();
  const hasImageMime = mime.startsWith("image/");
  const hasImageExtension = allowedPhotoExtensions.has(extension);
  if (!(hasImageMime || hasImageExtension)) {
    throw new Error("Only image files are allowed for testimonial photo.");
  }
}

async function persistUpload(
  file: File,
  baseDir: string,
  fallbackBaseName: string,
  mediaKind: "image" | "video",
) {
  const extension = extensionFromName(file.name);
  const safeBaseName = sanitizeName(path.basename(file.name, extension)).slice(0, 60);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const storedFileName = `${Date.now()}-${randomSuffix}-${safeBaseName || fallbackBaseName}${extension}`;
  const storedPath = path.join(baseDir, storedFileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, bytes);

  return {
    fileName: file.name,
    storedPath,
    mimeType: resolveMimeType(file.name, file.type, mediaKind),
    sizeBytes: bytes.byteLength,
  };
}

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testimonials = listPortalTestimonials(user, 180).map((item) => ({
    ...item,
    videoUrl: `/api/testimonials/${item.id}/video`,
    photoUrl: item.photoFileName ? `/api/testimonials/${item.id}/photo` : null,
  }));
  return NextResponse.json({ testimonials });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const parsedText = textSchema.parse({
      storytellerName: formData.get("storytellerName"),
      storytellerRole: formData.get("storytellerRole"),
      schoolName: formData.get("schoolName"),
      district: formData.get("district"),
      storyText: formData.get("storyText"),
    });

    const video = formData.get("video");
    if (!(video instanceof File)) {
      return NextResponse.json({ error: "Testimonial video is required." }, { status: 400 });
    }
    validateVideo(video);

    const photoField = formData.get("photo");
    const photo =
      photoField instanceof File && photoField.size > 0 ? photoField : null;
    validateOptionalPhoto(photo);

    const monthSegment = new Date().toISOString().slice(0, 7);
    const testimonialsDir = path.join(process.cwd(), "data", "testimonials", monthSegment);
    await fs.mkdir(testimonialsDir, { recursive: true });

    const savedVideo = await persistUpload(
      video,
      testimonialsDir,
      "testimonial-video",
      "video",
    );
    const savedPhoto = photo
      ? await persistUpload(photo, testimonialsDir, "testimonial-photo", "image")
      : null;

    const testimonial = savePortalTestimonial({
      storytellerName: parsedText.storytellerName,
      storytellerRole: parsedText.storytellerRole,
      schoolName: parsedText.schoolName,
      district: parsedText.district,
      storyText: parsedText.storyText,
      videoFileName: savedVideo.fileName,
      videoStoredPath: savedVideo.storedPath,
      videoMimeType: savedVideo.mimeType,
      videoSizeBytes: savedVideo.sizeBytes,
      photoFileName: savedPhoto?.fileName ?? null,
      photoStoredPath: savedPhoto?.storedPath ?? null,
      photoMimeType: savedPhoto?.mimeType ?? null,
      photoSizeBytes: savedPhoto?.sizeBytes ?? null,
      createdByUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      testimonial: {
        ...testimonial,
        videoUrl: `/api/testimonials/${testimonial.id}/video`,
        photoUrl: testimonial.photoFileName
          ? `/api/testimonials/${testimonial.id}/photo`
          : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid testimonial payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

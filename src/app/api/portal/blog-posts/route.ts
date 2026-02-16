import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listPortalBlogPosts, savePortalBlogPost } from "@/lib/db";
import { resolveMimeType } from "@/lib/media-response";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { blogCategories } from "@/lib/content";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const allowedVideoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const allowedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const textSchema = z.object({
  title: z.string().trim().min(6).max(240),
  subtitle: z.string().trim().max(280).optional(),
  body: z.string().trim().min(60).max(25000),
  category: z.string().trim().min(2).max(120),
  tags: z.string().trim().max(600).optional(),
});

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromName(fileName: string) {
  return path.extname(fileName).toLowerCase().slice(0, 12);
}

function parseTags(value: string | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function validateOptionalImage(file: File | null) {
  if (!file) return;

  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image must be between 1 byte and 20MB.");
  }

  const mime = file.type.toLowerCase();
  const extension = extensionFromName(file.name);
  if (!(mime.startsWith("image/") || allowedImageExtensions.has(extension))) {
    throw new Error("Only image files are allowed for blog image upload.");
  }
}

function validateOptionalVideo(file: File | null) {
  if (!file) return;

  if (file.size <= 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error("Video must be between 1 byte and 150MB.");
  }

  const mime = file.type.toLowerCase();
  const extension = extensionFromName(file.name);
  if (!(mime.startsWith("video/") || allowedVideoExtensions.has(extension))) {
    throw new Error("Only video files are allowed for blog video upload.");
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
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posts = listPortalBlogPosts(user, 180).map((post) => ({
    ...post,
    imageUrl: post.imageFileName ? `/api/blog/${post.id}/image` : null,
    videoUrl: post.videoFileName ? `/api/blog/${post.id}/video` : null,
  }));

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const isPublishedRaw = String(formData.get("isPublished") ?? "true").toLowerCase();
    const parsed = textSchema.parse({
      title: formData.get("title"),
      subtitle: formData.get("subtitle") || undefined,
      body: formData.get("body"),
      category: formData.get("category"),
      tags: formData.get("tags") || undefined,
    });

    if (!blogCategories.includes(parsed.category)) {
      return NextResponse.json({ error: "Invalid blog category." }, { status: 400 });
    }

    const imageField = formData.get("image");
    const videoField = formData.get("video");
    const image = imageField instanceof File && imageField.size > 0 ? imageField : null;
    const video = videoField instanceof File && videoField.size > 0 ? videoField : null;

    validateOptionalImage(image);
    validateOptionalVideo(video);

    const monthSegment = new Date().toISOString().slice(0, 7);
    const blogDir = path.join(process.cwd(), "data", "blog", monthSegment);
    await fs.mkdir(blogDir, { recursive: true });

    const savedImage = image ? await persistUpload(image, blogDir, "blog-image", "image") : null;
    const savedVideo = video ? await persistUpload(video, blogDir, "blog-video", "video") : null;
    const tags = parseTags(parsed.tags);

    const post = savePortalBlogPost({
      title: parsed.title,
      subtitle: parsed.subtitle ?? null,
      body: parsed.body,
      category: parsed.category,
      tags,
      imageFileName: savedImage?.fileName ?? null,
      imageStoredPath: savedImage?.storedPath ?? null,
      imageMimeType: savedImage?.mimeType ?? null,
      imageSizeBytes: savedImage?.sizeBytes ?? null,
      videoFileName: savedVideo?.fileName ?? null,
      videoStoredPath: savedVideo?.storedPath ?? null,
      videoMimeType: savedVideo?.mimeType ?? null,
      videoSizeBytes: savedVideo?.sizeBytes ?? null,
      isPublished: isPublishedRaw !== "false",
      createdByUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      post: {
        ...post,
        imageUrl: post.imageFileName ? `/api/blog/${post.id}/image` : null,
        videoUrl: post.videoFileName ? `/api/blog/${post.id}/video` : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid blog post payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

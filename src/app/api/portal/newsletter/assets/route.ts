import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionOf(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const fileField = formData.get("file");
    if (!(fileField instanceof File) || fileField.size <= 0) {
      return NextResponse.json({ error: "Select an image file to upload." }, { status: 400 });
    }

    if (fileField.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be 12MB or smaller." }, { status: 400 });
    }

    const ext = extensionOf(fileField.name);
    const isImageMime = fileField.type.toLowerCase().startsWith("image/");
    if (!isImageMime && !allowedExtensions.has(ext)) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    const normalizedExt = allowedExtensions.has(ext)
      ? ext
      : fileField.type === "image/png"
        ? ".png"
        : fileField.type === "image/webp"
          ? ".webp"
          : fileField.type === "image/avif"
            ? ".avif"
            : ".jpg";

    const monthSegment = new Date().toISOString().slice(0, 7);
    const rootDir = path.join(process.cwd(), "data", "newsletter-assets");
    const monthDir = path.join(rootDir, monthSegment);
    await fs.mkdir(monthDir, { recursive: true });

    const safeBaseName = sanitizeSegment(path.basename(fileField.name, ext)).slice(0, 80) || "newsletter-image";
    const storedFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName}${normalizedExt}`;
    const storedPath = path.join(monthDir, storedFileName);
    const bytes = Buffer.from(await fileField.arrayBuffer());
    await fs.writeFile(storedPath, bytes);

    return NextResponse.json({
      ok: true,
      fileName: fileField.name,
      sizeBytes: bytes.byteLength,
      assetUrl: `/api/newsletter/assets/${encodeURIComponent(monthSegment)}/${encodeURIComponent(storedFileName)}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

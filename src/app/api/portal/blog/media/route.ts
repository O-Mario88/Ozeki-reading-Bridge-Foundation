import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentPortalUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

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
  return "";
}

export async function POST(request: Request) {
  const user = await getCurrentPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManageBlog =
    user.role === "Staff" || user.role === "Admin" || user.isAdmin || user.isSuperAdmin;
  if (!canManageBlog) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
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
        { error: "Unsupported image format. Use JPG, PNG, WEBP, or GIF." },
        { status: 400 },
      );
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const baseDir = path.join(process.cwd(), "public", "uploads", "blog", year, month);
    await fs.mkdir(baseDir, { recursive: true });

    const baseName =
      sanitizeSegment(path.basename(file.name, path.extname(file.name))).slice(0, 60) || "blog";
    const storedFile = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${baseName}${ext}`;
    const storedPath = path.join(baseDir, storedFile);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storedPath, buffer);

    const publicUrl = `/uploads/blog/${year}/${month}/${storedFile}`;
    return NextResponse.json({ ok: true, url: publicUrl, sizeBytes: buffer.byteLength });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

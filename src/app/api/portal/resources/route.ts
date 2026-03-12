import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listPortalResources, savePortalResource } from "@/lib/db";
import { resolveMimeType } from "@/lib/media-response";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { portalResourceSections } from "@/lib/types";

export const runtime = "nodejs";

const MAX_RESOURCE_SIZE_BYTES = 120 * 1024 * 1024;
const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".zip",
]);

const gradeValues = ["Nursery", "P1-P2", "P3-P4", "P5-P7", "All Primary"] as const;
const skillValues = [
  "Phonics",
  "Fluency",
  "Comprehension",
  "Assessment",
  "Remedial",
  "Writing",
] as const;
const typeValues = [
  "Toolkit",
  "Lesson Plan",
  "Assessment",
  "Poster",
  "Guide",
  "Reader",
] as const;
const sectionValues = portalResourceSections;

const textSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(8).max(2000),
  grade: z.enum(gradeValues),
  skill: z.enum(skillValues),
  type: z.enum(typeValues),
  section: z.enum(sectionValues),
  downloadLabel: z.string().trim().max(120).optional(),
  externalUrl: z.string().trim().url().max(400).optional(),
});

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function fileExt(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function buildDownloadUrl(resourceId: number, externalUrl: string | null) {
  return externalUrl || `/api/resources/${resourceId}/download`;
}

async function persistUpload(file: File, baseDir: string) {
  if (file.size <= 0 || file.size > MAX_RESOURCE_SIZE_BYTES) {
    throw new Error("Resource file must be between 1 byte and 120MB.");
  }

  const ext = fileExt(file.name);
  const isAllowedExt = allowedExtensions.has(ext);
  const isKnownDocumentMime =
    file.type.startsWith("application/") ||
    file.type.startsWith("text/") ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isAllowedExt && !isKnownDocumentMime) {
    throw new Error("Only document/resource file types are allowed.");
  }

  const baseName = sanitizeName(path.basename(file.name, ext)).slice(0, 80);
  const storedFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${baseName || "resource"}${ext}`;
  const storedPath = path.join(baseDir, storedFileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, bytes);

  return {
    fileName: file.name,
    storedPath,
    mimeType: resolveMimeType(file.name, file.type, "any"),
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

  const resources = listPortalResources(user, 300).map((resource) => ({
    ...resource,
    downloadUrl: buildDownloadUrl(resource.id, resource.externalUrl),
  }));
  return NextResponse.json({ resources });
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
    const rawExternalUrl = String(formData.get("externalUrl") ?? "").trim();
    const isPublishedRaw = String(formData.get("isPublished") ?? "true").toLowerCase();
    const parsed = textSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      grade: formData.get("grade"),
      skill: formData.get("skill"),
      type: formData.get("type"),
      section: formData.get("section"),
      downloadLabel: formData.get("downloadLabel") || undefined,
      externalUrl: rawExternalUrl || undefined,
    });

    const fileField = formData.get("file");
    const uploadFile = fileField instanceof File && fileField.size > 0 ? fileField : null;

    if (!uploadFile && !parsed.externalUrl) {
      return NextResponse.json(
        { error: "Upload a file or provide an external download URL." },
        { status: 400 },
      );
    }

    const monthSegment = new Date().toISOString().slice(0, 7);
    const sectionSegment = slugifySegment(parsed.section) || "resources-library";
    const resourcesDir = path.join(
      process.cwd(),
      "data",
      "resources",
      sectionSegment,
      monthSegment,
    );
    await fs.mkdir(resourcesDir, { recursive: true });

    const uploaded = uploadFile ? await persistUpload(uploadFile, resourcesDir) : null;

    const resource = savePortalResource({
      title: parsed.title,
      description: parsed.description,
      grade: parsed.grade,
      skill: parsed.skill,
      type: parsed.type,
      section: parsed.section,
      fileName: uploaded?.fileName ?? null,
      storedPath: uploaded?.storedPath ?? null,
      mimeType: uploaded?.mimeType ?? null,
      sizeBytes: uploaded?.sizeBytes ?? null,
      externalUrl: parsed.externalUrl ?? null,
      downloadLabel: parsed.downloadLabel ?? "Download resource",
      isPublished: isPublishedRaw !== "false",
      createdByUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      resource: {
        ...resource,
        downloadUrl: buildDownloadUrl(resource.id, resource.externalUrl),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid resource payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

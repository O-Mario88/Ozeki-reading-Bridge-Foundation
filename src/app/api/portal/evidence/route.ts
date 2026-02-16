import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listPortalEvidence, savePortalEvidence } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const evidenceFilterSchema = z.object({
  module: z.enum(["training", "visit", "assessment", "story"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  school: z.string().optional(),
  recordId: z.coerce.number().int().positive().optional(),
});

const uploadMetaSchema = z.object({
  module: z.enum(["training", "visit", "assessment", "story"]),
  date: z.string().min(6),
  schoolName: z.string().min(2),
  recordId: z.coerce.number().int().positive().optional(),
});

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = evidenceFilterSchema.parse({
      module: searchParams.get("module") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      school: searchParams.get("school") || undefined,
      recordId: searchParams.get("recordId") || undefined,
    });

    const evidence = listPortalEvidence(filters, user).map((item) => ({
      ...item,
      downloadUrl: `/api/portal/evidence/${item.id}/download`,
    }));
    return NextResponse.json({ evidence });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid evidence filters." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
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
      return NextResponse.json({ error: "Missing evidence file." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File must be between 1 byte and 10MB." },
        { status: 400 },
      );
    }

    const meta = uploadMetaSchema.parse({
      module: form.get("module"),
      date: form.get("date"),
      schoolName: form.get("schoolName"),
      recordId: form.get("recordId") || undefined,
    });

    const monthSegment = new Date().toISOString().slice(0, 7);
    const evidenceDir = path.join(process.cwd(), "data", "evidence", monthSegment);
    await fs.mkdir(evidenceDir, { recursive: true });

    const extension = path.extname(file.name).slice(0, 12);
    const safeBaseName = sanitizeName(path.basename(file.name, extension)).slice(0, 60);
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const storedFileName = `${Date.now()}-${randomSuffix}-${safeBaseName || "evidence"}${extension}`;
    const storedPath = path.join(evidenceDir, storedFileName);

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storedPath, bytes);

    const evidence = savePortalEvidence({
      recordId: meta.recordId,
      module: meta.module,
      date: meta.date,
      schoolName: meta.schoolName,
      fileName: file.name,
      storedPath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: bytes.byteLength,
      uploadedByUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      evidence: {
        ...evidence,
        downloadUrl: `/api/portal/evidence/${evidence.id}/download`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid evidence upload payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { getRuntimeDataDir } from "@/lib/runtime-paths";
import { getEvidencePhotoByIdPostgres } from "@/lib/server/postgres/repositories/evidence-photos";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid photo id.");
  }
  return id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = toId(params.id);
    const photo = await getEvidencePhotoByIdPostgres(id);
    if (!photo) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    const normalizedRoot = path.resolve(getRuntimeDataDir());
    const normalizedFile = path.resolve(photo.storedPath);
    const inAllowedRoot =
      normalizedFile === normalizedRoot
      || normalizedFile.startsWith(`${normalizedRoot}${path.sep}`);
    if (!inAllowedRoot) {
      return NextResponse.json({ error: "Invalid photo path." }, { status: 400 });
    }

    const bytes = await fs.readFile(normalizedFile);
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(photo.fileName)}"`,
        "Content-Length": String(bytes.byteLength),
        "X-Photo-SHA256": photo.photoHashSha256,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPortalEvidenceById } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid evidence id.");
  }
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = toId(params.id);
    const evidence = getPortalEvidenceById(id, user);
    if (!evidence) {
      return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
    }

    const normalizedRoot = path.join(process.cwd(), "data");
    const normalizedFile = path.normalize(evidence.storedPath);

    if (!normalizedFile.startsWith(normalizedRoot)) {
      return NextResponse.json({ error: "Invalid evidence path." }, { status: 400 });
    }

    const bytes = await fs.readFile(normalizedFile);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(evidence.fileName)}"`,
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

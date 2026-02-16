import path from "node:path";
import { NextResponse } from "next/server";
import { getPublishedPortalResourceById } from "@/lib/db";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid resource id.");
  }
  return id;
}

function ensureSafePath(storedPath: string) {
  const normalizedRoot = path.resolve(process.cwd(), "data", "resources");
  const normalizedFile = path.resolve(storedPath);
  if (!normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error("Invalid resource file path.");
  }
  return normalizedFile;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const id = toId(params.id);
    const resource = getPublishedPortalResourceById(id);

    if (!resource) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    if (resource.externalUrl) {
      return NextResponse.redirect(resource.externalUrl, 302);
    }

    if (!resource.storedPath) {
      return NextResponse.json({ error: "Resource file unavailable." }, { status: 404 });
    }

    const filePath = ensureSafePath(resource.storedPath);
    const contentType = resolveMimeType(
      resource.fileName ?? filePath,
      resource.mimeType,
      "any",
    );

    return createMediaFileResponse({
      request,
      filePath,
      contentType,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

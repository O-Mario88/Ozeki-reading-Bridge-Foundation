import path from "node:path";
import { NextResponse } from "next/server";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";

export const runtime = "nodejs";

function resolveSafeAssetPath(segments: string[]) {
  if (!Array.isArray(segments) || segments.length < 2) {
    throw new Error("Invalid asset path.");
  }

  const decoded = segments.map((segment) => decodeURIComponent(segment).trim());
  if (
    decoded.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("..") ||
        /[\\/]/.test(segment),
    )
  ) {
    throw new Error("Invalid asset path.");
  }

  const root = path.resolve(process.cwd(), "data", "newsletter-assets");
  const resolved = path.resolve(root, ...decoded);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid asset path.");
  }
  return resolved;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ asset: string[] }> },
) {
  try {
    const { asset } = await context.params;
    const filePath = resolveSafeAssetPath(asset);
    const contentType = resolveMimeType(filePath, null, "image");

    return createMediaFileResponse({
      request,
      filePath,
      contentType,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid asset path.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Newsletter asset not found." }, { status: 404 });
  }
}

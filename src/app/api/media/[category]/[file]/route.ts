import path from "node:path";
import { NextResponse } from "next/server";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";

export const runtime = "nodejs";

const categoryRoots = {
  photos: path.join(process.cwd(), "assets", "photos"),
  videos: path.join(process.cwd(), "assets", "videos"),
} as const;

function getCategoryRoot(category: string) {
  if (category === "photos") {
    return categoryRoots.photos;
  }
  if (category === "videos") {
    return categoryRoots.videos;
  }
  throw new Error("Unsupported media category.");
}

function resolveSafePath(root: string, fileName: string) {
  const normalizedFile = path.basename(fileName);
  const resolved = path.join(root, normalizedFile);
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid file path.");
  }
  return resolved;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ category: string; file: string }> },
) {
  try {
    const params = await context.params;
    const categoryRoot = getCategoryRoot(params.category);
    const filePath = resolveSafePath(categoryRoot, params.file);

    const mediaKind = params.category === "photos" ? "image" : "video";
    const contentType = resolveMimeType(filePath, null, mediaKind);

    return createMediaFileResponse({
      request,
      filePath,
      contentType,
      allowRangeRequests: mediaKind === "video",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unsupported media category.") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Invalid file path.") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Media file not found." }, { status: 404 });
  }
}

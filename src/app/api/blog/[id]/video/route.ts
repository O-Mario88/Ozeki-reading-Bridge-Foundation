import path from "node:path";
import { NextResponse } from "next/server";
import { getPublishedPortalBlogPostById } from "@/lib/db";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid blog post id.");
  }
  return id;
}

function ensureSafePath(storedPath: string) {
  const normalizedRoot = path.resolve(process.cwd(), "data", "blog");
  const normalizedFile = path.resolve(storedPath);
  if (!normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error("Invalid blog media path.");
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
    const post = getPublishedPortalBlogPostById(id);
    if (!post || !post.videoStoredPath) {
      return NextResponse.json({ error: "Blog video not found." }, { status: 404 });
    }

    const filePath = ensureSafePath(post.videoStoredPath);
    const contentType = resolveMimeType(
      post.videoFileName ?? filePath,
      post.videoMimeType,
      "video",
    );

    return createMediaFileResponse({
      request,
      filePath,
      contentType,
      allowRangeRequests: true,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

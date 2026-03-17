import path from "node:path";
import { NextResponse } from "next/server";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";
import { getRuntimeDataDir } from "@/lib/runtime-paths";
import { getPublishedPortalTestimonialByIdPostgres } from "@/lib/server/postgres/repositories/public-content";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid testimonial id.");
  }
  return id;
}

function ensureSafePath(storedPath: string) {
  const normalizedRoot = path.resolve(getRuntimeDataDir(), "testimonials");
  const normalizedFile = path.resolve(storedPath);
  if (!normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error("Invalid testimonial media path.");
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
    const testimonial = await getPublishedPortalTestimonialByIdPostgres(id);
    if (!testimonial || !testimonial.photoStoredPath || !testimonial.photoMimeType) {
      return NextResponse.json({ error: "Testimonial photo not found." }, { status: 404 });
    }

    const filePath = ensureSafePath(testimonial.photoStoredPath);
    const contentType = resolveMimeType(
      testimonial.photoFileName ?? filePath,
      testimonial.photoMimeType,
      "image",
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

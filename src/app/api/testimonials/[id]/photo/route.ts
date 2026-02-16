import path from "node:path";
import { NextResponse } from "next/server";
import { getPublishedPortalTestimonialById } from "@/lib/db";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid testimonial id.");
  }
  return id;
}

function ensureSafePath(storedPath: string) {
  const normalizedRoot = path.resolve(process.cwd(), "data", "testimonials");
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
    const testimonial = getPublishedPortalTestimonialById(id);
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

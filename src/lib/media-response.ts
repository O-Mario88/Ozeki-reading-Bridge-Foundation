import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DEFAULT_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

const mimeTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
};

interface ByteRange {
  start: number;
  end: number;
}

function parseByteRange(rangeHeader: string, sizeBytes: number): ByteRange | null {
  const parsed = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!parsed) {
    return null;
  }

  const rawStart = parsed[1];
  const rawEnd = parsed[2];
  const start = rawStart === "" ? 0 : Number.parseInt(rawStart, 10);
  let end = rawEnd === "" ? sizeBytes - 1 : Number.parseInt(rawEnd, 10);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end < 0 ||
    start > end ||
    start >= sizeBytes
  ) {
    return null;
  }

  end = Math.min(end, sizeBytes - 1);
  return { start, end };
}

async function readFileChunk(filePath: string, start: number, end: number) {
  const byteLength = end - start + 1;
  const fileHandle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(byteLength);
    await fileHandle.read(buffer, 0, byteLength, start);
    return buffer;
  } finally {
    await fileHandle.close();
  }
}

export function resolveMimeType(
  filePathOrName: string,
  fallback: string | null | undefined,
  kind: "image" | "video" | "any" = "any",
) {
  const normalizedFallback = (fallback ?? "").toLowerCase();
  if (
    (kind === "image" && normalizedFallback.startsWith("image/")) ||
    (kind === "video" && normalizedFallback.startsWith("video/")) ||
    (kind === "any" && normalizedFallback.length > 0)
  ) {
    return fallback as string;
  }

  const inferred = mimeTypeByExtension[path.extname(filePathOrName).toLowerCase()];
  if (inferred) {
    return inferred;
  }

  if (kind === "image") {
    return "image/jpeg";
  }
  if (kind === "video") {
    return "video/mp4";
  }
  return "application/octet-stream";
}

export async function createMediaFileResponse(options: {
  request: Request;
  filePath: string;
  contentType: string;
  cacheControl?: string;
  allowRangeRequests?: boolean;
}) {
  const { request, filePath, contentType } = options;
  const cacheControl = options.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error("Media file not found.");
  }

  const totalBytes = stats.size;
  const rangeHeader = options.allowRangeRequests ? request.headers.get("range") : null;

  if (rangeHeader) {
    const range = parseByteRange(rangeHeader, totalBytes);
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${totalBytes}`,
        },
      });
    }

    const chunk = await readFileChunk(filePath, range.start, range.end);
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${range.start}-${range.end}/${totalBytes}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl,
      },
    });
  }

  const bytes = await fs.readFile(filePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControl,
    },
  });
}

import path from "node:path";
import { NextResponse } from "next/server";
import { getPublishedPortalTestimonialById } from "@/lib/db";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";

export const runtime = "nodejs";
const YOUTUBE_API_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const OZEKI_YOUTUBE_QUERY_HINT = "ozekiRead";

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

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferSearchTitle(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveYouTubeEmbedByTitle(rawTitle: string) {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  const query = inferSearchTitle(rawTitle);
  if (!query) {
    return null;
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "10",
    q: channelId ? query : `${query} ${OZEKI_YOUTUBE_QUERY_HINT}`,
    key: apiKey,
  });
  if (channelId) {
    params.set("channelId", channelId);
  }

  const response = await fetch(`${YOUTUBE_API_SEARCH_URL}?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string };
    }>;
  };
  const items = payload.items ?? [];
  if (items.length === 0) {
    return null;
  }

  const normalizedInput = normalizeTitle(query);
  const best = items
    .map((item) => {
      const candidateTitle = item.snippet?.title ?? "";
      const normalizedCandidate = normalizeTitle(candidateTitle);
      let score = 0;
      if (normalizedCandidate === normalizedInput) score += 5;
      if (normalizedCandidate.includes(normalizedInput)) score += 3;
      if (normalizedInput.includes(normalizedCandidate)) score += 2;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.item;

  const videoId = best?.id?.videoId?.trim();
  if (!videoId) {
    return null;
  }
  return `https://www.youtube.com/embed/${videoId}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const id = toId(params.id);
    const testimonial = getPublishedPortalTestimonialById(id);
    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }
    if (testimonial.videoSourceType === "youtube") {
      const target = testimonial.youtubeEmbedUrl || testimonial.youtubeWatchUrl;
      if (!target) {
        return NextResponse.json({ error: "Linked YouTube video metadata is missing." }, { status: 404 });
      }
      return NextResponse.redirect(target);
    }

    try {
      const filePath = ensureSafePath(testimonial.videoStoredPath);
      const contentType = resolveMimeType(
        testimonial.videoFileName || filePath,
        testimonial.videoMimeType,
        "video",
      );
      return createMediaFileResponse({
        request,
        filePath,
        contentType,
        allowRangeRequests: true,
      });
    } catch {
      const fallbackEmbed = await resolveYouTubeEmbedByTitle(
        testimonial.youtubeVideoTitle || testimonial.videoFileName || "",
      );
      if (fallbackEmbed) {
        return NextResponse.redirect(fallbackEmbed);
      }
      return NextResponse.json(
        { error: "Video file is unavailable and no matching YouTube video was found." },
        { status: 404 },
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

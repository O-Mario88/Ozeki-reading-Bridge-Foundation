import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSchoolDirectoryRecord,
  listPortalTestimonials,
  savePortalTestimonial,
  setPortalTestimonialModerationStatus,
} from "@/lib/db";
import { resolveMimeType } from "@/lib/media-response";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";
import { getRuntimeDataDir } from "@/lib/runtime-paths";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE_BYTES = 20 * 1024 * 1024;
const YOUTUBE_API_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_API_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const OZEKI_YOUTUBE_QUERY_HINT = "ozekiRead";
const allowedPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const textSchema = z.object({
  storytellerName: z.string().trim().min(2).max(120),
  storytellerRole: z.string().trim().min(2).max(120),
  schoolId: z.coerce.number().int().positive(),
  storyTitle: z.string().trim().max(180).optional(),
  baselineChallenge: z.string().trim().max(2200).optional(),
  whatHappened: z.string().trim().max(2200).optional(),
  measurableChange: z.string().trim().max(2200).optional(),
  nextSteps: z.string().trim().max(2200).optional(),
  storyText: z.string().trim().max(6000).optional(),
  youtubeVideoTitle: z.string().trim().max(240).optional(),
  youtubeChannelId: z.string().trim().max(120).optional(),
}).superRefine((value, ctx) => {
  const hasNarrative = (value.storyText?.trim().length ?? 0) >= 30;
  const hasStructured =
    (value.storyTitle?.trim().length ?? 0) >= 6 &&
    (value.baselineChallenge?.trim().length ?? 0) >= 20 &&
    (value.whatHappened?.trim().length ?? 0) >= 20 &&
    (value.measurableChange?.trim().length ?? 0) >= 20;

  if (!hasNarrative && !hasStructured) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Provide either a full change story narrative (30+ chars) or complete the structured change story fields.",
    });
  }
});

type ResolvedYouTubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  embedUrl: string;
  watchUrl: string;
};

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromName(fileName: string) {
  return path.extname(fileName).slice(0, 12);
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromUploadedFile(file: File | null) {
  if (!file) {
    return "";
  }
  const extension = path.extname(file.name);
  return file.name
    .replace(extension, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYouTubeVideoId(value: string) {
  const trimmed = value.trim();
  const idPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (idPattern.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/\//g, "").trim();
      return idPattern.test(id) ? id : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const idFromQuery = parsed.searchParams.get("v")?.trim() ?? "";
      if (idPattern.test(idFromQuery)) {
        return idFromQuery;
      }
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const possibleId = pathParts[pathParts.length - 1] ?? "";
      return idPattern.test(possibleId) ? possibleId : null;
    }
  } catch {
    return null;
  }

  return null;
}

function pickYouTubeThumbnail(snippet: {
  thumbnails?: Record<string, { url?: string } | undefined>;
}) {
  const thumbs = snippet.thumbnails ?? {};
  return (
    thumbs.maxres?.url ??
    thumbs.standard?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    null
  );
}

function shapeYouTubeVideo(payload: {
  videoId: string;
  title: string;
  channelTitle: string | null;
  thumbnailUrl: string | null;
}): ResolvedYouTubeVideo {
  const cleanId = payload.videoId.trim();
  return {
    videoId: cleanId,
    title: payload.title.trim(),
    channelTitle: payload.channelTitle?.trim() || null,
    thumbnailUrl: payload.thumbnailUrl?.trim() || null,
    embedUrl: `https://www.youtube.com/embed/${cleanId}`,
    watchUrl: `https://www.youtube.com/watch?v=${cleanId}`,
  };
}

async function resolveYouTubeVideoById(videoId: string, apiKey: string) {
  const params = new URLSearchParams({
    part: "snippet",
    id: videoId,
    key: apiKey,
    maxResults: "1",
  });
  const response = await fetch(`${YOUTUBE_API_VIDEOS_URL}?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not verify the selected YouTube video.");
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: Record<string, { url?: string } | undefined>;
      };
    }>;
  };

  const firstItem = payload.items?.[0];
  if (!firstItem?.id || !firstItem.snippet?.title) {
    throw new Error("YouTube video was not found.");
  }

  return shapeYouTubeVideo({
    videoId: firstItem.id,
    title: firstItem.snippet.title,
    channelTitle: firstItem.snippet.channelTitle ?? null,
    thumbnailUrl: pickYouTubeThumbnail(firstItem.snippet),
  });
}

async function resolveYouTubeVideoByTitle(rawTitle: string, channelIdHint?: string) {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "YouTube API key is not configured. Add YOUTUBE_API_KEY to enable video-title linking.",
    );
  }

  const input = rawTitle.trim();
  if (!input) {
    throw new Error("YouTube video title is required.");
  }

  const directId = extractYouTubeVideoId(input);
  if (directId) {
    return resolveYouTubeVideoById(directId, apiKey);
  }

  const channelId = channelIdHint?.trim() || process.env.YOUTUBE_CHANNEL_ID?.trim() || "";
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "12",
    q: channelId ? input : `${input} ${OZEKI_YOUTUBE_QUERY_HINT}`,
    key: apiKey,
  });
  if (channelId) {
    params.set("channelId", channelId);
  }

  const response = await fetch(`${YOUTUBE_API_SEARCH_URL}?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not search YouTube. Confirm API key and channel settings.");
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: Record<string, { url?: string } | undefined>;
      };
    }>;
  };
  const items = payload.items ?? [];
  if (items.length === 0) {
    throw new Error("No YouTube video matched that title.");
  }

  const normalizedInput = normalizeTitle(input);
  const sorted = items
    .map((item) => {
      const title = item.snippet?.title ?? "";
      const normalizedTitle = normalizeTitle(title);
      let score = 0;
      if (normalizedTitle === normalizedInput) score += 5;
      if (normalizedTitle.includes(normalizedInput)) score += 3;
      if (normalizedInput.includes(normalizedTitle)) score += 2;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const candidate = sorted[0]?.item;
  const videoId = candidate?.id?.videoId?.trim() ?? "";
  const title = candidate?.snippet?.title?.trim() ?? "";
  if (!videoId || !title) {
    throw new Error("Could not resolve that YouTube title to a video.");
  }

  return shapeYouTubeVideo({
    videoId,
    title,
    channelTitle: candidate?.snippet?.channelTitle ?? null,
    thumbnailUrl: pickYouTubeThumbnail(candidate?.snippet ?? {}),
  });
}

function validateOptionalPhoto(file: File | null) {
  if (!file) {
    return;
  }

  if (file.size <= 0 || file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("Photo must be between 1 byte and 20MB.");
  }

  const mime = file.type.toLowerCase();
  const extension = path.extname(file.name).toLowerCase();
  const hasImageMime = mime.startsWith("image/");
  const hasImageExtension = allowedPhotoExtensions.has(extension);
  if (!(hasImageMime || hasImageExtension)) {
    throw new Error("Only image files are allowed for testimonial photo.");
  }
}

async function persistUpload(
  file: File,
  baseDir: string,
  fallbackBaseName: string,
  mediaKind: "image" | "video",
) {
  const extension = extensionFromName(file.name);
  const safeBaseName = sanitizeName(path.basename(file.name, extension)).slice(0, 60);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const storedFileName = `${Date.now()}-${randomSuffix}-${safeBaseName || fallbackBaseName}${extension}`;
  const storedPath = path.join(baseDir, storedFileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, bytes);

  return {
    fileName: file.name,
    storedPath,
    mimeType: resolveMimeType(file.name, file.type, mediaKind),
    sizeBytes: bytes.byteLength,
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const schoolIdParam = searchParams.get("schoolId");
  const schoolId = schoolIdParam ? Number.parseInt(schoolIdParam, 10) : NaN;
  const testimonials = listPortalTestimonials(
    user,
    180,
    Number.isInteger(schoolId) && schoolId > 0 ? { schoolId } : undefined,
  ).map((item) => ({
    ...item,
    videoUrl:
      item.videoSourceType === "youtube"
        ? item.youtubeEmbedUrl || item.youtubeWatchUrl || `/api/testimonials/${item.id}/video`
        : `/api/testimonials/${item.id}/video`,
    photoUrl: item.photoFileName ? `/api/testimonials/${item.id}/photo` : null,
  }));
  return NextResponse.json({ testimonials });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const parsedText = textSchema.parse({
      storytellerName: formData.get("storytellerName"),
      storytellerRole: formData.get("storytellerRole"),
      schoolId: formData.get("schoolId"),
      storyTitle: formData.get("storyTitle") ?? undefined,
      baselineChallenge: formData.get("baselineChallenge") ?? undefined,
      whatHappened: formData.get("whatHappened") ?? undefined,
      measurableChange: formData.get("measurableChange") ?? undefined,
      nextSteps: formData.get("nextSteps") ?? undefined,
      storyText: formData.get("storyText") ?? undefined,
      youtubeVideoTitle: formData.get("youtubeVideoTitle") ?? undefined,
      youtubeChannelId: formData.get("youtubeChannelId") ?? undefined,
    });
    const school = getSchoolDirectoryRecord(parsedText.schoolId);
    if (!school) {
      return NextResponse.json(
        { error: "Selected school profile was not found. Select a valid school before publishing." },
        { status: 400 },
      );
    }

    const storyParts: string[] = [];
    if (parsedText.storyTitle?.trim()) {
      storyParts.push(`Title: ${parsedText.storyTitle.trim()}`);
    }
    if (parsedText.baselineChallenge?.trim()) {
      storyParts.push(`Baseline challenge:\n${parsedText.baselineChallenge.trim()}`);
    }
    if (parsedText.whatHappened?.trim()) {
      storyParts.push(`What happened:\n${parsedText.whatHappened.trim()}`);
    }
    if (parsedText.measurableChange?.trim()) {
      storyParts.push(`Measurable change:\n${parsedText.measurableChange.trim()}`);
    }
    if (parsedText.nextSteps?.trim()) {
      storyParts.push(`Next steps:\n${parsedText.nextSteps.trim()}`);
    }
    if (parsedText.storyText?.trim()) {
      storyParts.push(`Story narrative:\n${parsedText.storyText.trim()}`);
    }

    const finalStoryText = storyParts.join("\n\n").trim();
    if (finalStoryText.length < 30) {
      return NextResponse.json(
        { error: "Change story content is too short. Add more detail before publishing." },
        { status: 400 },
      );
    }

    const video = formData.get("video");
    const uploadVideo = video instanceof File && video.size > 0 ? video : null;
    const normalizedYouTubeTitle = parsedText.youtubeVideoTitle?.trim() ?? "";
    const inferredTitle = normalizedYouTubeTitle || titleFromUploadedFile(uploadVideo);

    const photoField = formData.get("photo");
    const photo =
      photoField instanceof File && photoField.size > 0 ? photoField : null;
    validateOptionalPhoto(photo);

    let resolvedYouTube: ResolvedYouTubeVideo | null = null;
    if (inferredTitle) {
      try {
        resolvedYouTube = await resolveYouTubeVideoByTitle(
          inferredTitle,
          parsedText.youtubeChannelId,
        );
      } catch (error) {
        if (normalizedYouTubeTitle) {
          throw error;
        }
      }
    }

    let testimonialsDir: string | null = null;
    if (photo) {
      const monthSegment = new Date().toISOString().slice(0, 7);
      testimonialsDir = path.join(getRuntimeDataDir(), "testimonials", monthSegment);
      await fs.mkdir(testimonialsDir, { recursive: true });
    }

    const savedVideo = {
      fileName: uploadVideo?.name || resolvedYouTube?.title || "No video attached",
      storedPath: "",
      mimeType: resolvedYouTube ? "video/youtube" : "video/placeholder",
      sizeBytes: 0,
    };
    const savedPhoto = photo
      ? await persistUpload(photo, testimonialsDir as string, "testimonial-photo", "image")
      : null;

    const testimonial = savePortalTestimonial({
      storytellerName: parsedText.storytellerName,
      storytellerRole: parsedText.storytellerRole,
      schoolId: school.id,
      schoolName: school.name,
      district: school.district,
      storyText: finalStoryText,
      videoSourceType: resolvedYouTube ? "youtube" : "upload",
      videoFileName: savedVideo.fileName,
      videoStoredPath: savedVideo.storedPath,
      videoMimeType: savedVideo.mimeType,
      videoSizeBytes: savedVideo.sizeBytes,
      youtubeVideoId: resolvedYouTube?.videoId ?? null,
      youtubeVideoTitle: resolvedYouTube?.title ?? null,
      youtubeChannelTitle: resolvedYouTube?.channelTitle ?? null,
      youtubeThumbnailUrl: resolvedYouTube?.thumbnailUrl ?? null,
      youtubeEmbedUrl: resolvedYouTube?.embedUrl ?? null,
      youtubeWatchUrl: resolvedYouTube?.watchUrl ?? null,
      photoFileName: savedPhoto?.fileName ?? null,
      photoStoredPath: savedPhoto?.storedPath ?? null,
      photoMimeType: savedPhoto?.mimeType ?? null,
      photoSizeBytes: savedPhoto?.sizeBytes ?? null,
      createdByUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      testimonial: {
        ...testimonial,
        videoUrl:
          testimonial.videoSourceType === "youtube"
            ? testimonial.youtubeEmbedUrl ||
              testimonial.youtubeWatchUrl ||
              `/api/testimonials/${testimonial.id}/video`
            : `/api/testimonials/${testimonial.id}/video`,
        photoUrl: testimonial.photoFileName
          ? `/api/testimonials/${testimonial.id}/photo`
          : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid testimonial payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

const moderationSchema = z.object({
  testimonialId: z.coerce.number().int().positive(),
  moderationStatus: z.enum(["pending", "approved", "hidden"]),
});

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = moderationSchema.parse(await request.json());
    setPortalTestimonialModerationStatus({
      testimonialId: payload.testimonialId,
      moderationStatus: payload.moderationStatus,
      user,
    });

    const testimonial = listPortalTestimonials(user, 500).find(
      (item) => item.id === payload.testimonialId,
    );
    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      testimonial: {
        ...testimonial,
        videoUrl:
          testimonial.videoSourceType === "youtube"
            ? testimonial.youtubeEmbedUrl ||
              testimonial.youtubeWatchUrl ||
              `/api/testimonials/${testimonial.id}/video`
            : `/api/testimonials/${testimonial.id}/video`,
        photoUrl: testimonial.photoFileName ? `/api/testimonials/${testimonial.id}/photo` : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid moderation payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

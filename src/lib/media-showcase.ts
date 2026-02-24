import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { testimonials } from "@/lib/content";
import { listPublishedPortalTestimonials } from "@/lib/db";

export type MediaKind = "photo" | "video";

export interface MediaShowcaseItem {
  id: string;
  kind: MediaKind;
  url: string;
  alt: string;
  caption: string;
  quote: string;
  person: string;
  role: string;
  playback: "file" | "youtube";
  youtubeEmbedUrl: string | null;
  youtubeThumbnailUrl: string | null;
  youtubeVideoId: string | null;
}

export interface MediaShowcaseData {
  uniquePhotos: MediaShowcaseItem[];
  uniqueVideos: MediaShowcaseItem[];
  featuredItems: MediaShowcaseItem[];
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const fallbackStory = {
  quote:
    "Our teachers now deliver practical phonics routines with stronger learner participation.",
  name: "Ozeki Field Team",
  role: "Implementation Support",
};

function toTitleCase(value: string) {
  return value
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readMediaFiles(
  directory: string,
  allowedExtensions: Set<string>,
) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => allowedExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function isReadableFile(filePath: string | null | undefined) {
  if (!filePath) {
    return false;
  }

  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function createFileSignature(filePath: string | null | undefined) {
  if (!filePath) {
    return null;
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    return createHash("sha1").update(fileBuffer).digest("hex");
  } catch {
    return null;
  }
}

function getMappedStory(index: number) {
  if (testimonials.length === 0) {
    return fallbackStory;
  }
  return testimonials[index % testimonials.length];
}

function buildUniqueItems(
  kind: MediaKind,
  fileNames: string[],
  category: "photos" | "videos",
) {
  return fileNames.map((fileName, index) => {
    const mappedTestimonial = getMappedStory(index);
    const readableName = toTitleCase(fileName);
    const encodedFileName = encodeURIComponent(fileName);
    const cacheBust = encodeURIComponent(fileName);
    return {
      id: `${kind}-${fileName}-${index}`,
      kind,
      url: `/api/media/${category}/${encodedFileName}?v=${cacheBust}`,
      alt:
        kind === "photo"
          ? `Training photo: ${readableName}`
          : `Training video: ${readableName}`,
      caption:
        kind === "photo"
          ? `Field photo: ${readableName}`
          : `Field video testimony: ${readableName}`,
      quote: mappedTestimonial.quote,
      person: mappedTestimonial.name,
      role: mappedTestimonial.role,
      playback: "file",
      youtubeEmbedUrl: null,
      youtubeThumbnailUrl: null,
      youtubeVideoId: null,
    } satisfies MediaShowcaseItem;
  });
}

function buildFeaturedItems(
  photos: MediaShowcaseItem[],
  videos: MediaShowcaseItem[],
) {
  if (photos.length === 0 && videos.length === 0) {
    return [];
  }

  const items: MediaShowcaseItem[] = [];
  const maxItems = Math.max(photos.length, videos.length);

  for (let index = 0; index < maxItems; index += 1) {
    const photoItem = photos[index];
    const videoItem = videos[index];

    if (photoItem) {
      items.push({
        ...photoItem,
        id: `featured-photo-${index}-${photoItem.id}`,
      });
    }

    if (videoItem) {
      items.push({
        ...videoItem,
        id: `featured-video-${index}-${videoItem.id}`,
      });
    }
  }

  return items;
}

async function buildSubmittedItems() {
  const submissions = listPublishedPortalTestimonials(240);
  const photoItems: MediaShowcaseItem[] = [];
  const videoItems: MediaShowcaseItem[] = [];
  const photoSignatures = new Set<string>();
  const availability = await Promise.all(
    submissions.map(async (record) => ({
      id: record.id,
      hasPhoto: await isReadableFile(record.photoStoredPath),
      hasVideo: await isReadableFile(record.videoStoredPath),
      photoSignature: await createFileSignature(record.photoStoredPath),
    })),
  );
  const availabilityById = new Map(
    availability.map((item) => [item.id, item]),
  );

  submissions.forEach((record, index) => {
    const mediaAvailability = availabilityById.get(record.id);
    if (!mediaAvailability) {
      return;
    }

    const createdOn = new Date(record.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const caption = `${record.schoolName}, ${record.district} • ${createdOn}`;

    if (record.videoSourceType === "youtube" && record.youtubeEmbedUrl) {
      videoItems.push({
        id: `submitted-youtube-video-${record.id}`,
        kind: "video",
        url: record.youtubeEmbedUrl,
        alt: record.youtubeVideoTitle
          ? `Video testimonial: ${record.youtubeVideoTitle}`
          : `Video testimonial by ${record.storytellerName}`,
        caption,
        quote: record.storyText,
        person: record.storytellerName,
        role: record.storytellerRole,
        playback: "youtube",
        youtubeEmbedUrl: record.youtubeEmbedUrl,
        youtubeThumbnailUrl:
          record.youtubeThumbnailUrl ??
          (record.youtubeVideoId
            ? `https://img.youtube.com/vi/${record.youtubeVideoId}/hqdefault.jpg`
            : null),
        youtubeVideoId: record.youtubeVideoId,
      });
    }

    if (mediaAvailability.hasPhoto) {
      const signatureKey =
        mediaAvailability.photoSignature ??
        `submitted-photo:${String(record.photoStoredPath ?? record.photoFileName ?? record.id).toLowerCase()}`;
      if (photoSignatures.has(signatureKey)) {
        return;
      }
      photoSignatures.add(signatureKey);
      const cacheBust = encodeURIComponent(record.createdAt);
      photoItems.push({
        id: `submitted-photo-${record.id}-${index}`,
        kind: "photo",
        url: `/api/testimonials/${record.id}/photo?v=${cacheBust}`,
        alt: `Photo testimonial by ${record.storytellerName}`,
        caption,
        quote: record.storyText,
        person: record.storytellerName,
        role: record.storytellerRole,
        playback: "file",
        youtubeEmbedUrl: null,
        youtubeThumbnailUrl: null,
        youtubeVideoId: null,
      });
    }
  });

  return { photoItems, videoItems, photoSignatures };
}

export async function getMediaShowcase(): Promise<MediaShowcaseData> {
  const photoDirectory = path.join(process.cwd(), "assets", "photos");
  const photoFiles = await readMediaFiles(photoDirectory, imageExtensions);

  const submitted = await buildSubmittedItems();
  const seenPhotoSignatures = new Set(submitted.photoSignatures);

  const uniqueAssetPhotoFiles = (
    await Promise.all(
      photoFiles.map(async (fileName) => ({
        fileName,
        signature:
          (await createFileSignature(path.join(photoDirectory, fileName))) ??
          `asset-photo:${fileName.toLowerCase()}`,
      })),
    )
  )
    .filter((entry) => {
      if (seenPhotoSignatures.has(entry.signature)) {
        return false;
      }
      seenPhotoSignatures.add(entry.signature);
      return true;
    })
    .map((entry) => entry.fileName);

  const assetPhotos = buildUniqueItems("photo", uniqueAssetPhotoFiles, "photos");

  const uniquePhotos = [...submitted.photoItems, ...assetPhotos];
  const uniqueVideos = [...submitted.videoItems];

  return {
    uniquePhotos,
    uniqueVideos,
    featuredItems: buildFeaturedItems(uniquePhotos, uniqueVideos),
  };
}

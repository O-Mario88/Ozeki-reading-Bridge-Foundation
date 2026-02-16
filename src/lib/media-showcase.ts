import fs from "node:fs/promises";
import path from "node:path";
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
}

export interface MediaShowcaseData {
  uniquePhotos: MediaShowcaseItem[];
  uniqueVideos: MediaShowcaseItem[];
  featuredItems: MediaShowcaseItem[];
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const videoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);
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
  const availability = await Promise.all(
    submissions.map(async (record) => ({
      id: record.id,
      hasPhoto: await isReadableFile(record.photoStoredPath),
      hasVideo: await isReadableFile(record.videoStoredPath),
    })),
  );
  const availabilityById = new Map(availability.map((item) => [item.id, item]));

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

    if (mediaAvailability.hasVideo) {
      const cacheBust = encodeURIComponent(record.createdAt);
      videoItems.push({
        id: `submitted-video-${record.id}`,
        kind: "video",
        url: `/api/testimonials/${record.id}/video?v=${cacheBust}`,
        alt: `Video testimonial by ${record.storytellerName}`,
        caption,
        quote: record.storyText,
        person: record.storytellerName,
        role: record.storytellerRole,
      });
    }

    if (mediaAvailability.hasPhoto) {
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
      });
    }
  });

  return { photoItems, videoItems };
}

export async function getMediaShowcase(): Promise<MediaShowcaseData> {
  const photoDirectory = path.join(process.cwd(), "assets", "photos");
  const videoDirectory = path.join(process.cwd(), "assets", "videos");

  const [photoFiles, videoFiles] = await Promise.all([
    readMediaFiles(photoDirectory, imageExtensions),
    readMediaFiles(videoDirectory, videoExtensions),
  ]);

  const assetPhotos = buildUniqueItems("photo", photoFiles, "photos");
  const assetVideos = buildUniqueItems("video", videoFiles, "videos");
  const submitted = await buildSubmittedItems();

  const uniquePhotos = [...submitted.photoItems, ...assetPhotos];
  const uniqueVideos = [...submitted.videoItems, ...assetVideos];

  return {
    uniquePhotos,
    uniqueVideos,
    featuredItems: buildFeaturedItems(uniquePhotos, uniqueVideos),
  };
}

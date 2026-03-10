import {
  getPublishedPortalTestimonialById,
  listPublishedPortalTestimonials,
} from "@/lib/db";

type ChangeStorySource = ReturnType<typeof listPublishedPortalTestimonials>[number];

export type ChangeStorySummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  schoolName: string;
  district: string;
  storytellerName: string;
  storytellerRole: string;
  createdAt: string;
  photoUrl: string | null;
};

export type ChangeStoryDetail = ChangeStorySummary & {
  storyText: string;
  sections: Array<{ heading: string; body: string }>;
  videoUrl: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, maxChars: number) {
  const clean = compactWhitespace(value);
  if (clean.length <= maxChars) {
    return clean;
  }
  return `${clean.slice(0, maxChars).trimEnd()}...`;
}

function extractTitle(story: ChangeStorySource) {
  const match = story.storyText.match(/^Title:\s*(.+)$/im);
  if (match?.[1]) {
    return clip(match[1], 120);
  }
  return `Change story: ${story.schoolName}`;
}

function normalizeStoryText(raw: string) {
  return raw.replace(/\r/g, "").trim();
}

function parseSections(storyText: string) {
  const blocks = normalizeStoryText(storyText)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sections: Array<{ heading: string; body: string }> = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      continue;
    }

    const firstLine = lines[0];
    const inlineHeadingMatch = firstLine.match(/^([^:]{2,80}):\s*(.+)$/);
    if (inlineHeadingMatch) {
      const heading = inlineHeadingMatch[1].trim();
      if (heading.toLowerCase() !== "title") {
        const body = compactWhitespace(
          [inlineHeadingMatch[2], ...lines.slice(1)].join(" "),
        );
        if (body) {
          sections.push({ heading, body });
        }
      }
      continue;
    }

    if (firstLine.endsWith(":")) {
      const heading = firstLine.slice(0, -1).trim();
      const body = compactWhitespace(lines.slice(1).join(" "));
      if (heading && body) {
        sections.push({ heading, body });
      }
      continue;
    }

    sections.push({
      heading: sections.length === 0 ? "Change story" : "Details",
      body: compactWhitespace(lines.join(" ")),
    });
  }

  return sections;
}

function buildSlug(story: ChangeStorySource) {
  const seed = `${story.schoolName}-${story.district}-${story.storytellerName}`;
  return `${story.id}-${slugify(seed)}`;
}

function buildSummary(story: ChangeStorySource): ChangeStorySummary {
  return {
    id: story.id,
    slug: buildSlug(story),
    title: extractTitle(story),
    excerpt: clip(story.storyText.replace(/^Title:\s*.+$/im, ""), 210),
    schoolName: story.schoolName,
    district: story.district,
    storytellerName: story.storytellerName,
    storytellerRole: story.storytellerRole,
    createdAt: story.createdAt,
    photoUrl: story.photoFileName ? `/api/testimonials/${story.id}/photo` : null,
  };
}

export function listPublishedChangeStories(limit = 180): ChangeStorySummary[] {
  return listPublishedPortalTestimonials(limit)
    .filter((story) => story.sourceType === "manual")
    .map((story) => buildSummary(story));
}

export function getPublishedChangeStoryBySlug(slug: string): ChangeStoryDetail | null {
  const match = slug.match(/^(\d+)(?:-|$)/);
  const id = Number(match?.[1] ?? "");
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const story = getPublishedPortalTestimonialById(id);
  if (!story || story.sourceType !== "manual") {
    return null;
  }

  const summary = buildSummary(story);
  return {
    ...summary,
    storyText: normalizeStoryText(story.storyText),
    sections: parseSections(story.storyText),
    videoUrl:
      story.videoSourceType === "youtube"
        ? story.youtubeWatchUrl ?? story.youtubeEmbedUrl
        : null,
  };
}

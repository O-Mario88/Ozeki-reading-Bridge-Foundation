import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deletePortalBlogPostAsync,
  listPortalBlogPostsAsync,
  savePortalBlogPostAsync,
  setPortalBlogPublishStatusAsync,
} from "@/services/blogService";
import { getCurrentPortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalTextOrEmpty = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const sectionSchema = z.object({
  heading: z.string().trim().min(1).max(140),
  paragraphs: z.array(z.string().trim().min(1).max(50000)).min(1).max(80),
});

const bodyBlockSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.enum([
    "paragraph",
    "heading2",
    "heading3",
    "bullet_list",
    "numbered_list",
    "quote",
    "image",
    "callout",
    "stat",
    "divider",
    "cta_inline",
  ]),
  text: optionalText(50000).nullable().optional(),
  heading: optionalText(240).nullable().optional(),
  items: z.array(z.string().trim().min(1).max(500)).max(120).nullable().optional(),
  quoteAttribution: optionalText(240).nullable().optional(),
  imageUrl: optionalText(1000).nullable().optional(),
  imageAlt: optionalText(320).nullable().optional(),
  imageCaption: optionalText(500).nullable().optional(),
  imageCredit: optionalText(500).nullable().optional(),
  imageWidthStyle: z.enum(["full", "contained", "small"]).nullable().optional(),
  calloutTitle: optionalText(240).nullable().optional(),
  calloutTone: z
    .enum(["neutral", "info", "success", "warning", "critical"])
    .nullable()
    .optional(),
  statLabel: optionalText(180).nullable().optional(),
  statValue: optionalText(180).nullable().optional(),
  ctaLabel: optionalText(180).nullable().optional(),
  ctaUrl: optionalText(500).nullable().optional(),
  tocLabel: optionalText(240).nullable().optional(),
  hideFromToc: z.boolean().nullable().optional(),
});

const saveActionSchema = z
  .object({
    action: z.literal("save"),
    id: z.coerce.number().int().positive().optional(),
    slug: z.string().trim().max(140).optional(),
    title: z.string().trim().min(3).max(220),
    subtitle: optionalText(280),
    excerpt: z.string().trim().min(10).max(1500),
    category: z.string().trim().min(2).max(80),
    author: z.string().trim().min(2).max(120),
    role: z.string().trim().min(2).max(120),
    publishedAt: z.string().trim().optional(),
    readTime: z.string().trim().max(40).optional(),
    readTimeMinutes: z.coerce.number().int().min(1).max(200).optional().nullable(),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    sections: z.array(sectionSchema).max(80).optional(),
    bodyBlocks: z.array(bodyBlockSchema).max(500).optional(),
    mediaImageUrl: optionalTextOrEmpty(1000),
    mediaVideoUrl: optionalTextOrEmpty(1000),
    articleType: z
      .enum([
        "Blog Post",
        "Resource Article",
        "Thought Leadership",
        "Methodology Explainer",
        "Story Editorial",
        "Report Summary",
      ])
      .optional()
      .nullable(),
    featuredImageUrl: optionalTextOrEmpty(1000),
    featuredImageAlt: optionalTextOrEmpty(320),
    featuredImageCaption: optionalTextOrEmpty(500),
    featuredImageCredit: optionalTextOrEmpty(500),
    primaryCategory: optionalText(80).nullable().optional(),
    secondaryCategories: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    authorBio: optionalTextOrEmpty(1000),
    seoTitle: optionalTextOrEmpty(220),
    metaDescription: optionalTextOrEmpty(500),
    socialImageUrl: optionalTextOrEmpty(1000),
    canonicalUrl: optionalTextOrEmpty(1000),
    publishStatus: z.enum(["draft", "published"]).optional(),
  })
  .superRefine((payload, ctx) => {
    const hasSections = Array.isArray(payload.sections) && payload.sections.length > 0;
    const hasBlocks = Array.isArray(payload.bodyBlocks) && payload.bodyBlocks.length > 0;
    if (!hasSections && !hasBlocks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide article content in sections or body blocks.",
      });
    }
  });

const statusActionSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
  postId: z.coerce.number().int().positive(),
});

const deleteActionSchema = z.object({
  action: z.literal("delete"),
  postId: z.coerce.number().int().positive(),
});

function canManageBlog(user: NonNullable<Awaited<ReturnType<typeof getCurrentPortalUser>>>) {
  return user.role === "Staff" || user.role === "Admin" || user.isAdmin || user.isSuperAdmin;
}

export async function GET() {
  const user = await getCurrentPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageBlog(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ posts: await listPortalBlogPostsAsync(true) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageBlog(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String((body as { action?: unknown }).action ?? "");

    if (action === "save") {
      const payload = saveActionSchema.parse(body);
      const post = await savePortalBlogPostAsync(
        {
          id: payload.id,
          slug: payload.slug,
          title: payload.title,
          subtitle: payload.subtitle,
          excerpt: payload.excerpt,
          category: payload.category,
          author: payload.author,
          role: payload.role,
          publishedAt: payload.publishedAt,
          readTime: payload.readTime,
          readTimeMinutes: payload.readTimeMinutes ?? null,
          tags: payload.tags,
          sections: payload.sections,
          bodyBlocks: payload.bodyBlocks,
          mediaImageUrl: payload.mediaImageUrl || null,
          mediaVideoUrl: payload.mediaVideoUrl || null,
          articleType: payload.articleType ?? null,
          featuredImageUrl: payload.featuredImageUrl || null,
          featuredImageAlt: payload.featuredImageAlt || null,
          featuredImageCaption: payload.featuredImageCaption || null,
          featuredImageCredit: payload.featuredImageCredit || null,
          primaryCategory: payload.primaryCategory ?? null,
          secondaryCategories: payload.secondaryCategories,
          authorBio: payload.authorBio || null,
          seoTitle: payload.seoTitle || null,
          metaDescription: payload.metaDescription || null,
          socialImageUrl: payload.socialImageUrl || null,
          canonicalUrl: payload.canonicalUrl || null,
          publishStatus: payload.publishStatus,
        },
        user,
      );
      return NextResponse.json({ post });
    }

    if (action === "publish" || action === "unpublish") {
      const payload = statusActionSchema.parse(body);
      const post = await setPortalBlogPublishStatusAsync(
        payload.postId,
        payload.action === "publish" ? "published" : "draft",
        user,
      );
      return NextResponse.json({ post });
    }

    if (action === "delete") {
      const payload = deleteActionSchema.parse(body);
      await deletePortalBlogPostAsync(payload.postId, user);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid blog payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addBlogPostComment,
  getBlogPostEngagement,
  recordBlogPostView,
  toggleBlogPostLike,
} from "@/lib/blog-db";
import { getMergedPublishedBlogPostBySlug } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "orbf_blog_visitor";

const engagementActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("view"),
  }),
  z.object({
    action: z.literal("like"),
  }),
  z.object({
    action: z.literal("comment"),
    displayName: z.string().trim().max(80).optional(),
    commentText: z.string().trim().min(2).max(1800),
  }),
]);

function resolveSlug(rawSlug: string) {
  return rawSlug.trim().toLowerCase().slice(0, 140);
}

async function getOrCreateVisitorId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value?.trim();
  if (existing) {
    return { visitorId: existing, setCookie: false };
  }

  return {
    visitorId: crypto.randomUUID(),
    setCookie: true,
  };
}

function withVisitorCookie(
  response: NextResponse,
  visitorId: string,
  shouldSetCookie: boolean,
) {
  if (shouldSetCookie) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

function ensurePublishedPost(slug: string) {
  const post = getMergedPublishedBlogPostBySlug(slug);
  if (!post) {
    return null;
  }
  return post;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await context.params;
  const slug = resolveSlug(rawSlug);
  if (!ensurePublishedPost(slug)) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const { visitorId, setCookie } = await getOrCreateVisitorId();
  const engagement = getBlogPostEngagement(slug, visitorId);

  return withVisitorCookie(
    NextResponse.json({
      engagement,
    }),
    visitorId,
    setCookie,
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await context.params;
  const slug = resolveSlug(rawSlug);
  if (!ensurePublishedPost(slug)) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const { visitorId, setCookie } = await getOrCreateVisitorId();

  try {
    const payload = engagementActionSchema.parse(await request.json());

    if (payload.action === "view") {
      recordBlogPostView(slug, visitorId);
    } else if (payload.action === "like") {
      toggleBlogPostLike(slug, visitorId);
    } else if (payload.action === "comment") {
      addBlogPostComment({
        postSlug: slug,
        displayName: payload.displayName,
        commentText: payload.commentText,
        sessionId: visitorId,
      });
    }

    const engagement = getBlogPostEngagement(slug, visitorId);
    return withVisitorCookie(
      NextResponse.json({
        engagement,
      }),
      visitorId,
      setCookie,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid engagement payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

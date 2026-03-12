import { NextRequest, NextResponse } from "next/server";
import { getNewsletterIssueBySlug } from "@/lib/content-db";
import { buildNewsletterStandaloneHtml } from "@/lib/newsletter";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const issue = await getNewsletterIssueBySlug(slug);
  if (!issue || issue.status !== "published") {
    return new NextResponse("Newsletter issue not found.", { status: 404 });
  }

  const html = buildNewsletterStandaloneHtml(issue, {
    origin: request.nextUrl.origin,
    includeActions: true,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

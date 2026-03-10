import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createNewsletterIssue,
  getNewsletterDispatchSummary,
  getNewsletterIssueById,
  listNewsletterIssues,
  listNewsletterSubscriberEmails,
  listNewsletterSubscribers,
  markNewsletterIssueAutoSent,
  saveNewsletterDispatchLogs,
} from "@/lib/db";
import { sendNewsletterIssueInGroups } from "@/lib/newsletter";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const getSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

const postSchema = z.object({
  title: z.string().trim().min(3).max(220),
  preheader: z.string().trim().max(320).optional(),
  htmlContent: z.string().trim().min(1),
  plainText: z.string().trim().optional(),
  publish: z.boolean().default(true),
  autoSendEnabled: z.boolean().default(true),
  sendNow: z.boolean().optional(),
  slug: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = getSchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const issues = listNewsletterIssues({
      limit: parsed.limit ?? 120,
      status: parsed.status,
    }).map((issue) => ({
      ...issue,
      dispatchSummary: getNewsletterDispatchSummary(issue.id),
    }));

    return NextResponse.json({
      issues,
      subscribersCount: listNewsletterSubscribers(50000).length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid newsletter query." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = postSchema.parse(await request.json());
    const issue = createNewsletterIssue({
      title: parsed.title,
      preheader: parsed.preheader,
      htmlContent: parsed.htmlContent,
      plainText: parsed.plainText,
      slug: parsed.slug,
      status: parsed.publish ? "published" : "draft",
      autoSendEnabled: parsed.autoSendEnabled,
    });

    const shouldAutoSend =
      issue.status === "published" && issue.autoSendEnabled && (parsed.sendNow ?? true);

    let sendResult:
      | Awaited<ReturnType<typeof sendNewsletterIssueInGroups>>
      | null = null;

    if (shouldAutoSend) {
      const recipients = listNewsletterSubscriberEmails();
      sendResult = await sendNewsletterIssueInGroups({
        issue,
        recipients,
        origin: new URL(request.url).origin,
      });
      saveNewsletterDispatchLogs(issue.id, sendResult.logs);
      if (sendResult.sent > 0 || sendResult.totalRecipients === 0) {
        markNewsletterIssueAutoSent(issue.id);
      }
    }

    const refreshedIssue = getNewsletterIssueById(issue.id);
    return NextResponse.json({
      ok: true,
      issue: refreshedIssue ?? issue,
      sendResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid newsletter payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

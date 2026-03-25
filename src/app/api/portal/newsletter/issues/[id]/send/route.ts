import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getNewsletterIssueById,
  listNewsletterSubscriberEmails,
  markNewsletterIssueAutoSent,
  markNewsletterIssuePublished,
  saveNewsletterDispatchLogs,
} from "@/lib/content-db";
import { sendNewsletterIssueInGroups } from "@/lib/newsletter";
import { canReview, getAuthenticatedPortalUser } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  publishIfDraft: z.boolean().default(true),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: issueIdRaw } = await context.params;
    const issueId = Number(issueIdRaw);
    if (!Number.isInteger(issueId) || issueId <= 0) {
      return NextResponse.json({ error: "Invalid issue id." }, { status: 400 });
    }

    const parsed = schema.parse(await request.json().catch(() => ({})));

    let issue = await getNewsletterIssueById(issueId);
    if (!issue) {
      return NextResponse.json({ error: "Newsletter issue not found." }, { status: 404 });
    }

    if (issue.status !== "published") {
      if (!parsed.publishIfDraft) {
        return NextResponse.json(
          { error: "Issue is draft. Publish first or set publishIfDraft=true." },
          { status: 400 },
        );
      }
      issue = (await markNewsletterIssuePublished(issue.id)) ?? issue;
    }

    const recipients = await listNewsletterSubscriberEmails();
    const sendResult = await sendNewsletterIssueInGroups({
      issue,
      recipients,
      origin: new URL(request.url).origin,
    });

    await saveNewsletterDispatchLogs(issue.id, sendResult.logs);
    if (sendResult.sent > 0 || sendResult.totalRecipients === 0) {
      await markNewsletterIssueAutoSent(issue.id);
    }

    return NextResponse.json({
      ok: true,
      issueId: issue.id,
      sendResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid send payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listNewsletterSubscriberEmails,
  listPendingNewsletterAutoSendIssues,
  markNewsletterIssueAutoSent,
  saveNewsletterDispatchLogs,
} from "@/lib/db";
import { sendNewsletterIssueInGroups } from "@/lib/newsletter";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const schema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = schema.parse(await request.json().catch(() => ({})));
    const issues = listPendingNewsletterAutoSendIssues(parsed.limit);
    const recipients = listNewsletterSubscriberEmails();

    const results: Array<{
      issueId: number;
      slug: string;
      title: string;
      sendResult: Awaited<ReturnType<typeof sendNewsletterIssueInGroups>>;
    }> = [];

    for (const issue of issues) {
      const sendResult = await sendNewsletterIssueInGroups({
        issue,
        recipients,
        origin: new URL(request.url).origin,
      });
      saveNewsletterDispatchLogs(issue.id, sendResult.logs);
      if (sendResult.sent > 0 || sendResult.totalRecipients === 0) {
        markNewsletterIssueAutoSent(issue.id);
      }
      results.push({
        issueId: issue.id,
        slug: issue.slug,
        title: issue.title,
        sendResult,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid automation payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

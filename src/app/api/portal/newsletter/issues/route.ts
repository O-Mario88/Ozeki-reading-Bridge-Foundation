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
} from "@/lib/content-db";
import {
  buildNewsletterEditorialTemplateHtml,
  buildNewsletterEditorialTemplatePlainText,
} from "@/lib/newsletter-editorial-template";
import { sendNewsletterIssueInGroups } from "@/lib/newsletter";
import { canReview, getAuthenticatedPortalUser } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const getSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

const templateUpdateSchema = z.object({
  numberLabel: z.string().trim().max(12),
  title: z.string().trim().max(180),
  body: z.string().trim().max(4000),
  imageUrl: z.string().trim().max(1200).optional(),
  imageAlt: z.string().trim().max(220).optional(),
});

const templateSchema = z.object({
  issueNumber: z.string().trim().min(1).max(20),
  issueDate: z.string().trim().min(1).max(80),
  mainTitle: z.string().trim().min(3).max(180),
  tocItems: z.array(z.string().trim().max(140)).max(8),
  heroImageUrl: z.string().trim().max(1200).optional(),
  heroImageAlt: z.string().trim().max(220).optional(),
  mainStoryTitle: z.string().trim().min(3).max(220),
  mainStoryBodyLeft: z.string().trim().min(1).max(5000),
  mainStoryBodyRight: z.string().trim().min(1).max(5000),
  welcomeTitle: z.string().trim().min(2).max(180),
  welcomeBody: z.string().trim().min(1).max(5000),
  welcomeImageUrl: z.string().trim().max(1200).optional(),
  welcomeImageAlt: z.string().trim().max(220).optional(),
  insightTitle: z.string().trim().min(2).max(180),
  insightBodyLeft: z.string().trim().min(1).max(5000),
  insightBodyRight: z.string().trim().min(1).max(5000),
  insightImageUrl: z.string().trim().max(1200).optional(),
  insightImageAlt: z.string().trim().max(220).optional(),
  smallStoryTitle: z.string().trim().min(2).max(180),
  smallStoryBody: z.string().trim().min(1).max(4000),
  smallStoryImageUrl: z.string().trim().max(1200).optional(),
  smallStoryImageAlt: z.string().trim().max(220).optional(),
  updatesTitle: z.string().trim().min(2).max(200),
  updates: z.array(templateUpdateSchema).length(4),
  featureTitle: z.string().trim().min(2).max(180),
  featureBody: z.string().trim().min(1).max(5000),
  featureImageUrl: z.string().trim().max(1200).optional(),
  featureImageAlt: z.string().trim().max(220).optional(),
  perspectiveTitle: z.string().trim().min(2).max(180),
  perspectiveBody: z.string().trim().min(1).max(5000),
  perspectiveImageUrl: z.string().trim().max(1200).optional(),
  perspectiveImageAlt: z.string().trim().max(220).optional(),
  officeTitle: z.string().trim().min(2).max(180),
  officeBodyLeft: z.string().trim().min(1).max(5000),
  officeBodyRight: z.string().trim().min(1).max(5000),
  officeImageUrl: z.string().trim().max(1200).optional(),
  officeImageAlt: z.string().trim().max(220).optional(),
  contactHeading: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().min(3).max(220),
  contactWebsite: z.string().trim().min(3).max(220),
  contactLocation: z.string().trim().min(2).max(800),
  footerLeft: z.string().trim().min(2).max(200),
  footerRight: z.string().trim().min(1).max(80),
});

const postSchema = z.object({
  title: z.string().trim().min(3).max(220),
  preheader: z.string().trim().max(320).optional(),
  htmlContent: z.string().trim().optional(),
  plainText: z.string().trim().optional(),
  template: templateSchema.optional(),
  publish: z.boolean().default(true),
  autoSendEnabled: z.boolean().default(true),
  sendNow: z.boolean().optional(),
  slug: z.string().trim().max(120).optional(),
}).superRefine((value, ctx) => {
  if (!value.template && !value.htmlContent?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either template content or HTML content.",
      path: ["htmlContent"],
    });
  }
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

    const issues = await listNewsletterIssues({
      limit: parsed.limit ?? 120,
      status: parsed.status,
    });
    const issuesWithSummary = await Promise.all(issues.map(async (issue) => ({
      ...issue,
      dispatchSummary: await getNewsletterDispatchSummary(issue.id),
    })));

    return NextResponse.json({
      issues: issuesWithSummary,
      subscribersCount: (await listNewsletterSubscribers(50000)).length,
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
    const normalizedTemplate = parsed.template
      ? {
        ...parsed.template,
        heroImageUrl: parsed.template.heroImageUrl ?? "",
        heroImageAlt: parsed.template.heroImageAlt ?? "",
        welcomeImageUrl: parsed.template.welcomeImageUrl ?? "",
        welcomeImageAlt: parsed.template.welcomeImageAlt ?? "",
        insightImageUrl: parsed.template.insightImageUrl ?? "",
        insightImageAlt: parsed.template.insightImageAlt ?? "",
        smallStoryImageUrl: parsed.template.smallStoryImageUrl ?? "",
        smallStoryImageAlt: parsed.template.smallStoryImageAlt ?? "",
        featureImageUrl: parsed.template.featureImageUrl ?? "",
        featureImageAlt: parsed.template.featureImageAlt ?? "",
        perspectiveImageUrl: parsed.template.perspectiveImageUrl ?? "",
        perspectiveImageAlt: parsed.template.perspectiveImageAlt ?? "",
        officeImageUrl: parsed.template.officeImageUrl ?? "",
        officeImageAlt: parsed.template.officeImageAlt ?? "",
        updates: parsed.template.updates.map((item) => ({
          ...item,
          imageUrl: item.imageUrl ?? "",
          imageAlt: item.imageAlt ?? "",
        })),
      }
      : null;

    const generatedHtml = normalizedTemplate
      ? buildNewsletterEditorialTemplateHtml(normalizedTemplate)
      : parsed.htmlContent?.trim() || "";
    const generatedPlainText = normalizedTemplate
      ? buildNewsletterEditorialTemplatePlainText(normalizedTemplate)
      : parsed.plainText;

    const issue = await createNewsletterIssue({
      title: parsed.title,
      preheader: parsed.preheader,
      htmlContent: generatedHtml,
      plainText: generatedPlainText,
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
      const recipients = await listNewsletterSubscriberEmails();
      sendResult = await sendNewsletterIssueInGroups({
        issue,
        recipients,
        origin: new URL(request.url).origin,
      });
      await saveNewsletterDispatchLogs(issue.id, sendResult.logs);
      if (sendResult.sent > 0 || sendResult.totalRecipients === 0) {
        await markNewsletterIssueAutoSent(issue.id);
      }
    }

    const refreshedIssue = await getNewsletterIssueById(issue.id);
    await auditLog({
      actor: user,
      action: shouldAutoSend ? "send" : (parsed.publish ? "publish" : "create"),
      targetTable: "newsletter_issues",
      targetId: issue.id,
      after: { title: parsed.title, slug: parsed.slug, status: issue.status },
      detail: `${shouldAutoSend ? "Created + sent" : (parsed.publish ? "Published" : "Drafted")} newsletter "${parsed.title}"`,
      request,
    });
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

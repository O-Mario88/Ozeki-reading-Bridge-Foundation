import nodemailer from "nodemailer";
import type {
  NewsletterDispatchStatus,
  NewsletterDispatchWriteInput,
  NewsletterIssueRecord,
} from "@/lib/content-db";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function hasEditorialTemplateContent(html: string) {
  return /newsletter-template-editorial/i.test(html);
}

export function getNewsletterPublicUrl(issue: Pick<NewsletterIssueRecord, "slug">, origin: string) {
  const base = normalizeOrigin(origin);
  return `${base}/newsletter/${encodeURIComponent(issue.slug)}`;
}

export function getNewsletterPdfUrl(issue: Pick<NewsletterIssueRecord, "slug">, origin: string) {
  const base = normalizeOrigin(origin);
  return `${base}/api/newsletter/${encodeURIComponent(issue.slug)}/pdf`;
}

export function buildNewsletterPageFragment(
  issue: Pick<NewsletterIssueRecord, "title" | "preheader" | "htmlContent" | "publishedAt">,
) {
  const templateMode = hasEditorialTemplateContent(issue.htmlContent);
  return `
    <article class="newsletter-document${templateMode ? " newsletter-document-template" : ""}">
      ${templateMode
        ? ""
        : `
      <header class="newsletter-document-header">
        <p class="newsletter-kicker">Ozeki Reading Bridge Newsletter</p>
        <h1>${escapeHtml(issue.title)}</h1>
        ${issue.preheader ? `<p class="newsletter-preheader">${escapeHtml(issue.preheader)}</p>` : ""}
        ${issue.publishedAt ? `<p class="newsletter-date">Published: ${escapeHtml(issue.publishedAt.slice(0, 10))}</p>` : ""}
      </header>`}
      <section class="newsletter-content">${issue.htmlContent}</section>
    </article>
  `;
}

export function buildNewsletterStandaloneHtml(
  issue: Pick<NewsletterIssueRecord, "slug" | "title" | "preheader" | "htmlContent" | "publishedAt">,
  input: {
    origin: string;
    includeActions?: boolean;
  },
) {
  const origin = normalizeOrigin(input.origin);
  const issueUrl = getNewsletterPublicUrl(issue, origin);
  const pdfUrl = getNewsletterPdfUrl(issue, origin);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(issue.title)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; background: #f5f7fb; color: #0f172a; font-family: "Segoe UI", Roboto, Arial, sans-serif; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
    .newsletter-document { background: #fff; border: 1px solid #d8deea; border-radius: 14px; padding: 26px 24px; }
    .newsletter-document.newsletter-document-template { background: transparent; border: 0; border-radius: 0; padding: 0; }
    .newsletter-document-header h1 { margin: 0 0 10px; line-height: 1.15; font-size: clamp(1.65rem, 3vw, 2.2rem); color: #0d3330; }
    .newsletter-kicker { margin: 0 0 10px; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: #0f5c7b; }
    .newsletter-preheader { margin: 0 0 8px; color: #334155; font-size: 1rem; }
    .newsletter-date { margin: 0 0 14px; color: #64748b; font-size: 0.85rem; }
    .newsletter-content { color: #1e293b; line-height: 1.62; }
    .newsletter-content img { max-width: 100%; border-radius: 10px; height: auto; }
    .newsletter-content table { width: 100%; border-collapse: collapse; }
    .newsletter-content th, .newsletter-content td { border: 1px solid #d8deea; padding: 8px; text-align: left; }
    .actions { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; }
    .action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid #0d3330;
      background: #0d3330;
      color: #fff;
      text-decoration: none;
      padding: 10px 16px;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .action.secondary { background: #fff; color: #0d3330; }
  </style>
</head>
<body>
  <main class="wrap">
    ${buildNewsletterPageFragment(issue)}
    ${input.includeActions === false
      ? ""
      : `
    <div class="actions">
      <a class="action" href="${escapeHtml(issueUrl)}">Open Online</a>
      <a class="action secondary" href="${escapeHtml(pdfUrl)}">Download PDF</a>
    </div>`}
  </main>
</body>
</html>`;
}

export function buildNewsletterEmailHtml(
  issue: Pick<NewsletterIssueRecord, "slug" | "title" | "preheader" | "htmlContent" | "publishedAt">,
  origin: string,
) {
  const issueUrl = getNewsletterPublicUrl(issue, origin);
  const pdfUrl = getNewsletterPdfUrl(issue, origin);
  const preheader = issue.preheader?.trim() || "Latest literacy updates from Ozeki Reading Bridge Foundation.";
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <div style="background:#f5f7fb;padding:18px 8px;">
      <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d8deea;border-radius:12px;padding:20px;">
        <p style="margin:0 0 8px;color:#0f5c7b;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Ozeki Reading Bridge Newsletter</p>
        <h1 style="margin:0 0 10px;color:#0d3330;font-size:28px;line-height:1.2;">${escapeHtml(issue.title)}</h1>
        ${issue.preheader ? `<p style="margin:0 0 10px;color:#334155;font-size:16px;">${escapeHtml(issue.preheader)}</p>` : ""}
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Published ${escapeHtml((issue.publishedAt || new Date().toISOString()).slice(0, 10))}</p>
        <div style="color:#1e293b;line-height:1.6;font-size:15px;">${issue.htmlContent}</div>
        <div style="margin-top:18px;">
          <a href="${escapeHtml(issueUrl)}" style="display:inline-block;background:#0d3330;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">View Online</a>
          <a href="${escapeHtml(pdfUrl)}" style="display:inline-block;margin-left:8px;background:#fff;color:#0d3330;text-decoration:none;padding:10px 14px;border:1px solid #0d3330;border-radius:999px;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Download PDF</a>
        </div>
      </div>
    </div>
  `;
}

export function buildNewsletterEmailText(
  issue: Pick<NewsletterIssueRecord, "slug" | "title" | "preheader" | "plainText">,
  origin: string,
) {
  const issueUrl = getNewsletterPublicUrl(issue, origin);
  const pdfUrl = getNewsletterPdfUrl(issue, origin);
  return [
    issue.title,
    issue.preheader || "",
    "",
    issue.plainText || "",
    "",
    `View online: ${issueUrl}`,
    `Download PDF: ${pdfUrl}`,
  ]
    .join("\n")
    .trim();
}

type NewsletterMailerConfig = {
  host: string;
  user: string;
  pass: string;
  port: number;
  secure: boolean;
  from: string;
  subjectPrefix: string;
  batchSize: number;
};

function getNewsletterMailerConfig(): NewsletterMailerConfig {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const from =
    process.env.NEWSLETTER_EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.FINANCE_EMAIL_FROM?.trim() ||
    user;
  const subjectPrefix = process.env.NEWSLETTER_SUBJECT_PREFIX?.trim() || "";
  const batchSizeRaw = Number(process.env.NEWSLETTER_BATCH_SIZE ?? "75");
  const batchSize = Number.isFinite(batchSizeRaw)
    ? Math.min(Math.max(Math.trunc(batchSizeRaw), 1), 400)
    : 75;
  return {
    host,
    user,
    pass,
    port: Number.isFinite(port) ? port : 587,
    secure,
    from,
    subjectPrefix,
    batchSize,
  };
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

export type NewsletterSendSummary = {
  totalRecipients: number;
  batches: number;
  sent: number;
  failed: number;
  skipped: number;
  logs: NewsletterDispatchWriteInput[];
  status: NewsletterDispatchStatus;
  providerMessage: string;
};

export async function sendNewsletterIssueInGroups(input: {
  issue: Pick<
    NewsletterIssueRecord,
    "slug" | "title" | "preheader" | "htmlContent" | "plainText" | "publishedAt"
  >;
  recipients: string[];
  origin: string;
}): Promise<NewsletterSendSummary> {
  const normalizedRecipients = input.recipients
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, list) => email.length > 3 && list.indexOf(email) === index);

  if (normalizedRecipients.length === 0) {
    return {
      totalRecipients: 0,
      batches: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      logs: [],
      status: "skipped",
      providerMessage: "No newsletter subscribers to send to.",
    };
  }

  const config = getNewsletterMailerConfig();
  if (!config.host || !config.from) {
    return {
      totalRecipients: normalizedRecipients.length,
      batches: 0,
      sent: 0,
      failed: 0,
      skipped: normalizedRecipients.length,
      logs: normalizedRecipients.map((email) => ({
        recipientEmail: email,
        status: "skipped",
        providerMessage:
          "SMTP not configured. Set SMTP_HOST and NEWSLETTER_EMAIL_FROM (or SMTP_FROM).",
      })),
      status: "skipped",
      providerMessage:
        "SMTP not configured. Set SMTP_HOST and NEWSLETTER_EMAIL_FROM (or SMTP_FROM).",
    };
  }

  const subject = `${config.subjectPrefix}${input.issue.title}`.trim();
  const emailHtml = buildNewsletterEmailHtml(input.issue, input.origin);
  const emailText = buildNewsletterEmailText(input.issue, input.origin);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  });

  const batches = chunk(normalizedRecipients, config.batchSize);
  const logs: NewsletterDispatchWriteInput[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipientsBatch of batches) {
    try {
      const result = await transporter.sendMail({
        from: config.from,
        to: config.from,
        bcc: recipientsBatch.join(", "),
        subject,
        html: emailHtml,
        text: emailText,
      });
      recipientsBatch.forEach((recipientEmail) => {
        logs.push({
          recipientEmail,
          status: "sent",
          providerMessage: result.messageId || "Email sent.",
        });
      });
      sent += recipientsBatch.length;
    } catch (error) {
      const providerMessage =
        error instanceof Error ? error.message : "Email send failed for batch.";
      recipientsBatch.forEach((recipientEmail) => {
        logs.push({
          recipientEmail,
          status: "failed",
          providerMessage,
        });
      });
      failed += recipientsBatch.length;
    }
  }

  return {
    totalRecipients: normalizedRecipients.length,
    batches: batches.length,
    sent,
    failed,
    skipped: 0,
    logs,
    status: failed > 0 ? (sent > 0 ? "sent" : "failed") : "sent",
    providerMessage:
      failed > 0
        ? `Sent ${sent} email(s); ${failed} failed.`
        : `Sent ${sent} email(s) successfully.`,
  };
}

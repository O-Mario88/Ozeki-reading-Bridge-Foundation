import nodemailer from "nodemailer";

const DEFAULT_FINANCE_FROM_EMAIL = "accounts@ozekiread.org";
const DEFAULT_FINANCE_ALWAYS_CC = ["support@ozekiread.org", "amos@ozekiread.org"] as const;

export type FinanceEmailAttachment = {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
};

export type FinanceEmailSendInput = {
  from?: string;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: FinanceEmailAttachment[];
};

export type FinanceEmailSendResult = {
  status: "sent" | "failed" | "skipped";
  providerMessage: string;
};

function splitCsvEnv(value: string | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeEmailList(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)),
    ),
  );
}

export function getDefaultFinanceFromEmail(config?: {
  financeEmailFrom?: string;
  financeAccountantEmail?: string;
  smtpFrom?: string;
}) {
  return (
    config?.financeEmailFrom?.trim() ||
    process.env.FINANCE_EMAIL_FROM?.trim() ||
    config?.financeAccountantEmail?.trim() ||
    process.env.FINANCE_ACCOUNTANT_EMAIL?.trim() ||
    config?.smtpFrom?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    DEFAULT_FINANCE_FROM_EMAIL
  );
}

export function resolveFinanceFromEmail(candidate?: string | null, fallback = getDefaultFinanceFromEmail()) {
  const normalized = normalizeEmailList([candidate ?? ""])[0];
  return normalized || fallback;
}

export function getRequiredFinanceCcEmails(configuredCsv = process.env.FINANCE_EMAIL_ALWAYS_CC) {
  const configured = splitCsvEnv(configuredCsv);
  const fallback = configured.length > 0 ? configured : [...DEFAULT_FINANCE_ALWAYS_CC];
  return normalizeEmailList(fallback);
}

export function buildFinanceCcListFromGroups(
  groups: Array<string[] | undefined>,
  requiredEmails = getRequiredFinanceCcEmails(),
) {
  return normalizeEmailList([...groups.flatMap((group) => group || []), ...requiredEmails]);
}

export function buildFinanceCcList(...groups: Array<string[] | undefined>) {
  return buildFinanceCcListFromGroups(groups);
}

function getMailerConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const from = getDefaultFinanceFromEmail() || user;

  return {
    host,
    user,
    pass,
    port: Number.isFinite(port) ? port : 587,
    secure,
    from,
  };
}

export async function sendFinanceMail(input: FinanceEmailSendInput): Promise<FinanceEmailSendResult> {
  const config = getMailerConfig();
  if (!config.host || !config.from) {
    return {
      status: "skipped",
      providerMessage: "SMTP not configured. Set SMTP_HOST and FINANCE_EMAIL_FROM (or SMTP_FROM).",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });

    const result = await transporter.sendMail({
      from: resolveFinanceFromEmail(input.from || config.from),
      to: input.to.join(", "),
      cc: input.cc && input.cc.length > 0 ? input.cc.join(", ") : undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });

    return {
      status: "sent",
      providerMessage: result.messageId || "Email sent.",
    };
  } catch (error) {
    return {
      status: "failed",
      providerMessage: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

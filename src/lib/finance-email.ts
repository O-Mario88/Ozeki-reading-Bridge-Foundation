import nodemailer from "nodemailer";

export type FinanceEmailAttachment = {
  filename: string;
  path: string;
  contentType?: string;
};

export type FinanceEmailSendInput = {
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

function getMailerConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const from = process.env.FINANCE_EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || user;

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
      from: config.from,
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


import nodemailer from "nodemailer";

export type MagicLinkEmailInput = {
  fullName: string;
  loginUrl: string;
  roleLabel: string;
  expiresInMinutes: number;
};

export type MagicLinkEmailResult = {
  status: "sent" | "failed" | "skipped";
  providerMessage: string;
};

function getMailerConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const from =
    process.env.SMTP_FROM?.trim()
    || process.env.FINANCE_EMAIL_FROM?.trim()
    || user
    || "noreply@ozekiread.org";
  return { host, user, pass, port: Number.isFinite(port) ? port : 587, secure, from };
}

function buildHtml(input: MagicLinkEmailInput): string {
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f0f4f8;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#066a67 0%,#054d4a 100%);padding:32px 32px;color:#fff;">
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;">Ozeki Reading Bridge · ${input.roleLabel} Portal</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">Sign in link, ${input.fullName}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1f2937;">Click the button below to sign in to your ${input.roleLabel.toLowerCase()} portal. This link expires in ${input.expiresInMinutes} minutes and can only be used once.</p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${input.loginUrl}" style="background:#066a67;color:#fff;padding:14px 32px;border-radius:12px;font-weight:700;text-decoration:none;display:inline-block;">Sign in to portal</a>
          </p>
          <p style="margin:0;font-size:12px;color:#6b7280;">If the button doesn't work, paste this URL into your browser:<br/><code style="word-break:break-all;color:#374151;">${input.loginUrl}</code></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;">
          If you didn't request this, you can safely ignore this email — the link will expire automatically.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
}

export async function sendMagicLinkEmail(
  to: string,
  input: MagicLinkEmailInput,
): Promise<MagicLinkEmailResult> {
  const config = getMailerConfig();
  if (!config.host) {
    return {
      status: "skipped",
      providerMessage:
        "SMTP not configured. Magic link logged to server but not delivered (set SMTP_HOST to enable).",
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
      to,
      subject: `Sign in to your Ozeki Reading Bridge ${input.roleLabel} portal`,
      html: buildHtml(input),
    });
    return { status: "sent", providerMessage: result.messageId || "Magic-link email sent." };
  } catch (error) {
    return {
      status: "failed",
      providerMessage: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

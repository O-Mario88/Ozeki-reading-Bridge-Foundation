import nodemailer from "nodemailer";

export type OnboardingEmailInput = {
  fullName: string;
  temporaryPassword: string;
  loginUrl: string;
  role: string;
};

export type OnboardingEmailResult = {
  status: "sent" | "failed" | "skipped";
  providerMessage: string;
};

function getMailerConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const from = process.env.SMTP_FROM?.trim() || process.env.FINANCE_EMAIL_FROM?.trim() || user || "noreply@ozekiread.org";

  return { host, user, pass, port: Number.isFinite(port) ? port : 587, secure, from };
}

function buildInviteHtml(input: OnboardingEmailInput): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d5f8a);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to ORBF Portal</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Ozeki Reading Bridge Foundation</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hello <strong>${input.fullName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
            You have been invited to join the ORBF Portal as <strong>${input.role}</strong>.
            Use the credentials below to sign in for the first time.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;border-radius:8px;padding:20px;margin:0 0 24px;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.05em;">Temporary Password</p>
              <p style="margin:0;font-size:18px;font-weight:600;color:#1e3a5f;font-family:monospace;letter-spacing:.05em;">${input.temporaryPassword}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${input.loginUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
              Sign In to Portal
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5;">
            You will be asked to change your password upon first sign-in. If you did not expect this invitation, please ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">&copy; ORBF Portal &bull; ozekiread.org</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function sendOnboardingInviteEmail(
  to: string,
  input: OnboardingEmailInput,
): Promise<OnboardingEmailResult> {
  const config = getMailerConfig();

  if (!config.host) {
    return {
      status: "skipped",
      providerMessage: "SMTP not configured. Set SMTP_HOST to enable invitation emails.",
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
      subject: `Welcome to ORBF Portal — Your Account is Ready`,
      html: buildInviteHtml(input),
    });

    return {
      status: "sent",
      providerMessage: result.messageId || "Invitation email sent.",
    };
  } catch (error) {
    return {
      status: "failed",
      providerMessage: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

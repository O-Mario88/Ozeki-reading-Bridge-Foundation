import nodemailer from "nodemailer";

export type MfaEmailInput = {
  fullName: string;
  otpCode: string;
};

export type MfaEmailResult = {
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

function buildMfaHtml(input: MfaEmailInput): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#c62828,#b71c1c);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Security Verification Code</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Ozeki Reading Bridge Foundation</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hello <strong>${input.fullName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
            A sign-in attempt requires further verification because you hold a privileged role. Please use the following One-Time Password (OTP) to complete your secure login.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;border-radius:8px;padding:20px;margin:0 0 24px;text-align:center;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.05em;">Your Verification Code</p>
              <p style="margin:0;font-size:32px;font-weight:700;color:#c62828;font-family:monospace;letter-spacing:.1em;">${input.otpCode}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5;">
            This code will expire in 15 minutes. If you did not request this, please change your password immediately.
          </p>
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">&copy; ORBF Security Notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function sendMfaEmail(
  to: string,
  input: MfaEmailInput,
): Promise<MfaEmailResult> {
  const config = getMailerConfig();

  if (!config.host) {
    console.warn("SMTP not configured. MFA code:", input.otpCode);
    return {
      status: "skipped",
      providerMessage: "SMTP not configured.",
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
      subject: `ORBF Security: Your Verification Code is ${input.otpCode}`,
      html: buildMfaHtml(input),
    });

    return {
      status: "sent",
      providerMessage: result.messageId || "MFA email sent.",
    };
  } catch (error) {
    return {
      status: "failed",
      providerMessage: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

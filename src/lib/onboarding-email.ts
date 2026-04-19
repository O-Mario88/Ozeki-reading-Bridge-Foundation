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
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ORBF Portal</title>
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .header { padding: 32px 20px !important; }
      .content { padding: 32px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(30, 58, 95, 0.08); overflow: hidden; margin: 0 auto;">
          <!-- Header with Brand Gradient -->
          <tr>
            <td class="header" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%); padding: 48px 40px; text-align: center;">
              <div style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; opacity: 0.9;">Ozeki Reading Bridge Foundation</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">Welcome to the Portal</h1>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td class="content" style="padding: 48px 40px; background-color: #ffffff;">
              <p style="margin: 0 0 16px; font-size: 18px; color: #1e3a5f; font-weight: 700;">Hello ${input.fullName},</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                You have been granted access to the <strong>Ozeki Reading Bridge Portal</strong> with the role of <span style="color: #1e3a5f; font-weight: 600;">${input.role}</span>. Our platform is designed to streamline literacy reporting, financial transparency, and impact intelligence across Uganda.
              </p>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <div style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Your Temporary Password</div>
                    <div style="font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 20px; font-weight: 700; color: #1e3a5f; letter-spacing: 0.05em;">${input.temporaryPassword}</div>
                    <div style="margin-top: 12px; font-size: 13px; color: #94a3b8; font-style: italic;">For security, you will be prompted to change this upon your first sign-in.</div>
                  </td>
                </tr>
              </table>
              
              <!-- Call to Action -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${input.loginUrl}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-size: 16px; font-weight: 700; transition: background-color 0.2s ease; box-shadow: 0 4px 6px rgba(30, 58, 95, 0.15);">
                      Access Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b; line-height: 1.5;">
                If you have any questions or did not expect this invitation, please reach out to our administration team or visit <a href="https://ozekiread.org" style="color: #1e3a5f; text-decoration: none; font-weight: 600;">ozekiread.org</a>.
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #eff4f9;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">&copy; ${new Date().getFullYear()} Ozeki Reading Bridge Foundation &bull; Uganda</p>
              <div style="margin-top: 12px; font-size: 12px; color: #cbd5e1;">Providing the foundation for every child to read and succeed.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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

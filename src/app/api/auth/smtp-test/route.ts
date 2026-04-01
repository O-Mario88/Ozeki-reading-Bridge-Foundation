import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// Temporary diagnostic endpoint — remove after verifying SMTP works
export async function GET() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ? "***SET***" : "***MISSING***";
  const port = process.env.SMTP_PORT ?? "not set";
  const secure = process.env.SMTP_SECURE ?? "not set";
  const from = process.env.SMTP_FROM?.trim() ?? "not set";
  const bypass = process.env.BYPASS_MFA ?? "not set";

  // Try a real send
  let sendResult = "not attempted";
  if (host && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? "587"),
        secure: String(secure).toLowerCase() === "true",
        auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
      });
      const result = await transporter.sendMail({
        from: from || user,
        to: "support@ozekiread.org",
        subject: "ORBF Production SMTP Test",
        html: "<h2>Production SMTP is working!</h2><p>Sent at: " + new Date().toISOString() + "</p>",
      });
      sendResult = `SUCCESS: ${result.messageId}`;
    } catch (error) {
      sendResult = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return NextResponse.json({
    smtp: { host, user, pass, port, secure, from },
    bypassMfa: bypass,
    nodeEnv: process.env.NODE_ENV,
    sendResult,
  });
}

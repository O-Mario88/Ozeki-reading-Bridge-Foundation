import nodemailer from "nodemailer";

async function verifySMTP() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";

  console.log("SMTP Config:", { 
    host, 
    user: user ? "***" : "none", 
    pass: pass ? "***" : "none", 
    port, 
    secure 
  });

  if (!host) {
    console.error("No SMTP_HOST set in environment");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    logger: true,
    debug: true
  });

  try {
    const ok = await transporter.verify();
    console.log("SMTP verification OK:", ok);
  } catch (err) {
    console.error("SMTP verification FAILED:");
    console.error(err);
  }
}

verifySMTP().catch(console.error);

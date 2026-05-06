import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  authenticatePortalUserPostgres as authenticatePortalUser, 
  createPortalSessionPostgres as createPortalSession,
  getRecentFailedLoginAttemptsPostgres,
  recordLoginAttemptPostgres,
  generateMfaOtpPostgres
} from "@/lib/server/postgres/repositories/auth";
import { logAuditEventPostgres } from "@/lib/server/postgres/repositories/audit";
import { getPortalHomePath, PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { sendMfaEmail } from "@/lib/mfa-email";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const loginIdentifier = payload.identifier.trim().toLowerCase();
    
    // 1. IP+Identifier memory-fast rate limit
    const rateLimitKey = `portal-login:${ipAddress}:${loginIdentifier}`;
    const rateLimit = consumeRateLimit(rateLimitKey, { maxRequests: 8, windowMs: 15 * 60 * 1000 });
    if (!rateLimit.allowed) {
      // Don't echo the bucket size in the body — it tells attackers the
      // shape of the limiter. The standard `Retry-After` header gives
      // legitimate clients what they need.
      return NextResponse.json(
        { error: "Too many login attempts. Please wait." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterSeconds)) } },
      );
    }

    // 2. Strict Database Brute-Force limit
    const dbFailures = await getRecentFailedLoginAttemptsPostgres(loginIdentifier, 15);
    if (dbFailures >= 5) {
      return NextResponse.json({ error: "Account temporarily locked due to repeated failed attempts. Please wait 15 minutes." }, { status: 429 });
    }

    // 3. Authenticate
    const user = await authenticatePortalUser(payload.identifier, payload.password);

    if (!user) {
      await recordLoginAttemptPostgres(loginIdentifier, ipAddress, false);
      try {
        await logAuditEventPostgres(0, loginIdentifier, "LOGIN_FAILED", "portal_users", null, null, null, "Invalid credentials", ipAddress);
      } catch (_e) { /* ignore */ }
      return NextResponse.json({ error: "Invalid email/phone or password.", remaining: rateLimit.remaining }, { status: 401 });
    }

    await recordLoginAttemptPostgres(loginIdentifier, ipAddress, true);

    // 4. MFA Trigger for Privileged Users
    //
    // MFA is gated by SMTP availability — without an outbound mail channel
    // we cannot deliver the OTP, and returning a hard 500 would lock every
    // privileged user out of a fresh deploy where SMTP hasn't been wired up
    // yet. Three bypass paths, in priority order:
    //   1. NODE_ENV=development + BYPASS_MFA=true — explicit dev bypass
    //   2. BYPASS_MFA=true in any environment — explicit operator override
    //      (documented in secret-rotation.md as a temporary first-login lever)
    //   3. SMTP_HOST not configured — graceful auto-degrade. Logs a warning
    //      so the operator can see MFA is silently disabled until SMTP is
    //      provisioned, but lets the login complete instead of failing.
    const isPrivileged = user.isSuperAdmin || user.isAdmin || user.isME || user.isSupervisor;
    const explicitBypass = process.env.BYPASS_MFA === "true";
    const smtpConfigured = Boolean(process.env.SMTP_HOST?.trim());
    const bypassMfa = explicitBypass || !smtpConfigured;
    if (bypassMfa && isPrivileged) {
      logger.warn("[login] MFA bypassed", {
        reason: explicitBypass ? "BYPASS_MFA=true" : "SMTP_HOST not configured",
        userId: user.id,
        env: process.env.NODE_ENV,
      });
    }

    if (isPrivileged && !bypassMfa) {
      const mfaCode = await generateMfaOtpPostgres(user.id);
      logger.info("[login] MFA challenge dispatched", { userId: user.id, smtp: process.env.SMTP_HOST });
      const emailResult = await sendMfaEmail(user.email, { fullName: user.fullName, otpCode: mfaCode });
      logger.debug("[login] MFA email result", { status: emailResult.status, message: emailResult.providerMessage });
      const isDev = process.env.NODE_ENV === "development";

      if (emailResult.status === "failed") {
        logger.error("[login] MFA email failed", { message: emailResult.providerMessage });
        if (!isDev) {
          return NextResponse.json({ error: "Failed to dispatch verification email. Please verify SMTP configuration." }, { status: 500 });
        }
      }

      try {
        await logAuditEventPostgres(user.id, user.fullName, "LOGIN_MFA_CHALLENGE", "portal_users", String(user.id), null, null, `MFA code generated and dispatched (Status: ${emailResult.status})`, ipAddress);
      } catch (_e) { /* ignore */ }

      if (emailResult.status === "skipped" || (emailResult.status === "failed" && isDev)) {
        logger.warn("[login] SMTP skipped or failed in dev", { devOtp: mfaCode });
      }

      return NextResponse.json({
        ok: true,
        requiresMfa: true,
        userId: user.id, // Send back temporary reference to continue MFA flow
        devOtp: isDev ? mfaCode : undefined
      });
    }

    // 5. Standard Direct Session Creation
    const session = await createPortalSession(user.id);
    
    try {
      await logAuditEventPostgres(user.id, user.fullName, "LOGIN_SUCCESS", "portal_sessions", session.token.substring(0, 8), null, null, "Standard login passed", ipAddress);
    } catch (_e) { /* ignore */ }
    clearRateLimit(rateLimitKey);
    const redirectTo = user.mustChangePassword ? "/portal/change-password" : getPortalHomePath(user);
    const response = NextResponse.json({
      ok: true,
      redirectTo,
      user: { fullName: user.fullName, role: user.role, mustChangePassword: user.mustChangePassword },
    });

    response.cookies.set({
      name: PORTAL_SESSION_COOKIE,
      value: session.token,
      maxAge: session.maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid sign-in payload." },
        { status: 400 },
      );
    }

    logger.error("[login] Unhandled error", { error: String(error) });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

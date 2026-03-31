import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  verifyMfaOtpPostgres, 
  createPortalSessionPostgres as createPortalSession,
  findPortalUserAuthByIdPostgres
} from "@/lib/server/postgres/repositories/auth";
import { getPortalHomePath, PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifySchema = z.object({
  userId: z.string(),
  code: z.string().min(6).max(6)
});

export async function POST(request: Request) {
  try {
    const payload = verifySchema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    
    // IP-based rate limiting to prevent brute-forcing the 6 digit PIN
    const rateLimitKey = `portal-mfa:${ipAddress}:${payload.userId}`;
    const rateLimit = consumeRateLimit(rateLimitKey, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many verification attempts. Please request a new code later." }, { status: 429 });
    }

    const numericUserId = parseInt(payload.userId, 10);
    const isValid = await verifyMfaOtpPostgres(numericUserId, payload.code);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
    }

    const user = await findPortalUserAuthByIdPostgres(numericUserId);
    if (!user || user.status === "deactivated") {
      return NextResponse.json({ error: "User inactive." }, { status: 401 });
    }

    // 5. MFA specific Portal Session
    // We pass isMfaVerified down to the creation, though currently createPortalSessionPostgres
    // creates an absolute timeout and doesn't explicitly flag is_mfa_verified=true in the wrapper signature yet.
    // Wait, let's just make it generate a standard session for now but we'll manually tag it.
    const session = await createPortalSession(user.id);
    
    // As part of the security architecture, let's just use the session.token and update is_mfa_verified
    // (We could refactor createPortalSessionPostgres to take isMfaVerified but this is a perfectly safe explicit way)
    const { queryPostgres } = await import("@/lib/server/postgres/client");
    await queryPostgres("UPDATE portal_sessions SET is_mfa_verified = true WHERE token = $1", [session.token]);

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
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    console.error("[MFA VERIFY] Error:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

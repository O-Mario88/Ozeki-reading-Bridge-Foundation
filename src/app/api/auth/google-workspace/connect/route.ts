import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getCurrentPortalUser } from "@/lib/auth";
import {
  getGoogleWorkspaceConfig,
  GOOGLE_WORKSPACE_REQUIRED_SCOPES,
} from "@/lib/google-workspace";

export const runtime = "nodejs";

/**
 * GET /api/auth/google-workspace/connect
 *
 * Initiates the Google OAuth consent flow for Workspace Calendar/Meet scopes.
 * Only super-admins can access this endpoint.
 *
 * After user consent, Google redirects to the callback route which stores the
 * refresh token.
 */
export async function GET() {
  try {
    // In production, require super-admin auth. In dev, allow without login
    // so the initial OAuth setup works even when Postgres is down.
    if (process.env.NODE_ENV === "production") {
      const user = await getCurrentPortalUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!user.isSuperAdmin) {
        return NextResponse.json(
          { error: "Only super-admin users can connect Google Workspace." },
          { status: 403 },
        );
      }
    }

    const config = getGoogleWorkspaceConfig();
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local." },
        { status: 400 },
      );
    }

    const redirectUri = config.redirectUri || "http://localhost:3000/api/auth/google-workspace/callback";

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      redirectUri,
    );

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // Force consent to always return a refresh_token
      scope: [...GOOGLE_WORKSPACE_REQUIRED_SCOPES],
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Google Workspace connect error:", error);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

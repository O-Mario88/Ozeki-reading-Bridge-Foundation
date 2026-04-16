import { NextResponse } from "next/server";
import { google } from "googleapis";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { getCurrentPortalUser } from "@/lib/auth";
import { getGoogleWorkspaceConfig } from "@/lib/google-workspace";

export const runtime = "nodejs";

/**
 * GET /api/auth/google-workspace/callback
 *
 * Handles the OAuth callback from Google after the user has granted consent.
 * Exchanges the authorization code for tokens, extracts the refresh_token,
 * and writes it to .env.local.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/portal/settings?google_error=consent_denied", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/portal/settings?google_error=no_code", request.url),
    );
  }

  // In production, require super-admin auth. In dev, allow without login.
  if (process.env.NODE_ENV === "production") {
    try {
      const user = await getCurrentPortalUser();
      if (!user?.isSuperAdmin) {
        return NextResponse.redirect(
          new URL("/portal/settings?google_error=forbidden", request.url),
        );
      }
    } catch {
      return NextResponse.redirect(
        new URL("/portal/settings?google_error=unauthorized", request.url),
      );
    }
  }

  const config = getGoogleWorkspaceConfig();
  const redirectUri =
    config.redirectUri || "http://localhost:3000/api/auth/google-workspace/callback";

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    redirectUri,
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn(
        "Google OAuth returned tokens but no refresh_token. " +
        "This usually means the user already granted consent previously. " +
        "Revoke access at https://myaccount.google.com/permissions and retry.",
      );
      return NextResponse.redirect(
        new URL(
          "/portal/settings?google_error=no_refresh_token",
          request.url,
        ),
      );
    }

    // Write the refresh token to .env.local
    const envPath = join(process.cwd(), ".env.local");
    try {
      // Read current file content
      const { readFileSync, writeFileSync } = await import("node:fs");
      let envContent = readFileSync(envPath, "utf-8");

      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        // Replace existing line (handles both empty and populated values)
        envContent = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`,
        );
        writeFileSync(envPath, envContent, "utf-8");
      } else {
        // Append the token
        appendFileSync(
          envPath,
          `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`,
          "utf-8",
        );
      }

      console.log("✅ GOOGLE_REFRESH_TOKEN written to .env.local");
    } catch (fsError) {
      console.error("Could not write .env.local:", fsError);
      // Even if file write fails, show the token on the redirect
      return NextResponse.redirect(
        new URL(
          `/portal/settings?google_success=true&manual_token=${encodeURIComponent(tokens.refresh_token)}`,
          request.url,
        ),
      );
    }

    // Set the token in the current process so it works immediately
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;

    return NextResponse.redirect(
      new URL("/portal/settings?google_success=true", request.url),
    );
  } catch (tokenError) {
    console.error("Google token exchange failed:", tokenError);
    return NextResponse.redirect(
      new URL("/portal/settings?google_error=token_exchange_failed", request.url),
    );
  }
}

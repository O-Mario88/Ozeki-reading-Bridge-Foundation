import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_OAUTH_STATE_COOKIE = "orbf_google_oauth_state";

function getOAuthClientId() {
  return process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
}

function getOAuthRedirectUri(origin: string) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${origin}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  const clientId = getOAuthClientId();
  if (!clientId) {
    const url = new URL("/portal/login", request.url);
    url.searchParams.set("error", "Google sign-in is not configured.");
    return NextResponse.redirect(url);
  }

  const state = crypto.randomBytes(24).toString("hex");

  const origin = new URL(request.url).origin;
  const redirectUri = getOAuthRedirectUri(origin);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
}

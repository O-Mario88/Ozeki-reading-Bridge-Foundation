import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPortalSession, getPortalUserByEmail } from "@/lib/db";
import { getPortalHomePath, PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export const runtime = "nodejs";

const GOOGLE_OAUTH_STATE_COOKIE = "orbf_google_oauth_state";

function getOAuthClientId() {
  return process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
}

function getOAuthClientSecret() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
}

function getOAuthRedirectUri(origin: string) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${origin}/api/auth/google/callback`;
}

function redirectWithError(requestUrl: string, error: string) {
  const url = new URL("/portal/login", requestUrl);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError) {
    return redirectWithError(request.url, "Google sign-in was cancelled.");
  }
  if (!code || !state) {
    return redirectWithError(request.url, "Google sign-in failed.");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!storedState || storedState !== state) {
    return redirectWithError(request.url, "Google sign-in state was invalid.");
  }

  const clientId = getOAuthClientId();
  const clientSecret = getOAuthClientSecret();
  if (!clientId || !clientSecret) {
    return redirectWithError(request.url, "Google sign-in is not configured.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getOAuthRedirectUri(requestUrl.origin),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return redirectWithError(request.url, "Could not verify Google sign-in.");
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    return redirectWithError(request.url, "Could not read Google account profile.");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    return redirectWithError(request.url, "Could not read Google account profile.");
  }

  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
  };
  const email = profile.email?.trim().toLowerCase();

  if (!email || profile.email_verified === false) {
    return redirectWithError(request.url, "Google account email is not verified.");
  }

  const user = getPortalUserByEmail(email);
  if (!user) {
    return redirectWithError(
      request.url,
      "No portal access for this Google account. Contact super admin.",
    );
  }

  const session = createPortalSession(user.id);
  const response = NextResponse.redirect(new URL(getPortalHomePath(user), request.url));
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

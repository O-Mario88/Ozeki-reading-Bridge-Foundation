import { NextResponse } from "next/server";

export const GOOGLE_OAUTH_STATE_COOKIE = "orbf_google_oauth_state";

export function getOAuthClientId() {
    return process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
}

export function getOAuthClientSecret() {
    return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
}

export function getOAuthRedirectUri(origin: string) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${origin}/api/auth/google/callback`;
}

export function redirectWithError(requestUrl: string, error: string) {
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

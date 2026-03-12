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

function splitCsvEnv(value: string | undefined) {
    return (value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

export function getAllowedGoogleWorkspaceDomains() {
    const configured = splitCsvEnv(process.env.GOOGLE_OAUTH_ALLOWED_DOMAINS);
    const singleDomain =
        process.env.GOOGLE_OAUTH_ALLOWED_DOMAIN?.trim().toLowerCase()
        || process.env.GOOGLE_WORKSPACE_DOMAIN?.trim().toLowerCase()
        || "";

    const domains = [...configured, singleDomain].filter(Boolean);
    return domains.length > 0 ? [...new Set(domains)] : ["ozekiread.org"];
}

export function getPrimaryAllowedGoogleWorkspaceDomain() {
    return getAllowedGoogleWorkspaceDomains()[0] ?? "ozekiread.org";
}

export function isAllowedGoogleWorkspaceEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const atIndex = normalizedEmail.lastIndexOf("@");
    if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
        return false;
    }
    const domain = normalizedEmail.slice(atIndex + 1);
    return getAllowedGoogleWorkspaceDomains().includes(domain);
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

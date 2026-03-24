import { NextRequest, NextResponse } from "next/server";

const adminPortalHost = (process.env.ADMIN_PORTAL_HOST ?? "admin.ozekiread.org").toLowerCase();
const publicSiteHost = (process.env.PUBLIC_SITE_HOST ?? "ozekiread.org").toLowerCase();
const enforceHostSplit = (() => {
  const raw = (process.env.ENFORCE_HOST_SPLIT ?? process.env.ENFORCE_ADMIN_HOST_SPLIT ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
})();

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;
  return hostHeader.split(":")[0]?.toLowerCase() ?? "";
}

function isPortalPath(pathname: string) {
  return (
    pathname === "/portal"
    || pathname.startsWith("/portal/")
    || pathname === "/api/portal"
    || pathname.startsWith("/api/portal/")
  );
}

function isStaticAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next/")
    || pathname === "/favicon.ico"
    || pathname === "/robots.txt"
    || pathname === "/sitemap.xml"
    || pathname === "/manifest.webmanifest"
  );
}

function isPublicAssetPath(pathname: string) {
  if (
    pathname.startsWith("/uploads/")
    || pathname.startsWith("/photos/")
    || pathname.startsWith("/videos/")
    || pathname.startsWith("/assets/")
    || pathname.startsWith("/maps/")
    || pathname.startsWith("/partners/")
  ) {
    return true;
  }

  return /\.[a-zA-Z0-9]{2,8}$/.test(pathname);
}

function buildAdminUrl(request: NextRequest, targetPath: string) {
  const url = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ? `${forwardedProto}:` : url.protocol || "https:";
  url.protocol = protocol;
  url.hostname = adminPortalHost;
  url.port = "";
  url.pathname = targetPath;
  url.search = "";
  return url;
}

export function middleware(request: NextRequest) {
  const hostname = getRequestHost(request);
  const pathname = request.nextUrl.pathname;
  const isPublicHost = hostname === publicSiteHost || hostname === `www.${publicSiteHost}`;

  // Helper: refresh portal session cookie on any portal-scoped response
  function refreshSessionCookie(response: NextResponse) {
    if (isPortalPath(pathname) || pathname.startsWith("/api/import/")) {
      const sessionCookie = request.cookies.get("orbf_portal_session");
      if (sessionCookie?.value) {
        response.cookies.set({
          name: "orbf_portal_session",
          value: sessionCookie.value,
          maxAge: 604_800, // 7 days – matches DB session expiry
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      }
    }
    return response;
  }

  if (localHosts.has(hostname) || hostname.endsWith(".local")) {
    return refreshSessionCookie(NextResponse.next());
  }

  // Host split is opt-in. Keep portal available on the same host unless explicitly enforced.
  if (!enforceHostSplit) {
    return refreshSessionCookie(NextResponse.next());
  }

  if (hostname === adminPortalHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/portal/login", request.url), 307);
    }

    if (
      !isStaticAssetPath(pathname)
      && !isPublicAssetPath(pathname)
      && !pathname.startsWith("/portal")
      && !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/portal/login", request.url), 307);
    }

    return refreshSessionCookie(NextResponse.next());
  }

  if ((isPublicHost || hostname !== adminPortalHost) && isPortalPath(pathname)) {
    if (pathname.startsWith("/api/portal")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const redirectUrl = buildAdminUrl(request, "/portal/login");
    const sourcePath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("from", sourcePath);
    return NextResponse.redirect(redirectUrl, 307);
  }

  return refreshSessionCookie(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};


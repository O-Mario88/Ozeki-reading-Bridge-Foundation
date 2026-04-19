import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findPortalUserBySessionTokenPostgres } from "@/lib/server/postgres/repositories/auth";
import type { PortalUser, ReportScope } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────
export const PORTAL_SESSION_COOKIE = "orbf_portal_session";
export const SESSION_MAX_AGE = 604_800; // 7 days – matches DB session expiry

// ─── Cookie helpers ───────────────────────────────────────────────────
export function buildSessionCookie(token: string) {
  return {
    name: PORTAL_SESSION_COOKIE,
    value: token,
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function buildClearSessionCookie() {
  return {
    name: PORTAL_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

// ─── Session lookup ───────────────────────────────────────────────────

/**
 * Read the portal session cookie and return the current user, or null.
 * Wrapped in React.cache() so repeated calls within the same render-tree
 * (page + layout + nested components + route guards) all share one DB hit.
 * This is the single entry-point for session resolution.
 */
export const getCurrentPortalUser = cache(async (): Promise<PortalUser | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
    if (!token) return null;
    return await findPortalUserBySessionTokenPostgres(token);
  } catch {
    return null;
  }
});

/** Alias kept for files that imported under this name from portal-api. */
export const getAuthenticatedPortalUser = getCurrentPortalUser;

// ─── Route / page guards ─────────────────────────────────────────────

export async function requirePortalUser(): Promise<PortalUser> {
  const user = await getCurrentPortalUser();
  if (!user) redirect("/portal/login");
  return user;
}

export async function requirePortalStaffUser(): Promise<PortalUser> {
  const user = await requirePortalUser();
  if (isPortalVolunteer(user)) redirect("/portal/trainings");
  return user;
}

export async function requirePortalSuperAdminUser(): Promise<PortalUser> {
  const user = await requirePortalUser();
  if (!user.isSuperAdmin) redirect(getPortalHomePath(user));
  return user;
}

export async function requirePortalFinanceReceiptEditorUser(): Promise<PortalUser> {
  const user = await requirePortalUser();
  if (!user.isSuperAdmin && !user.isAdmin) redirect(getPortalHomePath(user));
  return user;
}

/** Alias for API routes that used this name from portal-api. */
export async function requireAuthenticatedUser(): Promise<PortalUser> {
  const user = await getCurrentPortalUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** Alias for API routes that used requireAdmin from portal-api. */
export async function requireAdmin(): Promise<PortalUser> {
  const user = await requireAuthenticatedUser();
  if (!user.isAdmin && !user.isSuperAdmin) throw new Error("Forbidden: Admin access required");
  return user;
}

/** Alias for API routes that used requireSuperAdmin from portal-api. */
export async function requireSuperAdmin(): Promise<PortalUser> {
  const user = await requireAuthenticatedUser();
  if (!user.isSuperAdmin) throw new Error("Forbidden: Super Admin access required");
  return user;
}

// ─── Role utilities ───────────────────────────────────────────────────

export function getPortalHomePath(user: PortalUser): string {
  return user.role === "Volunteer" ? "/portal/profiles" : "/portal/dashboard";
}

export function isPortalVolunteer(user: PortalUser): boolean {
  return user.role === "Volunteer";
}

export function canReview(user: {
  isSupervisor: boolean;
  isME: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}): boolean {
  return user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;
}

// ─── Legacy compat aliases (from auth-server.ts) ──────────────────────

/** Compat alias — was exported by auth-server as getPortalUserOrRedirect. */
export const getPortalUserOrRedirect = requirePortalUser;

/** Compat alias — was exported by auth-server as getPortalStaffOrRedirect. */
export const getPortalStaffOrRedirect = requirePortalStaffUser;

/**
 * Compat alias — was auth() in auth-server.ts.
 * Returns a session-like object for Server Actions.
 */
export async function auth() {
  const user = await getCurrentPortalUser();
  if (!user) return null;
  return {
    user: {
      id: String(user.id),
      email: user.email,
      name: user.fullName,
      role: user.role,
    },
  };
}

// ─── Report scope resolution (from auth-middleware) ───────────────────

/**
 * Resolve report scope based on user permissions.
 * Defaults to 'Public' if required permissions are missing.
 */
export async function resolveReportScope(
  userPermissions: string[],
  requestedScope: string | null,
): Promise<ReportScope> {
  if (requestedScope === "Internal_School") {
    const hasInternalAccess = userPermissions.includes("view_internal_reports");
    const hasPIIAccess = userPermissions.includes("access_student_pii");
    if (hasInternalAccess && hasPIIAccess) {
      return "Internal_School";
    }
  }
  return "Public";
}

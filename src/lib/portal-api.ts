import { cookies } from "next/headers";
import { getPortalUserFromSession } from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export async function getAuthenticatedPortalUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getPortalUserFromSession(token);
}

export function canReview(user: {
  isSupervisor: boolean;
  isME: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  return user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuthenticatedUser();
  if (!user.isSuperAdmin) {
    throw new Error("Forbidden: Super Admin access required");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuthenticatedUser();
  if (!user.isAdmin && !user.isSuperAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

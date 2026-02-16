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
}) {
  return user.isSupervisor || user.isME || user.isAdmin;
}

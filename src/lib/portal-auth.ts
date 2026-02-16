import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalUserFromSession } from "@/lib/db";

export const PORTAL_SESSION_COOKIE = "orbf_portal_session";

export async function getCurrentPortalUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getPortalUserFromSession(token);
}

export async function requirePortalUser() {
  const user = await getCurrentPortalUser();

  if (!user) {
    redirect("/portal/login");
  }

  return user;
}

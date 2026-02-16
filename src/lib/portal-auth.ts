import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalUserFromSession } from "@/lib/db";
import { PortalUser } from "@/lib/types";

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

export function getPortalHomePath(user: PortalUser) {
  return user.role === "Volunteer" ? "/portal/profiles" : "/portal/dashboard";
}

export function isPortalVolunteer(user: PortalUser) {
  return user.role === "Volunteer";
}

export async function requirePortalStaffUser() {
  const user = await requirePortalUser();
  if (isPortalVolunteer(user)) {
    redirect("/portal/trainings");
  }
  return user;
}

export async function requirePortalSuperAdminUser() {
  const user = await requirePortalUser();
  if (!user.isSuperAdmin) {
    redirect(getPortalHomePath(user));
  }
  return user;
}

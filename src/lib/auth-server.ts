import { getCurrentPortalUser, requirePortalUser, requirePortalStaffUser } from "./portal-auth";

/**
 * Server-side auth helper for Server Actions and API Routes.
 * Returns a session-like object for compatibility with modern ORBF patterns.
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
    }
  };
}

export { requirePortalUser as getPortalUserOrRedirect };
export { requirePortalStaffUser as getPortalStaffOrRedirect };

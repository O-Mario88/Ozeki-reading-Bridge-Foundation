/**
 * Centralised permission rules for the four onboarding roles.
 *
 * Spec (2026-05-06):
 *   • Super Admin — finance + add/manage users + everything else.
 *   • Admin       — everything except finance/accounts. Can generate
 *                   reports and export data.
 *   • Staff       — data entry + generate reports for schools/coaching;
 *                   cannot export data.
 *   • Volunteer   — data entry only; no reports, no exports.
 *
 * Implementation note: the underlying user record carries role + boolean
 * flags (isAdmin, isSuperAdmin, etc.) for backward compat. The four
 * "onboarding tiers" map to those primitives via classifyOnboardingTier
 * below — Super Admin = role:Admin + isAdmin + isSuperAdmin; Admin =
 * role:Admin + isAdmin (no isSuperAdmin); Staff = role:Staff;
 * Volunteer = role:Volunteer. This keeps existing rows + middlewares
 * untouched while exposing a single, simple tier label upstream.
 */

import type { PortalUser, PortalUserRole } from "@/lib/types";

/* ────────────────────────────────────────────────────────────────────────
   Tier identification
   ──────────────────────────────────────────────────────────────────────── */

export type OnboardingTier = "Super Admin" | "Admin" | "Staff" | "Volunteer";

/** Roles surfaced in the onboarding dropdown — and only these. */
export const ONBOARDING_TIERS: readonly OnboardingTier[] = [
  "Super Admin",
  "Admin",
  "Staff",
  "Volunteer",
] as const;

export function classifyOnboardingTier(user: Pick<PortalUser, "role" | "isAdmin" | "isSuperAdmin">): OnboardingTier {
  if (user.isSuperAdmin) return "Super Admin";
  if (user.isAdmin) return "Admin";
  if (user.role === "Volunteer") return "Volunteer";
  return "Staff";
}

/**
 * Map an onboarding-tier choice back to the (role, flag) tuple persisted in
 * portal_users. Used by the create/edit user form and the API handler so the
 * dropdown is the single source of truth and the boolean flags stay
 * internally consistent.
 */
export function tierToRoleAndFlags(tier: OnboardingTier): {
  role: PortalUserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
} {
  switch (tier) {
    case "Super Admin":
      return { role: "Admin", isAdmin: true, isSuperAdmin: true };
    case "Admin":
      return { role: "Admin", isAdmin: true, isSuperAdmin: false };
    case "Staff":
      return { role: "Staff", isAdmin: false, isSuperAdmin: false };
    case "Volunteer":
      return { role: "Volunteer", isAdmin: false, isSuperAdmin: false };
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Capability checks (call sites stay terse and intent-revealing)
   ──────────────────────────────────────────────────────────────────────── */

type UserPerms = Pick<PortalUser, "role" | "isAdmin" | "isSuperAdmin">;

/** Finance pages, finance routes, finance reports. Super Admin only. */
export function canAccessFinance(user: UserPerms): boolean {
  return user.isSuperAdmin === true;
}

/** Onboard / edit / delete portal users. Super Admin only. */
export function canManageUsers(user: UserPerms): boolean {
  return user.isSuperAdmin === true;
}

/** PDF / CSV / report-bundle download endpoints. Super Admin or Admin. */
export function canExportData(user: UserPerms): boolean {
  return user.isSuperAdmin === true || user.isAdmin === true;
}

/**
 * Generate / view formal reports (school coaching reports, programme reports,
 * portal report builders). Super Admin, Admin, and Staff. Volunteers cannot.
 */
export function canGenerateReports(user: UserPerms): boolean {
  if (user.isSuperAdmin || user.isAdmin) return true;
  return user.role === "Staff";
}

/** Submit data entry (create assessments, observations, contacts). Everyone. */
export function canEnterData(_user: UserPerms): boolean {
  return true;
}

/** Convenience for guard helpers to label a denial cleanly. */
export function permissionDenialReason(
  user: UserPerms,
  capability: "finance" | "userManagement" | "export" | "reports",
): string {
  const tier = classifyOnboardingTier(user);
  switch (capability) {
    case "finance":
      return `Finance is restricted to Super Admin. You are signed in as ${tier}.`;
    case "userManagement":
      return `User management is restricted to Super Admin. You are signed in as ${tier}.`;
    case "export":
      return `Data export requires Admin or Super Admin. You are signed in as ${tier}.`;
    case "reports":
      return `Report generation requires Staff, Admin, or Super Admin. You are signed in as ${tier}.`;
  }
}

import type { PortalUser } from "@/lib/types";

export function canAccessNationalIntelligenceInternal(user: PortalUser) {
  return (
    user.isSuperAdmin ||
    user.isAdmin ||
    user.role === "Staff" ||
    user.role === "Admin"
  );
}

export function canManageNationalBenchmarks(user: PortalUser) {
  return user.isSuperAdmin;
}

export function canManagePartnerApiClients(user: PortalUser) {
  return user.isSuperAdmin || user.isAdmin;
}

export function canManageNationalInterventions(user: PortalUser) {
  return canAccessNationalIntelligenceInternal(user);
}

export function canRunEducationAuditSweep(user: PortalUser) {
  return canAccessNationalIntelligenceInternal(user);
}

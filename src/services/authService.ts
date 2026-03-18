export {
  authenticatePortalUserPostgres as authenticatePortalUser,
  createPortalSessionPostgres as createPortalSession,
  deletePortalSessionPostgres as deletePortalSession,
  findPortalUserByEmailPostgres as getPortalUserByEmail,
  findPortalUserBySessionTokenPostgres as getPortalUserFromSession,
  // These might need matching in the repo if not present
  // listPortalUsersForAdminPostgres as listPortalUsersForAdmin,
  // updatePortalUserPermissionsPostgres as updatePortalUserPermissions,
} from "@/lib/server/postgres/repositories/auth";

export {
  canManagePortalUsers, // This is business logic, usually stays in service or moved to RBAC
} from "@/lib/db-api"; 

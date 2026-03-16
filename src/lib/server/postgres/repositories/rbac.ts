import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * Fetches all permissions for a given user ID (UUID from the new users table).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await queryPostgres(
    `
    SELECT DISTINCT p.name
    FROM rbac_permissions p
    JOIN rbac_role_permissions rp ON rp.permission_id = p.id
    JOIN rbac_user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = $1
    `,
    [userId]
  );
  return result.rows.map((row) => String(row.name));
}

/**
 * Checks if a user has a specific permission.
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionName);
}

/**
 * Legacy support: Fetches permissions for a portal_user (integer ID).
 * This assumes we link portal_users to the users table or have a mapping.
 * For now, we'll try to find a user by email matching the portal_user.
 */
export async function getPermissionsForPortalUser(portalUserId: number): Promise<string[]> {
  const userResult = await queryPostgres(
    `
    SELECT u.id
    FROM users u
    JOIN portal_users pu ON lower(pu.email) = lower(u.email)
    WHERE pu.id = $1
    LIMIT 1
    `,
    [portalUserId]
  );
  
  if (userResult.rows.length === 0) {
    return [];
  }
  
  return getUserPermissions(userResult.rows[0].id);
}

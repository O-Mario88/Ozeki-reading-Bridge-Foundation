import { NextRequest, NextResponse } from "next/server";
import { findPortalUserBySessionTokenPostgres } from "@/lib/server/postgres/repositories/auth";
import { getPermissionsForPortalUser } from "@/lib/server/postgres/repositories/rbac";
import { ReportScope } from "@/lib/types";

export type AuthenticatedRequest = NextRequest & {
  user: {
    id: number;
    email: string;
    permissions: string[];
  };
};

/**
 * Higher-order function to wrap API route handlers with permission checks.
 */
export function withPermission(
  requiredPermission: string,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // 1. Extract session token (assuming it's in a cookie or header)
    const token = req.cookies.get("portal_session")?.value ?? req.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No session token provided" }, { status: 401 });
    }

    // 2. Find user by session token
    const user = await findPortalUserBySessionTokenPostgres(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired session" }, { status: 401 });
    }

    // 3. Fetch permissions for the user
    const permissions = await getPermissionsForPortalUser(user.id);

    // 4. Check for required permission
    if (!permissions.includes(requiredPermission)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // 5. Enhance request with user details and call handler
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      id: user.id,
      email: user.email,
      permissions,
    };

    return handler(authenticatedReq);
  };
}

/**
 * Helper to resolve the report scope based on user permissions.
 * Forcefully defaults to 'Public' if required permissions are missing.
 */
export async function resolveReportScope(
  userPermissions: string[],
  requestedScope: string | null
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

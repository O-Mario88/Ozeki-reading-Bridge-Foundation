import { NextResponse } from "next/server";
import { getPortalDashboardData } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    dashboard: getPortalDashboardData(user),
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isSupervisor: user.isSupervisor,
      isME: user.isME,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
    },
  });
}

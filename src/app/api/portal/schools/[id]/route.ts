import { NextResponse } from "next/server";
import { getPortalUserFromSession, deleteSchoolDirectoryRecordPostgres } from "@/services/dataService";
import { canManagePortalUsers } from "@/lib/db-api";
import { cookies } from "next/headers";

import { PortalUser } from "@/lib/types";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const schoolIdStr = p.id;
    const schoolId = parseInt(schoolIdStr, 10);
    
    if (isNaN(schoolId) || schoolId <= 0) {
      return NextResponse.json({ error: "Invalid school ID format" }, { status: 400 });
    }

    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("ozeki_portal_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getPortalUserFromSession(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: Only directors/admins should permanently delete schools
    const canManage = canManagePortalUsers(user as PortalUser);
    if (!canManage && user.role !== "Director") {
        return NextResponse.json({ error: "Insufficient permissions to delete schools" }, { status: 403 });
    }

    const success = await deleteSchoolDirectoryRecordPostgres(schoolId);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "School not found or could not be deleted" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Internal server error during deletion" },
      { status: 500 }
    );
  }
}

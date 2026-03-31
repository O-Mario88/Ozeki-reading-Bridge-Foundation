import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPortalUserFromSession } from "@/services/dataService";
import { canManagePortalUsers } from "@/lib/db-api";
import { deleteContactPostgres } from "@/lib/server/postgres/repositories/schools";
import type { PortalUser } from "@/lib/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ contactId: string }> },
) {
  try {
    const { contactId: contactIdStr } = await params;
    const contactId = parseInt(contactIdStr, 10);

    if (isNaN(contactId) || contactId <= 0) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    // Auth
    const cookieStore = await cookies();
    const token = cookieStore.get("ozeki_portal_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getPortalUserFromSession(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: Admin or users that can manage portal users
    const canManage = canManagePortalUsers(user as PortalUser);
    if (!canManage && user.role !== "Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions to delete contacts" },
        { status: 403 },
      );
    }

    const deleted = await deleteContactPostgres(contactId);
    if (deleted) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Contact not found or could not be deleted" },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Internal server error during contact deletion" },
      { status: 500 },
    );
  }
}

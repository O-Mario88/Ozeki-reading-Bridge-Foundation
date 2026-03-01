import { NextRequest, NextResponse } from "next/server";
import { updateSupportRequest } from "@/lib/db";
import { getAuthenticatedPortalUser, canReview } from "@/lib/portal-api";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedPortalUser();
        if (!user || !canReview(user)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const body = await req.json();

        // Validate updates
        const updates: Record<string, unknown> = {};
        if (body.status) updates.status = body.status;
        if (body.assignedStaffId !== undefined) updates.assignedStaffId = body.assignedStaffId;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        updateSupportRequest(id, updates);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error updating support request:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}

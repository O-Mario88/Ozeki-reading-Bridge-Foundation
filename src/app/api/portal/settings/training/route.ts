import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/portal-auth";
import { logAuditEvent } from "@/lib/db";

// Settings are global config variables in a real app.
// Mocked implementation for settings page structure.

export async function GET() {
    try {
        const user = await requirePortalUser();
        if (!user.isSuperAdmin && !user.isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Usually fetched from a portal_settings table, but mocked here.
        return NextResponse.json({
            googleConnected: true,
            defaultMeetingsRecorded: true,
            aiNotesEnabled: true,
            aiModel: "gpt-4o-mini",
        });
    } catch (_error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requirePortalUser();
        if (!user.isSuperAdmin && !user.isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();

        logAuditEvent(
            user.id,
            user.fullName,
            "UPDATED_TRAINING_SETTINGS",
            "system_settings",
            "training",
            null,
            JSON.stringify(body),
            "Updated Google Workspace and AI configuration.",
        );

        return NextResponse.json({ success: true, settings: body });
    } catch (_error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

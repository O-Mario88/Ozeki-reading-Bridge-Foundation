import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { getPortalUserFromSession, logAuditEvent } from "@/lib/db";
import { getGoogleWorkspaceDiagnostics } from "@/lib/google-workspace";

async function requireAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
    if (!token) {
        return null;
    }
    return await getPortalUserFromSession(token);
}

export async function GET() {
    try {
        const user = await requireAuth();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        if (!user.isSuperAdmin && !user.isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const googleStatus = await getGoogleWorkspaceDiagnostics();

        return NextResponse.json({
            googleConnected: googleStatus.googleConnected,
            defaultMeetingsRecorded: true,
            aiNotesEnabled: true,
            aiModel: "gpt-4o-mini",
            googleStatus,
        });
    } catch (_error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
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

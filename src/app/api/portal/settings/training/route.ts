import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { getPortalUserFromSession, logAuditEvent } from "@/services/dataService";
import { auditLog } from "@/lib/server/audit/log";
import { getGoogleWorkspaceDiagnostics } from "@/lib/google-workspace";
import { getSettingPostgres, setSettingPostgres } from "@/lib/server/postgres/repositories/settings";

const TRAINING_SETTINGS_KEY = "training_settings";

type TrainingSettings = {
    defaultMeetingsRecorded: boolean;
    aiNotesEnabled: boolean;
    aiModel: string;
};

const TRAINING_SETTINGS_DEFAULTS: TrainingSettings = {
    defaultMeetingsRecorded: true,
    aiNotesEnabled: true,
    aiModel: "gpt-4o-mini",
};

function normalizeTrainingSettings(body: Record<string, unknown>): TrainingSettings {
    const aiModel = typeof body.aiModel === "string" && body.aiModel.trim()
        ? body.aiModel.trim()
        : TRAINING_SETTINGS_DEFAULTS.aiModel;
    return {
        defaultMeetingsRecorded: Boolean(body.defaultMeetingsRecorded),
        aiNotesEnabled: Boolean(body.aiNotesEnabled),
        aiModel,
    };
}

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
        const saved = await getSettingPostgres<TrainingSettings>(
            TRAINING_SETTINGS_KEY,
            TRAINING_SETTINGS_DEFAULTS,
        );

        return NextResponse.json({
            googleConnected: googleStatus.googleConnected,
            defaultMeetingsRecorded: saved.defaultMeetingsRecorded,
            aiNotesEnabled: saved.aiNotesEnabled,
            aiModel: saved.aiModel,
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
        const settings = normalizeTrainingSettings(body ?? {});

        // Persist the configuration. Previously this handler only wrote audit
        // entries and returned { success: true } WITHOUT storing anything, so
        // admins believed settings were saved while nothing changed.
        await setSettingPostgres(
            TRAINING_SETTINGS_KEY,
            JSON.stringify(settings),
            "json",
            user.id,
            "Training / Google Workspace / AI configuration",
        );

        logAuditEvent(
            user.id,
            user.fullName,
            "UPDATED_TRAINING_SETTINGS",
            "system_settings",
            "training",
            null,
            JSON.stringify(settings),
            "Updated Google Workspace and AI configuration.",
        );

        await auditLog({
            actor: user,
            action: "update",
            targetTable: "system_settings",
            after: settings,
            detail: "Updated training / Google Workspace / AI configuration",
            request: req,
        });
        return NextResponse.json({ success: true, settings });
    } catch (_error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

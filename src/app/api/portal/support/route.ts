import { NextRequest, NextResponse } from "next/server";
import { createSupportRequest, listSupportRequests } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { SupportRequestInput, SupportRequestStatus, SupportRequestUrgency, SupportType } from "@/lib/types";

const SUPPORT_STATUSES = ["New", "Contacted", "Scheduled", "Delivered", "Closed"] as const;
const SUPPORT_TYPES = ["phonics training", "coaching visit", "learner assessment", "1001 story"] as const;
const SUPPORT_URGENCIES = ["low", "medium", "high", "this_term", "next_term"] as const;

function isSupportStatus(value: unknown): value is SupportRequestStatus {
    return typeof value === "string" && SUPPORT_STATUSES.includes(value as SupportRequestStatus);
}

function isSupportType(value: unknown): value is SupportType {
    return typeof value === "string" && SUPPORT_TYPES.includes(value as SupportType);
}

function isSupportUrgency(value: unknown): value is SupportRequestUrgency {
    return typeof value === "string" && SUPPORT_URGENCIES.includes(value as SupportRequestUrgency);
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedPortalUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const statusParam = searchParams.get("status");
        const status = isSupportStatus(statusParam) ? statusParam : undefined;
        const district = searchParams.get("district") || undefined;

        const requests = listSupportRequests({ status, district });
        return NextResponse.json(requests);
    } catch (error: unknown) {
        console.error("Error listing support requests:", error);
        return NextResponse.json({ error: errorMessage(error, "Failed to list support requests") }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as Partial<SupportRequestInput> & Record<string, unknown>;

        const schoolIdRaw = body.schoolId;
        const schoolId =
            typeof schoolIdRaw === "number"
                ? schoolIdRaw
                : typeof schoolIdRaw === "string"
                  ? Number(schoolIdRaw)
                  : undefined;
        const supportTypes = Array.isArray(body.supportTypes)
            ? body.supportTypes.filter(isSupportType)
            : [];
        const urgency = isSupportUrgency(body.urgency) ? body.urgency : "medium";
        const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
        const contactRole = typeof body.contactRole === "string" ? body.contactRole.trim() : "";
        const contactInfo = typeof body.contactInfo === "string" ? body.contactInfo.trim() : "";
        const message = typeof body.message === "string" ? body.message.trim() : "";

        if (!contactName || !contactRole || !contactInfo || !message || supportTypes.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const normalizedSchoolId =
            typeof schoolId === "number" && Number.isInteger(schoolId) && schoolId > 0
                ? schoolId
                : undefined;

        const input: SupportRequestInput = {
            schoolId: normalizedSchoolId,
            locationText: typeof body.locationText === "string" ? body.locationText.trim() : undefined,
            contactName,
            contactRole,
            contactInfo,
            supportTypes,
            urgency,
            message,
        };

        const newRequest = createSupportRequest(input);
        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating support request:", error);
        return NextResponse.json({ error: errorMessage(error, "Failed to create support request") }, { status: 500 });
    }
}

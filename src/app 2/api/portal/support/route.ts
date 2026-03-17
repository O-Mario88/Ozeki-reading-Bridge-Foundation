import { NextRequest, NextResponse } from "next/server";
import { createSupportRequest, listSupportRequests } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { SupportRequestInput } from "@/lib/types";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedPortalUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") as any;
        const district = searchParams.get("district") || undefined;

        const requests = listSupportRequests({ status, district });
        return NextResponse.json(requests);
    } catch (error: any) {
        console.error("Error listing support requests:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Simple validation (can be more robust with Zod)
        if (!body.contactName || !body.message || !body.supportTypes) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const input: SupportRequestInput = {
            schoolId: body.schoolId,
            locationText: body.locationText,
            contactName: body.contactName,
            contactRole: body.contactRole,
            contactInfo: body.contactInfo,
            supportTypes: body.supportTypes,
            urgency: body.urgency || "Medium",
            message: body.message
        };

        const newRequest = createSupportRequest(input);
        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: any) {
        console.error("Error creating support request:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

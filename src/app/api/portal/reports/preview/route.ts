import { NextResponse } from "next/server";
import { z } from "zod";
import { getReportPreviewStats } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const scopeTypeSchema = z.enum(["National", "Region", "Sub-region", "District", "School"]);
const programSchema = z.enum([
    "training",
    "visit",
    "assessment",
    "story",
    "resources",
    "online-training",
]);

const previewPayloadSchema = z
    .object({
        scopeType: scopeTypeSchema,
        scopeValue: z.string().trim().max(120).optional(),
        periodStart: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodEnd: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
        programsIncluded: z.array(programSchema).min(1).max(12),
    })
    .superRefine((payload, ctx) => {
        if (payload.scopeType !== "National" && (!payload.scopeValue || !payload.scopeValue.trim())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["scopeValue"],
                message: "Scope value is required for Region, Sub-region, District, or School reports.",
            });
        }
    });

export async function POST(request: Request) {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = previewPayloadSchema.parse(await request.json());
        const stats = getReportPreviewStats({
            user,
            scopeType: payload.scopeType,
            scopeValue: payload.scopeValue || "",
            periodStart: payload.periodStart,
            periodEnd: payload.periodEnd,
            programsIncluded: payload.programsIncluded,
        });
        return NextResponse.json({ ok: true, stats });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0]?.message ?? "Invalid preview request payload." },
                { status: 400 },
            );
        }
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}

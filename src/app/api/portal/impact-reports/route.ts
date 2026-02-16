import { NextResponse } from "next/server";
import { z } from "zod";
import { createImpactReport, listPortalImpactReports } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const reportTypeSchema = z.enum([
  "FY Impact Report",
  "Regional Impact Report",
  "District Report",
  "School Report",
  "Partner Snapshot Report",
]);

const scopeTypeSchema = z.enum(["National", "Region", "District", "School"]);
const programSchema = z.enum([
  "training",
  "visit",
  "assessment",
  "story",
  "resources",
  "online-training",
]);

const payloadSchema = z
  .object({
    title: z.string().trim().min(6).max(180).optional(),
    partnerName: z.string().trim().max(160).optional(),
    reportType: reportTypeSchema,
    scopeType: scopeTypeSchema,
    scopeValue: z.string().trim().max(120).optional(),
    periodStart: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    programsIncluded: z.array(programSchema).min(1).max(12),
    isPublic: z.boolean().default(false),
    version: z.string().trim().max(24).default("v1.0"),
  })
  .superRefine((payload, ctx) => {
    if (payload.scopeType !== "National" && (!payload.scopeValue || !payload.scopeValue.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopeValue"],
        message: "Scope value is required for Region, District, or School reports.",
      });
    }
  });

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reports = listPortalImpactReports(user, 180);
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const report = createImpactReport(payload, user);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid report request payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createImpactReport, listPortalImpactReports } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const reportTypeSchema = z.enum([
  "FY Impact Report",
  "Regional Impact Report",
  "Sub-region Report",
  "District Report",
  "School Report",
  "School Coaching Pack",
  "Headteacher Summary",
  "Partner Snapshot Report",
]);

const scopeTypeSchema = z.enum(["National", "Region", "Sub-region", "District", "Sub-county", "Parish", "School"]);
const programSchema = z.enum([
  "training",
  "visit",
  "assessment",
  "story",
  "resources",
  "online-training",
]);
const reportCategorySchema = z.enum([
  "Assessment Report",
  "Training Report",
  "School Coaching Visit Report",
  "Teaching Quality Report (Lesson Evaluations)",
  "Remedial & Catch-Up Intervention Report",
  "1001 Story Project Report",
  "Implementation Fidelity & Coverage Report",
  "District Literacy Brief",
  "Graduation Readiness & Alumni Monitoring Report",
  "Partner/Donor Report (Scoped)",
  "Data Quality & Credibility Report",
  "School Profile Report (Headteacher Pack)",
]);
const periodTypeSchema = z.enum(["FY", "Term", "Quarter", "Custom"]);
const audienceSchema = z.enum(["Public-safe", "Staff-only"]);
const outputSchema = z.enum(["PDF", "HTML preview"]);

const payloadSchema = z
  .object({
    title: z.string().trim().min(6).max(180).optional(),
    partnerName: z.string().trim().max(160).optional(),
    reportType: reportTypeSchema,
    reportCategory: reportCategorySchema,
    scopeType: scopeTypeSchema,
    scopeValue: z.string().trim().max(120).optional(),
    regionId: z.string().trim().max(120).optional(),
    subRegionId: z.string().trim().max(120).optional(),
    districtId: z.string().trim().max(120).optional(),
    schoolId: z.coerce.number().int().positive().optional(),
    periodType: periodTypeSchema.default("FY"),
    periodStart: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    programsIncluded: z.array(programSchema).min(1).max(12).optional(),
    audience: audienceSchema.default("Public-safe"),
    output: outputSchema.default("PDF"),
    isPublic: z.boolean().default(false),
    version: z.string().trim().max(24).default("v1.0"),
  })
  .superRefine((payload, ctx) => {
    if (payload.scopeType !== "National" && (!payload.scopeValue || !payload.scopeValue.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopeValue"],
        message:
          "Scope value is required for Region, Sub-region, District, Sub-county, Parish, or School reports.",
      });
    }

    const startYear = Number(payload.periodStart.slice(0, 4));
    const endYear = Number(payload.periodEnd.slice(0, 4));
    const inRange = (year: number) => Number.isInteger(year) && year >= 2025 && year <= 2050;
    if (!inRange(startYear) || !inRange(endYear)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodStart"],
        message: "Report year must be within 2025 to 2050.",
      });
    }
  });

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = listPortalImpactReports(user, 180);
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    if (user.role === "Volunteer" && payload.audience === "Staff-only") {
      return NextResponse.json(
        {
          error:
            "Volunteers can generate Public-safe reports only. Detailed school reading performance reports are staff-generated on request.",
        },
        { status: 403 },
      );
    }
    const report = await createImpactReport(payload, user);
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

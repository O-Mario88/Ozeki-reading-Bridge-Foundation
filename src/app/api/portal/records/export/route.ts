import { NextResponse } from "next/server";
import { z } from "zod";
import { listPortalRecordsAsync, logAuditEvent } from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { PortalRecordFilters } from "@/lib/types";

export const runtime = "nodejs";

const moduleSchema = z.enum(["training", "visit", "assessment", "story"]);
const statusSchema = z.enum(["Draft", "Submitted", "Returned", "Approved"]);

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function readFirstString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function readSponsorship(payload: unknown) {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  return {
    sponsorshipType: readFirstString(record, ["sponsorshipType", "sponsorType", "sponsor_category"]),
    sponsoredBy: readFirstString(record, ["sponsoredBy", "sponsorName", "sponsored_by"]),
  };
}

function parseFilters(request: Request): PortalRecordFilters {
  const { searchParams } = new URL(request.url);
  const moduleFilter = moduleSchema.parse(searchParams.get("module"));
  const createdByParam = searchParams.get("createdBy");
  const createdBy = createdByParam ? Number(createdByParam) : undefined;

  return {
    module: moduleFilter,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    district: searchParams.get("district") || undefined,
    school: searchParams.get("school") || undefined,
    status: searchParams.get("status")
      ? statusSchema.parse(searchParams.get("status"))
      : undefined,
    createdBy: createdBy && Number.isFinite(createdBy) ? createdBy : undefined,
    programType: searchParams.get("programType") || undefined,
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(user.isME || user.isAdmin || user.isSupervisor || user.isSuperAdmin)) {
    return NextResponse.json(
      { error: "Only supervisors, M&E, admins, or super admins can export reports." },
      { status: 403 },
    );
  }

  try {
    const filters = parseFilters(request);
    const rows = await listPortalRecordsAsync(filters, user);
    logAuditEvent(
      user.id,
      user.fullName,
      filters.module === "assessment" ? "export_learner_data" : "export_portal_records",
      "portal_records",
      null,
      `Exported ${filters.module} records to CSV.`,
    );

    const header = [
      "Record ID",
      "Code",
      "Module",
      "Date",
      "District",
      "School",
      "Type",
      "Status",
      "Follow-up",
      "Created By",
      "Created At",
      "Updated At",
      "Review Note",
      "Sponsorship Type",
      "Sponsored By",
      "Payload JSON",
    ];

    const data = rows.map((row) => {
      const sponsorship = readSponsorship(row.payload);
      return [
        row.id,
        row.recordCode,
        row.module,
        row.date,
        row.district,
        row.schoolName,
        row.programType ?? "",
        row.status,
        row.followUpDate ?? "",
        row.createdByName,
        row.createdAt,
        row.updatedAt,
        row.reviewNote ?? "",
        sponsorship.sponsorshipType,
        sponsorship.sponsoredBy,
        JSON.stringify(row.payload),
      ]
        .map((value) => csvEscape(value))
        .join(",");
    });

    const csv = [header.join(","), ...data].join("\n");
    const now = new Date().toISOString().slice(0, 10);
    const filename = `portal-${filters.module}-report-${now}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid export filters." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

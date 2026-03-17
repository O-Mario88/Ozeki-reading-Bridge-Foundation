import { NextResponse } from "next/server";
import { z } from "zod";
import { createPortalRecord, listPortalRecords } from "@/lib/db";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";
import { PortalRecordFilters, PortalRecordPayload } from "@/lib/types";

export const runtime = "nodejs";

const moduleSchema = z.enum(["training", "visit", "assessment", "story"]);
const statusSchema = z.enum(["Draft", "Submitted", "Returned", "Approved"]);
const payloadValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
  z.undefined(),
]);

const createRecordSchema = z.object({
  module: moduleSchema,
  date: z.string().min(6),
  district: z.string().min(2),
  schoolId: z.coerce.number().int().positive(),
  schoolName: z.string().min(2),
  programType: z.string().trim().optional(),
  followUpDate: z.string().trim().optional(),
  status: statusSchema,
  payload: z.record(z.string(), payloadValueSchema).default({}),
});

function parseFilters(request: Request): PortalRecordFilters {
  const { searchParams } = new URL(request.url);
  const module = moduleSchema.parse(searchParams.get("module"));
  const createdByParam = searchParams.get("createdBy");
  const createdBy = createdByParam ? Number(createdByParam) : undefined;

  return {
    module,
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

function cleanPayload(input: Record<string, unknown>): PortalRecordPayload {
  const payload: PortalRecordPayload = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      payload[key] = value
        .map((item) => String(item).trim())
        .filter(Boolean);
      return;
    }

    if (value === null) {
      payload[key] = null;
      return;
    }

    if (typeof value === "string") {
      payload[key] = value.trim();
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      payload[key] = value;
    }
  });

  return payload;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filters = parseFilters(request);
    const records = listPortalRecords(filters, user);
    return NextResponse.json({ records });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid filters." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createRecordSchema.parse(await request.json());
    const reviewer = canReview(user);

    if (!reviewer && (payload.status === "Returned" || payload.status === "Approved")) {
      return NextResponse.json(
        { error: "Only supervisors, M&E, or admins can set Returned/Approved status." },
        { status: 403 },
      );
    }

    const record = createPortalRecord(
      {
        ...payload,
        programType: payload.programType?.trim() || undefined,
        followUpDate: payload.followUpDate?.trim() || undefined,
        payload: cleanPayload(payload.payload),
      },
      user,
    );

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid portal record payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

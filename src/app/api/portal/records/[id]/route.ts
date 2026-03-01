import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPortalRecordById,
  updatePortalRecord,
} from "@/lib/db";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";
import { PortalRecordPayload } from "@/lib/types";

export const runtime = "nodejs";

const statusSchema = z.enum(["Draft", "Submitted", "Returned", "Approved"]);
const moduleSchema = z.enum(["training", "visit", "assessment", "story"]);
const payloadValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
  z.undefined(),
]);

const updateSchema = z.object({
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

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid record id.");
  }
  return id;
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = toId(params.id);
    const record = getPortalRecordById(id, user);

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = toId(params.id);
    const payload = updateSchema.parse(await request.json());
    const reviewer = canReview(user);

    if (!reviewer && (payload.status === "Returned" || payload.status === "Approved")) {
      return NextResponse.json(
        { error: "Only supervisors, M&E, or admins can set Returned/Approved status." },
        { status: 403 },
      );
    }

    const record = updatePortalRecord(
      id,
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = toId(params.id);
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason") || "User requested deletion via API";

    const { softDeletePortalRecord } = await import("@/lib/db");
    softDeletePortalRecord(id, user, reason);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

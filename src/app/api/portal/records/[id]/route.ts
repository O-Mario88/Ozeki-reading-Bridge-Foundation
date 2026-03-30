import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPortalRecordById,
  updatePortalRecord,
  softDeletePortalRecord,
} from "@/services/dataService";
import { canReview, getAuthenticatedPortalUser } from "@/lib/auth";
import { PortalRecordPayload, PortalUser } from "@/lib/types";

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
  schoolId: z.coerce.number().int().nonnegative(),
  schoolName: z.string().min(2),
  programType: z.string().trim().optional(),
  followUpDate: z.string().trim().optional(),
  followUpType: z
    .enum(["virtual_check_in", "school_visit", "refresher_session"])
    .optional(),
  followUpOwnerUserId: z.coerce.number().int().positive().optional(),
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
    const record = await getPortalRecordById(id);

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
    const reviewer = canReview(user as PortalUser);

    if (!reviewer && (payload.status === "Returned" || payload.status === "Approved")) {
      return NextResponse.json(
        { error: "Only supervisors, M&E, or admins can set Returned/Approved status." },
        { status: 403 },
      );
    }

    // --- Phase 2: Conflict Detection ---
    // Prevent offline edits from silently overwriting fresh changes made by another admin
    const existingRecord = await getPortalRecordById(id);
    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    const lastSyncUpdatedAt = payload.payload.lastSyncUpdatedAt as string | undefined;
    if (lastSyncUpdatedAt) {
      const dbDate = new Date(existingRecord.updatedAt).getTime();
      const syncDate = new Date(lastSyncUpdatedAt).getTime();
      // Add a 2000ms buffer to handle JS precision drops compared to Postgres timestamps
      if (dbDate > syncDate + 2000) {
        return NextResponse.json(
          { 
            error: "Conflict: The physical database record is newer than your offline device cache. Please review the live changes before syncing.", 
            conflict: true 
          },
          { status: 409 }
        );
      }
    }

    const record = await updatePortalRecord(
      id,
      {
        ...payload,
        schoolId: payload.schoolId === 0 ? null : payload.schoolId,
        programType: payload.programType?.trim() || undefined,
        followUpDate: payload.followUpDate?.trim() || undefined,
        followUpType: payload.followUpType,
        followUpOwnerUserId: payload.followUpOwnerUserId,
        payload: cleanPayload(payload.payload),
      }
    );

    if (payload.module === "assessment" || payload.module === "story") {
      try {
        const { runEducationDataQualitySweepAsync } = await import("@/lib/national-intelligence-async");
        runEducationDataQualitySweepAsync({
          user,
          scopeType: "district",
          scopeId: payload.district,
        });
      } catch {
        // Record update should not fail when quality sweep cannot run.
      }
    }

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

    const { softDeletePortalRecord } = await import("@/services/dataService");
    await softDeletePortalRecord(id, user.id, reason);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

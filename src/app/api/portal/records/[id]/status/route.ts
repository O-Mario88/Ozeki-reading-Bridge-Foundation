import { NextResponse } from "next/server";
import { z } from "zod";
import { setPortalRecordStatus } from "@/lib/db";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(["Returned", "Approved", "Submitted", "Draft"]),
  reviewNote: z.string().trim().optional(),
});

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid record id.");
  }
  return id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReview(user)) {
    return NextResponse.json(
      { error: "Only supervisors, M&E, or admins can review records." },
      { status: 403 },
    );
  }

  try {
    const params = await context.params;
    const id = toId(params.id);
    const payload = statusSchema.parse(await request.json());

    const record = setPortalRecordStatus(id, payload.status, user, payload.reviewNote);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid status payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

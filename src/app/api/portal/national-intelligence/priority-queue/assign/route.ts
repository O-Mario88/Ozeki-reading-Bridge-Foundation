import { NextResponse } from "next/server";
import { z } from "zod";
import { assignPriorityQueueItem } from "@/lib/national-intelligence";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canAccessNationalIntelligenceInternal } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const postSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  periodKey: z.string().trim().optional(),
  ownerUserId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessNationalIntelligenceInternal(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = postSchema.parse(await request.json());
    assignPriorityQueueItem({
      user,
      schoolId: payload.schoolId,
      periodKey: payload.periodKey,
      ownerUserId: payload.ownerUserId,
      notes: payload.notes,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid priority assignment payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

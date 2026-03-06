import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveEducationAuditException } from "@/lib/national-intelligence";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canAccessNationalIntelligenceInternal } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["resolved", "overridden"]),
  notes: z.string().trim().min(3).max(2000),
});

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid exception id.");
  }
  return id;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ exceptionId: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessNationalIntelligenceInternal(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await context.params;
    const exceptionId = toId(params.exceptionId);
    const payload = patchSchema.parse(await request.json());

    resolveEducationAuditException({
      user,
      exceptionId,
      status: payload.status,
      notes: payload.notes,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid audit exception patch payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      const status = error.message.toLowerCase().includes("not found") ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

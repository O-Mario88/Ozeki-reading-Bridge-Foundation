import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { runFinanceResetBatchPostgres } from "@/lib/server/postgres/repositories/finance-lifecycle";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  dryRun: z.boolean().optional(),
  confirm: z.literal("I UNDERSTAND THIS WILL ARCHIVE DUPLICATE FINANCE ROWS").optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Only super-admins may run a finance reset batch." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = schema.parse(body);

    // Require the typed confirmation for non-dry runs so the button can't be
    // pressed accidentally.
    if (!parsed.dryRun && parsed.confirm !== "I UNDERSTAND THIS WILL ARCHIVE DUPLICATE FINANCE ROWS") {
      return NextResponse.json(
        { error: "Type the exact confirmation phrase in the 'confirm' field or pass dryRun=true." },
        { status: 400 },
      );
    }

    const result = await runFinanceResetBatchPostgres({
      actorUserId: user.id,
      dryRun: Boolean(parsed.dryRun),
    });
    return NextResponse.json({ ok: true, dryRun: Boolean(parsed.dryRun), summary: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[finance/reset-batch] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

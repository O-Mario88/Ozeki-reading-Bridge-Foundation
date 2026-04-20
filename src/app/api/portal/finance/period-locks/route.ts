import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  listPeriodLocksPostgres,
  lockFinancePeriodPostgres,
} from "@/lib/server/postgres/repositories/finance-controls";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const createSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  try {
    await requirePortalUser();
    const locks = await listPeriodLocksPostgres();
    return NextResponse.json({ locks });
  } catch (error) {
    logger.error("[finance/period-locks] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Only super-admins can lock a finance period." }, { status: 403 });
    }
    const parsed = createSchema.parse(await req.json());
    const lock = await lockFinancePeriodPostgres({ ...parsed, lockedByUserId: user.id });
    return NextResponse.json({ ok: true, lock }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[finance/period-locks] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

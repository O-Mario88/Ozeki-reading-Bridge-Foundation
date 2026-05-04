import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  clearCategoryPostgres,
  DATA_MANAGEMENT_CATEGORIES,
} from "@/lib/server/postgres/repositories/data-management";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_KEYS = DATA_MANAGEMENT_CATEGORIES.map((c) => c.key) as [string, ...string[]];

const bodySchema = z.object({
  categoryKey: z.enum(CATEGORY_KEYS),
  confirmation: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Super-admin only." }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const { categoryKey, confirmation } = parsed.data;
    const category = DATA_MANAGEMENT_CATEGORIES.find((c) => c.key === categoryKey);
    if (!category) {
      return NextResponse.json({ error: "Unknown category." }, { status: 400 });
    }

    // The expected confirmation phrase is the category label typed exactly.
    if (confirmation !== category.label) {
      return NextResponse.json(
        { error: `Type "${category.label}" exactly to confirm.` },
        { status: 400 },
      );
    }

    const result = await clearCategoryPostgres(
      categoryKey as typeof CATEGORY_KEYS[number] & Parameters<typeof clearCategoryPostgres>[0],
      user.id,
      user.fullName ?? user.email ?? "Super Admin",
    );

    logger.warn("[admin/data-management] category cleared", {
      actorId: user.id,
      category: categoryKey,
      tablesCleared: result.tablesCleared.length,
      rowsCleared: result.rowsCleared,
    });

    await auditLog({
      actor: user,
      action: "bulk_delete",
      targetTable: "data_management_clear",
      after: { categoryKey, ...result },
      detail: `Cleared category "${category.label}" — ${result.tablesCleared.length} tables, ${result.rowsCleared} rows`,
      request: req,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error("[admin/data-management/clear] failed", { error: String(err) });
    return NextResponse.json({ error: "Clear failed." }, { status: 500 });
  }
}

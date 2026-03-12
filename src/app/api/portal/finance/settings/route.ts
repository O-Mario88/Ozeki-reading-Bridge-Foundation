import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFinanceSettings, updateFinanceSettingsAsync } from "@/lib/finance-db";
import { requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const settingsSchema = z.object({
  fromEmail: z.string().trim().email().nullable().optional(),
  ccFinanceEmail: z.string().trim().email().nullable().optional(),
  invoicePrefix: z.string().trim().min(3).max(40).optional(),
  receiptPrefix: z.string().trim().min(3).max(40).optional(),
  expensePrefix: z.string().trim().min(3).max(40).optional(),
  categorySubcategories: z.record(z.string(), z.array(z.string())).optional(),
  invoiceEmailTemplate: z.string().trim().min(10).max(5000).optional(),
  receiptEmailTemplate: z.string().trim().min(10).max(5000).optional(),
  paymentInstructions: z.string().trim().max(3000).optional(),
  cashThresholdUgx: z.coerce.number().min(0).optional(),
  cashThresholdUsd: z.coerce.number().min(0).optional(),
  backdateDaysLimit: z.coerce.number().int().min(0).max(3650).optional(),
  allowReceiptMismatchOverride: z.boolean().optional(),
  allowReceiptReuseOverride: z.boolean().optional(),
  outlierMultiplier: z.coerce.number().positive().max(100).optional(),
});

export async function GET() {
  const auth = await requireFinanceSuperAdmin();
  if (auth.error) {
    return auth.error;
  }
  return NextResponse.json({ settings: await getFinanceSettings() });
}

export async function PUT(request: NextRequest) {
  const auth = await requireFinanceSuperAdmin();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const parsed = settingsSchema.parse(await request.json());
    const settings = await updateFinanceSettingsAsync(parsed, auth.actor);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings." },
      { status: 400 },
    );
  }
}

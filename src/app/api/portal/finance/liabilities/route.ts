import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import {
  listFinanceLiabilitiesPostgres,
  createFinanceLiabilityPostgres
} from "@/services/financeService";

export const runtime = "nodejs";

const createSchema = z.object({
  description: z.string().trim().min(2).max(200),
  date: z.string().trim().min(8),
  amount: z.coerce.number().positive(),
  type: z.enum(["loan", "unpaid_expense"]),
});

export async function GET(_request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) return auth.error;

  try {
    const liabilities = await listFinanceLiabilitiesPostgres();
    return NextResponse.json({ liabilities });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list liabilities." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) return auth.error;

  try {
    const payload = createSchema.parse(await request.json());
    
    const liability = await createFinanceLiabilityPostgres({
      description: payload.description,
      date: payload.date,
      amount: payload.amount,
      type: payload.type as "loan" | "unpaid_expense"
    }, auth.actor.id);

    return NextResponse.json({ liability }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create liability." },
      { status: 400 }
    );
  }
}

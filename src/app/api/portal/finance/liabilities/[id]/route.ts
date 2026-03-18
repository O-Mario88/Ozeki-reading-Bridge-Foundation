import { NextRequest, NextResponse } from "next/server";
import { reverseFinanceLiabilityPostgres } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) return auth.error;

  try {
    const { action } = await request.json();
    if (action !== "reverse") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const result = await reverseFinanceLiabilityPostgres(Number(params.id), auth.actor.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reverse liability." },
      { status: 400 }
    );
  }
}

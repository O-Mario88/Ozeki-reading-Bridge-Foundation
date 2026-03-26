import { NextRequest, NextResponse } from "next/server";
import { disposeFinanceAssetPostgres } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const { action, _reason } = await request.json();
    if (action !== "dispose") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const result = await disposeFinanceAssetPostgres(Number(params.id));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispose asset." },
      { status: 400 }
    );
  }
}

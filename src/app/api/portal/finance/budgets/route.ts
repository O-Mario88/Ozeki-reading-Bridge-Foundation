import { NextRequest, NextResponse } from "next/server";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import {
  listFinanceOperationBudgetsPostgres,
  upsertFinanceOperationBudgetPostgres,
  deleteFinanceOperationBudgetPostgres
} from "@/lib/server/postgres/repositories/finance-budgets";
import { auditLog } from "@/lib/server/audit/log";

/* GET — list all operational budgets */
export async function GET(_request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    // We can fetch globally, but typically let's just show all for this prototype
    const budgets = await listFinanceOperationBudgetsPostgres();
    return NextResponse.json({ budgets });
}

/* POST — create or update a full budget */
export async function POST(request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    const body = await request.json();

    try {
        const id = body.id ? Number(body.id) : null;
        
        const record = await upsertFinanceOperationBudgetPostgres({
            title: body.title,
            period: body.period,
            submit: body.submit,
            items: body.items
        }, id, actor.id);

        await auditLog({
          actor: { id: actor.id, name: actor.userName },
          action: id ? "update" : "create",
          targetTable: "finance_operation_budgets",
          targetId: record?.id ?? id,
          after: { title: body.title, period: body.period, submit: body.submit, itemCount: body.items?.length ?? 0 },
          request,
        });

        return NextResponse.json({ budget: record });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
        );
    }
}

/* DELETE — remove a draft budget */
export async function DELETE(request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) throw new Error("Missing budget id");

        await deleteFinanceOperationBudgetPostgres(Number(id));
        await auditLog({
          actor: { id: actor.id, name: actor.userName },
          action: "delete",
          targetTable: "finance_operation_budgets",
          targetId: Number(id),
          request,
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
        );
    }
}

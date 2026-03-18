import { NextRequest, NextResponse } from "next/server";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import {
    allocatePayment,
    deallocatePayment,
    listPaymentAllocations,
    listInvoiceAllocations,
} from "@/services/financeService";

/* GET — list allocations for a payment or invoice */
export async function GET(request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    const url = new URL(request.url);
    const paymentId = url.searchParams.get("paymentId");
    const invoiceId = url.searchParams.get("invoiceId");

    if (paymentId) {
        return NextResponse.json({ allocations: listPaymentAllocations(Number(paymentId)) });
    }
    if (invoiceId) {
        return NextResponse.json({ allocations: listInvoiceAllocations(Number(invoiceId)) });
    }
    return NextResponse.json({ error: "Provide paymentId or invoiceId" }, { status: 400 });
}

/* POST — allocate or deallocate */
export async function POST(request: NextRequest) {
    const { error, actor } = await requireFinanceEditor();
    if (error || !actor) return error!;

    const body = await request.json();
    const action = body.action as string;

    try {
        if (action === "allocate") {
            const allocation = allocatePayment(
                actor,
                Number(body.paymentId),
                Number(body.invoiceId),
                Number(body.amount),
            );
            return NextResponse.json({ allocation });
        }

        if (action === "deallocate") {
            deallocatePayment(actor, Number(body.allocationId));
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 400 },
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listFinanceAssetsPostgres,
  createFinanceAssetPostgres,
  exportFinanceRowsToCsv,
} from "@/services/financeService";
import { csvHeaders, requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2).max(200),
  acquisitionDate: z.string().trim().min(8),
  purchaseValue: z.coerce.number().positive(),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
  usefulLifeMonths: z.coerce.number().int().positive(),
  residualValue: z.coerce.number().nonnegative().default(0),
  depreciationMethod: z.enum(["straight_line", "none"]).default("none"),
});

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const format = request.nextUrl.searchParams.get("format");

  try {
    const assets = await listFinanceAssetsPostgres();

    if (format === "csv") {
      const csv = exportFinanceRowsToCsv(assets, [
        "assetCode",
        "name",
        "acquisitionDate",
        "purchaseValue",
        "currency",
        "usefulLifeMonths",
        "residualValue",
        "depreciationMethod",
        "status",
        "createdAt",
      ]);
      return new NextResponse(csv, { headers: csvHeaders(`finance-assets-${Date.now()}.csv`) });
    }

    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list assets." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const payload = createSchema.parse(await request.json());
    
    // Defaulting vendorId/fundId to null for simplicity on MVP creation
    const asset = await createFinanceAssetPostgres({
      name: payload.name,
      acquisitionDate: payload.acquisitionDate,
      purchaseValue: payload.purchaseValue,
      currency: payload.currency,
      usefulLifeMonths: payload.usefulLifeMonths,
      residualValue: payload.residualValue,
      depreciationMethod: payload.depreciationMethod,
      vendorId: undefined,
      fundId: undefined,
      sourceTxnId: undefined,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create asset." },
      { status: 400 }
    );
  }
}

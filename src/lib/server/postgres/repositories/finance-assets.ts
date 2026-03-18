import { queryPostgres, withPostgresClient } from "../client";

export type FinanceAssetRecord = {
  id: number;
  assetCode: string;
  name: string;
  acquisitionDate: string;
  purchaseValue: number;
  currency: string;
  usefulLifeMonths: number;
  residualValue: number;
  depreciationMethod: "straight_line" | "none";
  vendorId?: number;
  fundId?: number;
  sourceTxnId?: number;
  status: "active" | "disposed";
  createdAt: string;
};

function mapAssetRow(row: Record<string, unknown>): FinanceAssetRecord {
  return {
    id: Number(row.id),
    assetCode: String(row.assetCode),
    name: String(row.name),
    acquisitionDate: String(row.acquisitionDate),
    purchaseValue: Number(row.purchaseValue),
    currency: String(row.currency),
    usefulLifeMonths: Number(row.usefulLifeMonths),
    residualValue: Number(row.residualValue),
    depreciationMethod: String(row.depreciationMethod) as "straight_line" | "none",
    vendorId: row.vendorId ? Number(row.vendorId) : undefined,
    fundId: row.fundId ? Number(row.fundId) : undefined,
    sourceTxnId: row.sourceTxnId ? Number(row.sourceTxnId) : undefined,
    status: String(row.status) as "active" | "disposed",
    createdAt: String(row.createdAt),
  };
}

export async function listFinanceAssetsPostgres() {
  const result = await queryPostgres(`
    SELECT
      id,
      asset_code AS "assetCode",
      name,
      acquisition_date AS "acquisitionDate",
      purchase_value AS "purchaseValue",
      currency,
      useful_life_months AS "usefulLifeMonths",
      residual_value AS "residualValue",
      depreciation_method AS "depreciationMethod",
      vendor_id AS "vendorId",
      fund_id AS "fundId",
      source_txn_id AS "sourceTxnId",
      status,
      created_at AS "createdAt"
    FROM finance_assets
    WHERE status != 'void' -- although check constraint says active/disposed
    ORDER BY acquisition_date DESC, id DESC
  `);
  return result.rows.map((row) => mapAssetRow(row as Record<string, unknown>));
}

export async function createFinanceAssetPostgres(input: Omit<FinanceAssetRecord, "id" | "createdAt" | "status" | "assetCode">) {
  return await withPostgresClient(async (client) => {
    const year = new Date(input.acquisitionDate).getFullYear().toString();
    const prefix = `AST-${year}-`;
    const seqResult = await client.query(
      "SELECT COUNT(*) FROM finance_assets WHERE asset_code LIKE $1",
      [`${prefix}%`],
    );
    const nextSeq = (parseInt(seqResult.rows[0].count) + 1).toString().padStart(4, "0");
    const assetCode = `${prefix}${nextSeq}`;

    const insertResult = await client.query(
      `INSERT INTO finance_assets (
        asset_code, name, acquisition_date, purchase_value, currency,
        useful_life_months, residual_value, depreciation_method,
        vendor_id, fund_id, source_txn_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active'
      ) RETURNING id`,
      [
        assetCode,
        input.name,
        input.acquisitionDate,
        input.purchaseValue,
        input.currency,
        input.usefulLifeMonths,
        input.residualValue,
        input.depreciationMethod,
        input.vendorId || null,
        input.fundId || null,
        input.sourceTxnId || null
      ]
    );

    const assetId = insertResult.rows[0].id;
    const fetchRes = await client.query(
      `SELECT
        id, asset_code AS "assetCode", name, acquisition_date AS "acquisitionDate",
        purchase_value AS "purchaseValue", currency, useful_life_months AS "usefulLifeMonths",
        residual_value AS "residualValue", depreciation_method AS "depreciationMethod",
        vendor_id AS "vendorId", fund_id AS "fundId", source_txn_id AS "sourceTxnId",
        status, created_at AS "createdAt"
      FROM finance_assets WHERE id = $1`,
      [assetId]
    );

    // Optional: Log to GL using `postAssetToGl` (omitted for MVP unless we know how they map "Fixed Assets" in GL)
    return mapAssetRow(fetchRes.rows[0] as Record<string, unknown>);
  });
}

export async function disposeFinanceAssetPostgres(id: number) {
  const res = await queryPostgres("UPDATE finance_assets SET status = 'disposed' WHERE id = $1 RETURNING id", [id]);
  if (res.rowCount === 0) throw new Error("Asset not found");
  return { id, status: 'disposed' };
}

import { queryPostgres, withPostgresClient } from "../client";
import { type FinanceOperationBudget, type FinanceOperationBudgetItem, type FinanceFundRequest, FinanceBudgetStatus } from "@/lib/types";

export async function listFinanceOperationBudgetsPostgres(ownerId?: number): Promise<FinanceOperationBudget[]> {
  const params: unknown[] = [];
  let where = "1=1";
  if (ownerId) {
    where += " AND owner_id = $1";
    params.push(ownerId);
  }

  // Fetch budgets
  const res = await queryPostgres(`
    SELECT * FROM finance_operation_budgets
    WHERE ${where}
    ORDER BY created_at DESC
  `, params);

  const budgets = res.rows.map(mapBudgetRow);

  if (budgets.length === 0) return [];

  // Fetch items
  const itemsRes = await queryPostgres(`
    SELECT * FROM finance_operation_budget_items
    WHERE budget_id = ANY($1)
    ORDER BY id ASC
  `, [budgets.map(b => b.id)]);

  // Fetch requests
  const requestsRes = await queryPostgres(`
    SELECT * FROM finance_fund_requests
    WHERE budget_id = ANY($1)
    ORDER BY submitted_at DESC
  `, [budgets.map(b => b.id)]);

  const itemsMap = itemsRes.rows.reduce<Record<number, FinanceOperationBudgetItem[]>>((acc, row) => {
    const item = mapBudgetItemRow(row);
    if (!acc[item.budgetId]) acc[item.budgetId] = [];
    acc[item.budgetId].push(item);
    return acc;
  }, {});

  const requestsMap = requestsRes.rows.reduce<Record<number, FinanceFundRequest[]>>((acc, row) => {
    const req = mapFundRequestRow(row);
    if (!acc[req.budgetId]) acc[req.budgetId] = [];
    acc[req.budgetId].push(req);
    return acc;
  }, {});

  for (const b of budgets) {
    b.items = itemsMap[b.id] || [];
    b.requests = requestsMap[b.id] || [];
  }

  return budgets;
}

export async function getFinanceOperationBudgetPostgres(budgetId: number): Promise<FinanceOperationBudget | null> {
  const budgetsRes = await queryPostgres(`SELECT * FROM finance_operation_budgets WHERE id = $1`, [budgetId]);
  if (budgetsRes.rowCount === 0) return null;

  const budget = mapBudgetRow(budgetsRes.rows[0]);

  const itemsRes = await queryPostgres(`SELECT * FROM finance_operation_budget_items WHERE budget_id = $1 ORDER BY id ASC`, [budgetId]);
  budget.items = itemsRes.rows.map(mapBudgetItemRow);

  const requestsRes = await queryPostgres(`SELECT * FROM finance_fund_requests WHERE budget_id = $1 ORDER BY submitted_at DESC`, [budgetId]);
  budget.requests = requestsRes.rows.map(mapFundRequestRow);

  return budget;
}

export interface UpsertBudgetPayload {
  title: string;
  period: string;
  submit?: boolean;
  items: Array<{
    category: string;
    description: string;
    quantity?: number;
    unitCost?: number;
    totalCost: number;
  }>;
}

export async function upsertFinanceOperationBudgetPostgres(payload: UpsertBudgetPayload, budgetId: number | null, ownerId: number): Promise<FinanceOperationBudget> {
  const statusToSave: FinanceBudgetStatus = payload.submit ? "submitted" : "draft";

  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      let bId = budgetId;
      if (!bId) {
        // Insert
        const res = await client.query(`
          INSERT INTO finance_operation_budgets (title, period, owner_id, status)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [payload.title, payload.period, ownerId, statusToSave]);
        bId = Number(res.rows[0].id);
      } else {
        // Update (only if draft)
        const checkRes = await client.query(`SELECT status FROM finance_operation_budgets WHERE id = $1 FOR UPDATE`, [bId]);
        if (checkRes.rowCount === 0) throw new Error("Budget not found");
        if (checkRes.rows[0].status !== "draft" && checkRes.rows[0].status !== "returned") {
           throw new Error("Cannot edit a submitted budget");
        }

        await client.query(`
          UPDATE finance_operation_budgets 
          SET title = $1, period = $2, status = $3, updated_at = NOW()
          WHERE id = $4
        `, [payload.title, payload.period, statusToSave, bId]);

        // Wipe old items
        await client.query(`DELETE FROM finance_operation_budget_items WHERE budget_id = $1`, [bId]);
      }

      // Insert new items
      for (const item of payload.items) {
        await client.query(`
          INSERT INTO finance_operation_budget_items (budget_id, category, description, quantity, unit_cost, total_cost)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          bId, item.category, item.description, 
          item.quantity || null, item.unitCost || null, item.totalCost
        ]);
      }

      await client.query("COMMIT");
      const saved = await getFinanceOperationBudgetPostgres(bId);
      if (!saved) throw new Error("Failed to load saved budget");
      return saved;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

export async function deleteFinanceOperationBudgetPostgres(budgetId: number): Promise<void> {
  const checkRes = await queryPostgres(`SELECT status FROM finance_operation_budgets WHERE id = $1`, [budgetId]);
  if (checkRes.rowCount === 0) throw new Error("Budget not found");
  if (checkRes.rows[0].status !== "draft") throw new Error("Only draft budgets can be deleted");

  await queryPostgres(`DELETE FROM finance_operation_budgets WHERE id = $1`, [budgetId]);
}

export async function submitFinanceFundRequestPostgres(budgetId: number, input: { requestedAmount: number }, requesterId: number) {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const budgetRes = await client.query(`SELECT * FROM finance_operation_budgets WHERE id = $1 FOR UPDATE`, [budgetId]);
      if (budgetRes.rowCount === 0) throw new Error("Budget not found");
      const budget = mapBudgetRow(budgetRes.rows[0]);

      if (budget.status === "draft") {
        throw new Error("Cannot request funds from a draft budget");
      }

      // Record the request
      const res = await client.query(`
        INSERT INTO finance_fund_requests (budget_id, requester_id, requested_amount, status)
        VALUES ($1, $2, $3, 'submitted')
        RETURNING *
      `, [budgetId, requesterId, input.requestedAmount]);

      // Natively recalculate requestedAmount on the budget envelope
      await updateOperationBudgetTotals(client, budgetId);
      await client.query("COMMIT");
      return mapFundRequestRow(res.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

// Internal Helper exported downstream
export async function updateOperationBudgetTotals(client: any, budgetId: number) {
  // Sum requests
  const reqRes = await client.query(`
    SELECT 
      COALESCE(SUM(requested_amount), 0) as "totalRequested",
      COALESCE(SUM(approved_amount), 0) as "totalApproved"
    FROM finance_fund_requests
    WHERE budget_id = $1 AND status != 'rejected'
  `, [budgetId]);

  const reqRow = reqRes.rows[0];

  // Sum spending
  const spendRes = await client.query(`
    SELECT COALESCE(SUM(amount), 0) as "totalSpent"
    FROM finance_transactions_ledger
    WHERE budget_id = $1 AND txn_type = 'money_out'
  `, [budgetId]);

  const spendAmount = Number(spendRes.rows[0]?.totalSpent || 0);
  const reqAmount = Number(reqRow?.totalRequested || 0);
  const appAmount = Number(reqRow?.totalApproved || 0);

  // Re-derive overall Status if applicable
  let newStatus = "approved";
  if (reqAmount === 0) newStatus = "submitted"; 
  // Custom logic usually happens on Approval

  await client.query(`
    UPDATE finance_operation_budgets
    SET requested_amount = $1, approved_amount = $2, spent_amount = $3
    WHERE id = $4
  `, [reqAmount, appAmount, spendAmount, budgetId]);
}


// --- Row Mappers --- //

function mapBudgetRow(row: any): FinanceOperationBudget {
  return {
    id: Number(row.id),
    title: row.title,
    period: row.period,
    ownerId: row.owner_id ? Number(row.owner_id) : null,
    status: row.status as FinanceBudgetStatus,
    requestedAmount: Number(row.requested_amount),
    approvedAmount: Number(row.approved_amount),
    spentAmount: Number(row.spent_amount),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapBudgetItemRow(row: any): FinanceOperationBudgetItem {
  return {
    id: Number(row.id),
    budgetId: Number(row.budget_id),
    category: row.category,
    description: row.description,
    quantity: row.quantity !== null ? Number(row.quantity) : undefined,
    unitCost: row.unit_cost !== null ? Number(row.unit_cost) : undefined,
    totalCost: Number(row.total_cost),
    createdAt: row.created_at.toISOString(),
  };
}

function mapFundRequestRow(row: any): FinanceFundRequest {
  return {
    id: Number(row.id),
    budgetId: Number(row.budget_id),
    requesterId: Number(row.requester_id),
    requestedAmount: Number(row.requested_amount),
    approvedAmount: row.approved_amount !== null ? Number(row.approved_amount) : undefined,
    status: row.status as any,
    reviewNotes: row.review_notes,
    reviewedBy: row.reviewed_by ? Number(row.reviewed_by) : undefined,
    submittedAt: row.submitted_at.toISOString(),
    reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : undefined,
  };
}

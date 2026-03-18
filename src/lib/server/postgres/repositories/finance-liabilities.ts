import { queryPostgres } from "../client";
import { createJournalEntry, getAccountIdByCode } from "./finance-v2";

export type FinanceLiabilityRecord = {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  amount: number;
  liabilityType: "loan" | "unpaid_expense";
  status: string;
};

export async function listFinanceLiabilitiesPostgres(): Promise<FinanceLiabilityRecord[]> {
  // We identify liabilities as manual journals with source_type = 'liability'
  const result = await queryPostgres(`
    SELECT
      je.id,
      je.entry_number AS "entryNumber",
      je.entry_date AS "entryDate",
      je.description,
      je.source_id,
      je.status,
      (
        SELECT SUM(jl.credit) 
        FROM finance_journal_lines jl 
        JOIN finance_chart_of_accounts coa ON jl.account_id = coa.id 
        WHERE jl.journal_id = je.id AND coa.account_type = 'liability'
      ) AS "amount"
    FROM finance_journal_entries je
    WHERE je.source_type = 'liability'
    ORDER BY je.entry_date DESC, je.id DESC
  `);
  
  return result.rows.map(row => ({
    id: Number(row.id),
    entryNumber: String(row.entryNumber),
    entryDate: String(row.entryDate),
    description: String(row.description),
    amount: Number(row.amount || 0),
    liabilityType: Number(row.source_id) === 1 ? "loan" : "unpaid_expense",
    status: String(row.status)
  }));
}

export async function createFinanceLiabilityPostgres(input: {
  description: string;
  date: string;
  amount: number;
  type: "loan" | "unpaid_expense";
}, userId: number) {
  const payableAccId = await getAccountIdByCode("2000"); // Accounts Payable
  const cashAccId = await getAccountIdByCode("1000"); // Cash at Bank
  const expAccId = await getAccountIdByCode("6000"); // General Admin

  const debitAccountId = input.type === "loan" ? cashAccId : expAccId;

  return await createJournalEntry(
    {
      entryDate: input.date,
      description: input.description,
      sourceType: "liability",
      sourceId: input.type === "loan" ? 1 : 2, // 1 for loan, 2 for unpaid expense (hacky but works for MVP)
    },
    [
      {
        accountId: debitAccountId,
        debit: input.amount,
        credit: 0,
        fundId: 1, // unrestricted
        description: input.type === "loan" ? "Cash from loan" : "Accrued Expense",
        projectId: null,
        departmentId: null,
        programId: null,
        grantId: null,
        branchId: null,
      },
      {
        accountId: payableAccId,
        debit: 0,
        credit: input.amount,
        fundId: 1,
        description: "Liability registered",
        projectId: null,
        departmentId: null,
        programId: null,
        grantId: null,
        branchId: null,
      }
    ],
    userId
  );
}

export async function reverseFinanceLiabilityPostgres(journalId: number, _userId: number) {
  // Wait, we need to mark it reversed, but MVP is just update status
  const res = await queryPostgres("UPDATE finance_journal_entries SET status = 'reversed' WHERE id = $1 RETURNING id", [journalId]);
  if (res.rowCount === 0) throw new Error("Liability journal not found");
  return { id: journalId, status: 'reversed' };
}

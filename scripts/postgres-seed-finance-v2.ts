import { 
  getPostgresPool, 
  isPostgresConfigured, 
  queryPostgres, 
  withPostgresClient 
} from "../src/lib/server/postgres/client";
import { 
  initializeChartOfAccounts, 
  createJournalEntry, 
  getAccountIdByCode 
} from "../src/lib/server/postgres/repositories/finance-v2";

async function main() {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = getPostgresPool();
  
  // 1. Initial Master Data
  console.log("Seeding Funds, Programs, and Projects...");
  
  // Funds
  const fundResult = await queryPostgres(`
    INSERT INTO finance_funds (code, name, fund_type) 
    VALUES ('GEN', 'General Fund', 'unrestricted'), ('LIT', 'Literacy Program Fund', 'restricted')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const genFundId = fundResult.rows[0].id;
  const litFundId = fundResult.rows[1].id;

  // Programs
  const progResult = await queryPostgres(`
    INSERT INTO finance_programs (code, name) 
    VALUES ('ED', 'Education Support'), ('CB', 'Capacity Building')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const edProgId = progResult.rows[0].id;

  // Projects
  const projResult = await queryPostgres(`
    INSERT INTO finance_projects (code, name, program_id) 
    VALUES ('NB-2026', 'National Bridge 2026', $1)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [edProgId]);
  const nbProjId = projResult.rows[0].id;

  // 2. Initialize COA
  console.log("Initializing Chart of Accounts...");
  await initializeChartOfAccounts(1);

  // 3. Seed a Donation and GL Entry
  console.log("Seeding a donation and linked journal entry...");
  
  const donorResult = await queryPostgres(`
    INSERT INTO finance_contacts (name, contact_type, is_donor)
    VALUES ('Global Literacy Foundation', 'donor', 1)
    RETURNING id
  `);
  const donorId = donorResult.rows[0].id;

  const receiptResult = await queryPostgres(`
    INSERT INTO finance_receipts (
      receipt_number, contact_id, category, received_from, receipt_date, 
      amount_received, payment_method, fund_id, program_id, status, created_by_user_id
    ) VALUES (
      'RCT-2026-000001', $1, 'Donations', 'Global Literacy Foundation', '2026-03-01', 
      1500000, 'bank_transfer', $2, $3, 'issued', 1
    ) RETURNING id
  `, [donorId, litFundId, edProgId]);

  const cashAccId = await getAccountIdByCode("1000");
  const donationAccId = await getAccountIdByCode("4100"); // Grant Income

  await createJournalEntry(
    {
      entryDate: "2026-03-01",
      description: "Initial Grant Receipt: Global Literacy Foundation",
      sourceType: "receipt",
      sourceId: receiptResult.rows[0].id,
    },
    [
      {
        accountId: cashAccId, debit: 1500000, credit: 0, 
        fundId: litFundId, programId: edProgId, projectId: nbProjId,
        departmentId: null, grantId: null, branchId: null, description: "Bank debit"
      },
      {
        accountId: donationAccId, debit: 0, credit: 1500000, 
        fundId: litFundId, programId: edProgId, projectId: nbProjId,
        departmentId: null, grantId: null, branchId: null, description: "Grant income credit"
      }
    ],
    1
  );

  console.log("Seeding complete!");
}

main().catch(console.error).finally(() => getPostgresPool().end());

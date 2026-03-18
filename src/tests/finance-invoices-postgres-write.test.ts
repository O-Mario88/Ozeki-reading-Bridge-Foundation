import assert from "node:assert/strict";
import test from "node:test";
import { isPostgresConfigured, queryPostgres } from "../lib/server/postgres/client";
import { createFinanceInvoicePostgres } from "../lib/server/postgres/repositories/finance-documents";

test(
  "finance invoices correctly map display categories past base category constraints",
  { skip: isPostgresConfigured() ? false : "DATABASE_URL is not configured." },
  async (t) => {
    try {
      await queryPostgres("SELECT 1");
    } catch (error) {
      t.skip("PostgreSQL is not reachable.");
      return;
    }

    const contactResult = await queryPostgres<{ id: number }>(
      `
        SELECT id FROM finance_contacts ORDER BY id ASC LIMIT 1
      `,
    );
    let contactId = Number(contactResult.rows[0]?.id ?? 0);
    
    // Create one if none exists
    if (!contactId) {
      const inserted = await queryPostgres<{ id: number }>(
        `INSERT INTO finance_contacts (name, contact_type) VALUES ('Test Insert', 'donor') RETURNING id`
      );
      contactId = Number(inserted.rows[0]?.id ?? 0);
    }

    const userResult = await queryPostgres<{ id: number }>(
      `
        SELECT id FROM portal_users ORDER BY id ASC LIMIT 1
      `,
    );
    let userId = Number(userResult.rows[0]?.id ?? 0);
    if (!userId) {
       userId = 1;
    }

    // Pass a category that previously failed the CHECK ('Donation' singular, or 'Training')
    const invoice = await createFinanceInvoicePostgres(
      {
        contactId,
        category: "Training", // "Training" is NOT in the database check constraint!
        issueDate: "2026-03-15",
        dueDate: "2026-03-30",
        currency: "UGX",
        lineItems: [
          { description: "Test Item", qty: 2, unitPrice: 500000 },
        ],
      },
      { id: userId },
    );

    assert.ok(invoice.id > 0, "Expected a persisted invoice id.");
    
    const dbInvoice = await queryPostgres<{ category: string, display_category: string }>(
      `SELECT category, display_category FROM finance_invoices WHERE id = $1`, [invoice.id]
    );
    
    assert.equal(dbInvoice.rows[0]?.category, "Contracts", "Expected base category to be mapped to 'Contracts'.");
    assert.equal(dbInvoice.rows[0]?.display_category, "Training", "Expected display category to be 'Training'.");

    // Cleanup generated document to avoid poluting tests
    await queryPostgres(`DELETE FROM finance_invoices WHERE id = $1`, [invoice.id]);
  },
);

import { queryPostgres } from "../client";

/**
 * CRM Repository: Manages the 'Spine' registry for Accounts, Contacts, and Interactions.
 * Implements the 'Spine & Ribs' architecture by linking domain records to CRM entities.
 */


export interface CrmAccount {
  id: string;
  account_name: string;
  account_type: string;
  status: string;
  source_table?: string;
  source_id?: number;
  school_code?: string;
  district?: string;
  parish?: string;
  enrolled_learners?: number;
  total_interactions?: number;
  total_contacts?: number;
  program_status?: string;
}

export interface CrmAccount360 extends CrmAccount {
  interactions: any[];
  contacts: any[];
}

// --- ACCOUNT REGISTRY ---

export async function getCrmAccounts(filters: { type?: string; status?: string } = {}): Promise<CrmAccount[]> {
  let sql = "SELECT * FROM crm_accounts";
  const params: any[] = [];
  const conditions: string[] = [];

  if (filters.type) {
    conditions.push(`account_type = $${params.length + 1}`);
    params.push(filters.type);
  }
  if (filters.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(filters.status);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY account_name ASC";
  const res = await queryPostgres(sql, params);
  return res.rows as CrmAccount[];
}

/**
 * Registers a domain record as a CRM Account if it doesn't exist.
 */
export async function syncCrmAccountFromSource(sourceTable: string, sourceId: number, name: string, type: string) {
  const checkSql = "SELECT id FROM crm_accounts WHERE source_table = $1 AND source_id = $2";
  const existing = await queryPostgres(checkSql, [sourceTable, sourceId]);

  if (existing.rows.length > 0) {
    const updateSql = "UPDATE crm_accounts SET account_name = $1, account_type = $2, updated_at = NOW() WHERE id = $3";
    await queryPostgres(updateSql, [name, type, existing.rows[0].id]);
    return existing.rows[0].id;
  }

  const insertSql = `
    INSERT INTO crm_accounts (account_name, account_type, source_table, source_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const res = await queryPostgres(insertSql, [name, type, sourceTable, sourceId]);
  return res.rows[0].id;
}

// --- CONTACT REGISTRY ---

export async function getCrmContacts(accountId?: string) {
  let sql = "SELECT * FROM crm_contacts";
  const params: any[] = [];

  if (accountId) {
    sql = `
      SELECT c.* 
      FROM crm_contacts c
      JOIN crm_affiliations a ON a.contact_id = c.id
      WHERE a.account_id = $1
    `;
    params.push(accountId);
  }

  sql += " ORDER BY full_name ASC";
  const res = await queryPostgres(sql, params);
  return res.rows;
}

/**
 * Registers a domain person as a CRM Contact.
 */
export async function syncCrmContactFromSource(sourceTable: string, sourceId: number, name: string, type: string, email?: string) {
  const checkSql = "SELECT id FROM crm_contacts WHERE source_table = $1 AND source_id = $2";
  const existing = await queryPostgres(checkSql, [sourceTable, sourceId]);

  if (existing.rows.length > 0) {
    const updateSql = "UPDATE crm_contacts SET full_name = $1, contact_type = $2, email = $3, updated_at = NOW() WHERE id = $4";
    await queryPostgres(updateSql, [name, type, email || null, existing.rows[0].id]);
    return existing.rows[0].id;
  }

  const insertSql = `
    INSERT INTO crm_contacts (full_name, contact_type, source_table, source_id, email)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const res = await queryPostgres(insertSql, [name, type, sourceTable, sourceId, email || null]);
  return res.rows[0].id;
}

// --- 360 DEGREE VIEWS ---

/**
 * Fetches the unified 360-degree view for an account.
 */
export async function getAccount360(crmAccountId: string): Promise<CrmAccount360 | null> {
  const res = await queryPostgres("SELECT * FROM v_organization_360 WHERE crm_account_id = $1", [crmAccountId]);
  if (res.rows.length === 0) return null;

  const account = res.rows[0];

  // Fetch recent interactions
  const interactionsRes = await queryPostgres(`
    SELECT * FROM crm_interactions 
    WHERE account_id = $1 
    ORDER BY activity_date DESC 
    LIMIT 20
  `, [crmAccountId]);

  // Fetch affiliations
  const affiliationsRes = await queryPostgres(`
    SELECT af.*, c.full_name, c.contact_type
    FROM crm_affiliations af
    JOIN crm_contacts c ON af.contact_id = c.id
    WHERE af.account_id = $1
    ORDER BY af.is_primary_contact DESC, c.full_name ASC
  `, [crmAccountId]);

  return {
    ...(account as CrmAccount),
    interactions: interactionsRes.rows,
    contacts: affiliationsRes.rows
  };
}

// --- INTERACTION LOGGING ---

export async function logInteraction(data: {
  accountId?: string;
  contactId?: string;
  type: string;
  subject: string;
  notes?: string;
  date?: string;
  userId: number;
  sourceTable?: string;
  sourceId?: number;
}) {
  const sql = `
    INSERT INTO crm_interactions (
      account_id, contact_id, interaction_type, subject, notes, 
      activity_date, created_by_user_id, source_table, source_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;
  const res = await queryPostgres(sql, [
    data.accountId || null,
    data.contactId || null,
    data.type,
    data.subject,
    data.notes || null,
    data.date || new Date().toISOString(),
    data.userId,
    data.sourceTable || null,
    data.sourceId || null
  ]);
  return res.rows[0].id;
}

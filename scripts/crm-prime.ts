import { queryPostgres } from "../src/lib/server/postgres/client";
import { syncCrmAccountFromSource, syncCrmContactFromSource } from "../src/lib/server/postgres/repositories/crm";

/**
 * CRM Prime Script: Backfills the CRM registry from existing domain tables.
 * This ensures the 'Spine' is populated with current schools, partners, and contacts.
 */
async function primeCrm() {
  console.log("🚀 Starting CRM Spine Priming...");

  // 1. Backfill Schools
  console.log("🏫 Syncing Schools...");
  const schools = await queryPostgres("SELECT id, name FROM schools_directory");
  for (const school of schools.rows) {
    const crmId = await syncCrmAccountFromSource('schools_directory', school.id, school.name, 'School');
    console.log(`   Registered School: ${school.name} (CRM UUID: ${crmId})`);
  }

  // 2. Backfill School Contacts (and create affiliations)
  console.log("👤 Syncing Contacts...");
  const contacts = await queryPostgres(`
    SELECT contact_id, full_name, email, role_title, school_id, category 
    FROM school_contacts
  `);
  for (const contact of contacts.rows) {
    const type = contact.category || 'School Contact';
    const crmContactId = await syncCrmContactFromSource('school_contacts', contact.contact_id, contact.full_name, type, contact.email);
    
    // Create Affiliation
    const accountSql = "SELECT id FROM crm_accounts WHERE source_table = 'schools_directory' AND source_id = $1";
    const accountRes = await queryPostgres(accountSql, [contact.school_id]);
    
    if (accountRes.rows.length > 0) {
      const crmAccountId = accountRes.rows[0].id;
      const affSql = `
        INSERT INTO crm_affiliations (account_id, contact_id, role_title, status)
        VALUES ($1, $2, $3, 'Active')
        ON CONFLICT (account_id, contact_id, role_title) DO NOTHING
      `;
      await queryPostgres(affSql, [crmAccountId, crmContactId, contact.role_title]);
      console.log(`   Affiliated Contact: ${contact.full_name} with School ID ${contact.school_id}`);
    }
  }

  // 3. Backfill Coaching Visits as Interactions
  console.log("📋 Syncing Interactions from Visits...");
  const visits = await queryPostgres(`
    SELECT v.id, v.visit_date, v.visit_type, v.visit_reason, v.school_id, u.full_name as coach_name, v.coach_user_id
    FROM coaching_visits v
    JOIN portal_users u ON v.coach_user_id = u.id
  `);
  for (const visit of visits.rows) {
    const accountRes = await queryPostgres("SELECT id FROM crm_accounts WHERE source_table = 'schools_directory' AND source_id = $1", [visit.school_id]);
    if (accountRes.rows.length > 0) {
      const crmAccountId = accountRes.rows[0].id;
      const interactionSql = `
        INSERT INTO crm_interactions (
          interaction_type, subject, account_id, activity_date, 
          source_table, source_id, created_by_user_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `;
      await queryPostgres(interactionSql, [
        'Visit', 
        `${visit.visit_type}: ${visit.visit_reason}`, 
        crmAccountId, 
        visit.visit_date, 
        'coaching_visits', 
        visit.id, 
        visit.coach_user_id,
        `Coach: ${visit.coach_name}`
      ]);
    }
  }

  console.log("✅ CRM Priming Complete.");
}

primeCrm().catch(console.error);

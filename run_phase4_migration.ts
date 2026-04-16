import { queryPostgres } from "./src/lib/server/postgres/client";

async function runMigration() {
  try {
    await queryPostgres(\`
      ALTER TABLE training_events 
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'in_person',
      ADD COLUMN IF NOT EXISTS funding_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS training_fee_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
      ADD COLUMN IF NOT EXISTS sponsoring_partner_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sponsoring_partner_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
      ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255)
    \`);
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

runMigration();

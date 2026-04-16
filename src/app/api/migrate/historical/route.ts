import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function GET() {
  try {
    console.log("Beginning Hard Historical Migration...");

    // 1. Ensure new columns exist on training_events (Just in case the other route wasn't run)
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

    // 2. Wrap the migration in a transaction
    await queryPostgres('BEGIN');

    // MIGRATION A: From online_training_sessions -> training_events
    console.log("Migrating online_training_sessions...");
    await queryPostgres(\`
      INSERT INTO training_events (
        event_code, delivery_type, title, slug, description, target_audience,
        start_datetime, end_datetime, google_meet_link, google_calendar_event_id, status,
        created_at, updated_at
      )
      SELECT 
        'MIG-' || SUBSTRING(id::text, 1, 4), 'online', title, 'migrated-session-' || id, description, audience,
        start_time, end_time, meet_join_url, calendar_event_id, status,
        created_at, updated_at
      FROM online_training_sessions
      ON CONFLICT DO NOTHING
    \`);

    // MIGRATION B: From recorded_lessons -> training_events
    // Note: recorded_lessons acts more like a static library, but since user requested explicit "those two tables", we merge them.
    console.log("Migrating recorded_lessons...");
    await queryPostgres(\`
      INSERT INTO training_events (
        event_code, delivery_type, title, slug, description, target_audience,
        start_datetime, end_datetime, google_meet_link, google_calendar_event_id, status,
        created_at, updated_at
      )
      SELECT 
        lesson_code, 'online', title, slug, description, teacher_name,
        scheduled_start_time, scheduled_end_time, google_meet_link, google_calendar_event_id, status,
        created_at, updated_at
      FROM recorded_lessons
      ON CONFLICT DO NOTHING
    \`);

    // 3. Drop legacy tables
    console.log("Dropping legacy tables...");
    await queryPostgres('DROP TABLE IF EXISTS online_training_sessions CASCADE');
    await queryPostgres('DROP TABLE IF EXISTS recorded_lessons CASCADE');

    await queryPostgres('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: "Hard migration completed successfully. Legacy tables dropped and normalized into training_events." 
    });

  } catch (e: any) {
    await queryPostgres('ROLLBACK');
    console.error("Migration failed:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function GET() {
  try {
    await queryPostgres(`
      ALTER TABLE training_events 
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'in_person',
      ADD COLUMN IF NOT EXISTS funding_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS training_fee_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
      ADD COLUMN IF NOT EXISTS sponsoring_partner_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sponsoring_partner_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
      ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255)
    `);
    return NextResponse.json({ success: true, message: "Migration applied natively via NextJS." });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

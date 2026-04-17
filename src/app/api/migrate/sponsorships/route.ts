import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function GET() {
  try {
    console.log("Beginning Geospatial Sponsorship Schema Generation (Phase 7)...");
    await queryPostgres('BEGIN');

    // 1. sponsorships
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id SERIAL PRIMARY KEY,
        sponsorship_reference VARCHAR(100) UNIQUE NOT NULL,
        sponsorship_type VARCHAR(100) NOT NULL,
        sponsorship_target_name VARCHAR(255),
        school_id INTEGER,
        district VARCHAR(100),
        sub_region VARCHAR(100),
        region VARCHAR(100),
        sponsorship_focus VARCHAR(255),
        donor_type VARCHAR(100),
        donor_name VARCHAR(255),
        organization_name VARCHAR(255),
        donor_email VARCHAR(255),
        donor_phone VARCHAR(50),
        donor_country VARCHAR(100),
        donor_message TEXT,
        anonymous BOOLEAN DEFAULT false,
        consent_to_updates BOOLEAN DEFAULT true,
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'UGX',
        payment_method VARCHAR(100),
        payment_status VARCHAR(50) DEFAULT 'Pending Payment',
        pesapal_order_tracking_id VARCHAR(255),
        pesapal_merchant_reference VARCHAR(255) UNIQUE,
        internal_reference VARCHAR(255),
        receipt_id INTEGER,
        callback_payload_json JSONB,
        ipn_payload_json JSONB,
        status_response_json JSONB,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. sponsorship_receipts
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS sponsorship_receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        sponsorship_id INTEGER REFERENCES sponsorships(id) ON DELETE CASCADE,
        sponsorship_reference VARCHAR(100),
        donor_name VARCHAR(255),
        donor_email VARCHAR(255),
        sponsorship_type VARCHAR(100),
        sponsorship_target_name VARCHAR(255),
        sponsorship_focus VARCHAR(255),
        amount NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'UGX',
        payment_method VARCHAR(100),
        pesapal_order_tracking_id VARCHAR(255),
        internal_reference VARCHAR(255),
        receipt_pdf_url TEXT,
        issued_at TIMESTAMPTZ DEFAULT NOW(),
        sent_to_email TEXT,
        status VARCHAR(50) DEFAULT 'Issued',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryPostgres('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: "Phase 7 schema successfully deployed. Geospatial sponsorships cleanly instantiated." 
    });

  } catch (e: unknown) {
    await queryPostgres('ROLLBACK');
    console.error("Sponsorship Migration failed:", e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

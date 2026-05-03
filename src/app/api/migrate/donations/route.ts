import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { requireAdminToken } from "@/lib/server/http/admin-auth";

export async function GET(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;
  try {
    console.log("Beginning Philanthropy Schema Generation (Phase 6)...");
    await queryPostgres('BEGIN');

    // 1. donations
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        donation_reference VARCHAR(100) UNIQUE NOT NULL,
        donor_type VARCHAR(100),
        donor_name VARCHAR(255),
        organization_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        country VARCHAR(100),
        district_or_city VARCHAR(100),
        donation_purpose VARCHAR(255),
        supported_school_name VARCHAR(255),
        supported_school_district VARCHAR(100),
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

    // 2. donation_receipts
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS donation_receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        donation_id INTEGER REFERENCES donations(id) ON DELETE CASCADE,
        donation_reference VARCHAR(100),
        donor_name VARCHAR(255),
        donor_email VARCHAR(255),
        amount NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'UGX',
        donation_purpose VARCHAR(255),
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
      message: "Phase 6 schema successfully deployed. Donations subsystem instantiated securely." 
    });

  } catch (e: unknown) {
    await queryPostgres('ROLLBACK');
    console.error("Migration failed:", e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

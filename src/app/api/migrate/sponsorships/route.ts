import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { requireAdminToken } from "@/lib/server/http/admin-auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    await queryPostgres('BEGIN');
    logger.info("[migrate/sponsorships] starting phase-7 sponsorship + donations migration");

    // 1. Core Donations Tracking
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        reference_id VARCHAR(100) UNIQUE NOT NULL,
        donor_name VARCHAR(255) NOT NULL,
        donor_email VARCHAR(255),
        donor_phone VARCHAR(100),
        organization_name VARCHAR(255),
        target_entity_type VARCHAR(100), -- 'School', 'District', 'Region', 'General'
        target_entity_id VARCHAR(255),
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_status VARCHAR(50) DEFAULT 'Pending',
        payment_method VARCHAR(50),  -- e.g. 'Pesapal VIP', 'MTN Mobile Money'
        provider_reference VARCHAR(255),
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    logger.info("[migrate/sponsorships] donations table ready");

    // 2. Sponsorship Contracts (Recurring / Multi-School)
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id SERIAL PRIMARY KEY,
        sponsorship_reference VARCHAR(100) UNIQUE NOT NULL,
        donor_id INTEGER REFERENCES donations(id),
        sponsorship_package VARCHAR(100), -- e.g. 'District Adoption', 'School Literacy Pack'
        start_date DATE,
        end_date DATE,
        active BOOLEAN DEFAULT true,
        total_pledged NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'USD',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Automated Receipt Delivery Log
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS donation_receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        donation_id INTEGER REFERENCES donations(id),
        pdf_url TEXT,
        issued_date TIMESTAMPTZ DEFAULT NOW(),
        email_dispatched BOOLEAN DEFAULT false
      );
    `);
    logger.info("[migrate/sponsorships] donation_receipts table ready");

    await queryPostgres('COMMIT');
    return NextResponse.json({ message: "Phase 7 Migration Completed (Sponsorship Schema)" });

  } catch (error) {
    await queryPostgres('ROLLBACK');
    logger.error("[migrate/sponsorships] failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Sponsorship Pipeline Error", error }, { status: 500 });
  }
}

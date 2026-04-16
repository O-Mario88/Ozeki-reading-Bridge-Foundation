import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function GET() {
  try {
    console.log("Beginning FinTech & Services Schema Generation (Phase 5)...");
    await queryPostgres('BEGIN');

    // 1. service_catalog
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_catalog (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        description TEXT,
        pricing_model VARCHAR(50) NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'UGX',
        included_resources_json JSONB DEFAULT '[]',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed defaults into catalog
    await queryPostgres(`
      INSERT INTO service_catalog (service_name, pricing_model, unit_price, currency)
      SELECT 'Teacher Training', 'per_day', 500000, 'UGX'
      WHERE NOT EXISTS (SELECT 1 FROM service_catalog WHERE service_name = 'Teacher Training');
    `);
    await queryPostgres(`
      INSERT INTO service_catalog (service_name, pricing_model, unit_price, currency)
      SELECT 'Lesson Observation and Coaching', 'per_day', 350000, 'UGX'
      WHERE NOT EXISTS (SELECT 1 FROM service_catalog WHERE service_name = 'Lesson Observation and Coaching');
    `);
    await queryPostgres(`
      INSERT INTO service_catalog (service_name, pricing_model, unit_price, currency)
      SELECT 'Learner Assessment, Analysis, Report and Coaching', 'per_class', 300000, 'UGX'
      WHERE NOT EXISTS (SELECT 1 FROM service_catalog WHERE service_name = 'Learner Assessment, Analysis, Report and Coaching');
    `);

    // 2. service_requests
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id SERIAL PRIMARY KEY,
        request_code VARCHAR(100) UNIQUE NOT NULL,
        school_id INTEGER REFERENCES schools_directory(id),
        requester_name VARCHAR(255),
        requester_role VARCHAR(100),
        requester_phone VARCHAR(50),
        requester_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'New Request',
        estimated_total NUMERIC(12,2) DEFAULT 0,
        final_total NUMERIC(12,2) DEFAULT 0,
        required_deposit_amount NUMERIC(12,2) DEFAULT 0,
        amount_paid NUMERIC(12,2) DEFAULT 0,
        balance NUMERIC(12,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'UGX',
        admin_notes TEXT,
        preferred_dates_json JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. service_request_items
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_request_items (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES service_catalog(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(12,2) NOT NULL,
        total_price NUMERIC(12,2) NOT NULL,
        required_deposit_amount NUMERIC(12,2) NOT NULL,
        service_details_json JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. service_quotations
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_quotations (
        id SERIAL PRIMARY KEY,
        quotation_number VARCHAR(100) UNIQUE NOT NULL,
        service_request_id INTEGER REFERENCES service_requests(id),
        school_id INTEGER REFERENCES schools_directory(id),
        estimated_total NUMERIC(12,2),
        logistics_total NUMERIC(12,2) DEFAULT 0,
        discount_total NUMERIC(12,2) DEFAULT 0,
        final_total NUMERIC(12,2),
        required_deposit_amount NUMERIC(12,2),
        balance_after_deposit NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'UGX',
        payment_terms TEXT,
        validity_date TIMESTAMPTZ,
        status VARCHAR(50) DEFAULT 'Draft',
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. quotation_items
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id SERIAL PRIMARY KEY,
        quotation_id INTEGER REFERENCES service_quotations(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        item_type VARCHAR(100),
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price NUMERIC(12,2),
        total_price NUMERIC(12,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. payment_providers
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS payment_providers (
        id SERIAL PRIMARY KEY,
        provider_name VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        api_base_url VARCHAR(255),
        consumer_key_env_name VARCHAR(255),
        consumer_secret_env_name VARCHAR(255),
        merchant_account VARCHAR(100),
        receiving_number VARCHAR(50),
        currency VARCHAR(10) DEFAULT 'UGX',
        ipn_id VARCHAR(255),
        ipn_url TEXT,
        callback_url TEXT,
        config_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. service_payments
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_payments (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER REFERENCES service_requests(id),
        quotation_id INTEGER REFERENCES service_quotations(id),
        school_id INTEGER REFERENCES schools_directory(id),
        provider VARCHAR(100),
        payment_method VARCHAR(100),
        network VARCHAR(100),
        payer_phone VARCHAR(50),
        receiving_number VARCHAR(50),
        amount_due NUMERIC(12,2),
        required_deposit_amount NUMERIC(12,2),
        amount_requested NUMERIC(12,2),
        amount_paid NUMERIC(12,2) DEFAULT 0,
        balance NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'UGX',
        payment_type VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'Not Initiated',
        pesapal_order_tracking_id VARCHAR(255),
        pesapal_merchant_reference VARCHAR(255) UNIQUE,
        internal_reference VARCHAR(255),
        receipt_id INTEGER,
        callback_payload_json JSONB,
        ipn_payload_json JSONB,
        status_response_json JSONB,
        payment_initiated_at TIMESTAMPTZ,
        payment_confirmed_at TIMESTAMPTZ,
        verified BOOLEAN DEFAULT false,
        verified_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. payment_receipts
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        service_payment_id INTEGER REFERENCES service_payments(id),
        service_request_id INTEGER REFERENCES service_requests(id),
        quotation_id INTEGER REFERENCES service_quotations(id),
        school_id INTEGER REFERENCES schools_directory(id),
        receipt_type VARCHAR(100),
        amount_paid NUMERIC(12,2),
        quotation_total NUMERIC(12,2),
        balance NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'UGX',
        payment_method VARCHAR(100),
        payment_reference VARCHAR(255),
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

    // 9. ozeki_tasks
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS ozeki_tasks (
        id SERIAL PRIMARY KEY,
        task_type VARCHAR(100),
        title VARCHAR(255),
        description TEXT,
        school_id INTEGER REFERENCES schools_directory(id),
        service_request_id INTEGER REFERENCES service_requests(id),
        assigned_to INTEGER,
        due_date TIMESTAMPTZ,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        google_calendar_event_id VARCHAR(255),
        priority VARCHAR(50) DEFAULT 'Normal',
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 10. service_delivery_schedules
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_delivery_schedules (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER REFERENCES service_requests(id),
        school_id INTEGER REFERENCES schools_directory(id),
        assigned_staff_id INTEGER,
        service_date TIMESTAMPTZ,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        venue VARCHAR(255),
        google_calendar_event_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Scheduled',
        internal_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 11. service_delivery_reports
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_delivery_reports (
        id SERIAL PRIMARY KEY,
        service_request_id INTEGER REFERENCES service_requests(id),
        school_id INTEGER REFERENCES schools_directory(id),
        service_type VARCHAR(100),
        delivery_summary TEXT,
        teachers_trained INTEGER,
        classes_observed INTEGER,
        classes_assessed INTEGER,
        learners_assessed INTEGER,
        resources_delivered_json JSONB DEFAULT '[]',
        recommendations TEXT,
        report_file_url TEXT,
        follow_up_needed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 12. service_packages
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS service_packages (
        id SERIAL PRIMARY KEY,
        package_name VARCHAR(255) NOT NULL,
        description TEXT,
        package_items_json JSONB DEFAULT '[]',
        package_price NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'UGX',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 13. school_subscriptions
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS school_subscriptions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools_directory(id),
        plan_name VARCHAR(100),
        billing_cycle VARCHAR(50),
        price NUMERIC(12,2),
        included_services_json JSONB DEFAULT '[]',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        renewal_status VARCHAR(50),
        payment_status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 14. cluster_service_requests
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS cluster_service_requests (
        id SERIAL PRIMARY KEY,
        cluster_name VARCHAR(255),
        district VARCHAR(100),
        participating_schools_json JSONB DEFAULT '[]',
        shared_logistics_cost NUMERIC(12,2),
        status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 15. sponsored_service_support
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS sponsored_service_support (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER,
        partner_name VARCHAR(255),
        school_id INTEGER REFERENCES schools_directory(id),
        service_request_id INTEGER REFERENCES service_requests(id),
        amount_sponsored NUMERIC(12,2),
        services_sponsored_json JSONB DEFAULT '[]',
        report_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryPostgres('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: "Phase 5 schema successfully deployed. 15 new tables instantiated securely." 
    });

  } catch (e: any) {
    await queryPostgres('ROLLBACK');
    console.error("Migration failed:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

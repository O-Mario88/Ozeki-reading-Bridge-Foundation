import { queryPostgres } from "@/lib/server/postgres/client";
import type { PostgresClient } from "@/lib/server/postgres/client";

export type DonationRow = {
  id: number;
  donationReference: string;
  donorType: string | null;
  donorName: string | null;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  districtOrCity: string | null;
  donationPurpose: string | null;
  supportedSchoolName: string | null;
  supportedSchoolDistrict: string | null;
  donorMessage: string | null;
  anonymous: boolean;
  consentToUpdates: boolean;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paymentStatus: string;
  pesapalOrderTrackingId: string | null;
  pesapalMerchantReference: string | null;
  internalReference: string | null;
  receiptId: number | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonationReceiptRow = {
  id: number;
  receiptNumber: string;
  donationId: number | null;
  donationReference: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amount: number;
  currency: string;
  donationPurpose: string | null;
  paymentMethod: string | null;
  pesapalOrderTrackingId: string | null;
  internalReference: string | null;
  receiptPdfUrl: string | null;
  issuedAt: string;
  sentToEmail: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function getDonationByReferencePostgres(ref: string): Promise<DonationRow | null> {
  const res = await queryPostgres(
    `SELECT
       id, donation_reference AS "donationReference", donor_type AS "donorType",
       donor_name AS "donorName", organization_name AS "organizationName",
       email, phone, country, district_or_city AS "districtOrCity",
       donation_purpose AS "donationPurpose", supported_school_name AS "supportedSchoolName",
       supported_school_district AS "supportedSchoolDistrict", donor_message AS "donorMessage",
       anonymous, consent_to_updates AS "consentToUpdates", amount::numeric AS amount,
       currency, payment_method AS "paymentMethod", payment_status AS "paymentStatus",
       pesapal_order_tracking_id AS "pesapalOrderTrackingId",
       pesapal_merchant_reference AS "pesapalMerchantReference",
       internal_reference AS "internalReference", receipt_id AS "receiptId",
       paid_at::text AS "paidAt", created_at::text AS "createdAt", updated_at::text AS "updatedAt"
     FROM donations WHERE donation_reference = $1 LIMIT 1`,
    [ref],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    donationReference: String(row.donationReference),
    donorType: row.donorType ? String(row.donorType) : null,
    donorName: row.donorName ? String(row.donorName) : null,
    organizationName: row.organizationName ? String(row.organizationName) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    country: row.country ? String(row.country) : null,
    districtOrCity: row.districtOrCity ? String(row.districtOrCity) : null,
    donationPurpose: row.donationPurpose ? String(row.donationPurpose) : null,
    supportedSchoolName: row.supportedSchoolName ? String(row.supportedSchoolName) : null,
    supportedSchoolDistrict: row.supportedSchoolDistrict ? String(row.supportedSchoolDistrict) : null,
    donorMessage: row.donorMessage ? String(row.donorMessage) : null,
    anonymous: Boolean(row.anonymous),
    consentToUpdates: Boolean(row.consentToUpdates),
    amount: Number(row.amount),
    currency: String(row.currency),
    paymentMethod: row.paymentMethod ? String(row.paymentMethod) : null,
    paymentStatus: String(row.paymentStatus),
    pesapalOrderTrackingId: row.pesapalOrderTrackingId ? String(row.pesapalOrderTrackingId) : null,
    pesapalMerchantReference: row.pesapalMerchantReference ? String(row.pesapalMerchantReference) : null,
    internalReference: row.internalReference ? String(row.internalReference) : null,
    receiptId: row.receiptId ? Number(row.receiptId) : null,
    paidAt: row.paidAt ? String(row.paidAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export async function getDonationReceiptPostgres(donationId: number): Promise<DonationReceiptRow | null> {
  const res = await queryPostgres(
    `SELECT
       id, receipt_number AS "receiptNumber", donation_id AS "donationId",
       donation_reference AS "donationReference", donor_name AS "donorName",
       donor_email AS "donorEmail", amount::numeric AS amount, currency,
       donation_purpose AS "donationPurpose", payment_method AS "paymentMethod",
       pesapal_order_tracking_id AS "pesapalOrderTrackingId",
       internal_reference AS "internalReference", receipt_pdf_url AS "receiptPdfUrl",
       issued_at::text AS "issuedAt", sent_to_email AS "sentToEmail",
       status, created_at::text AS "createdAt", updated_at::text AS "updatedAt"
     FROM donation_receipts WHERE donation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [donationId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    receiptNumber: String(row.receiptNumber),
    donationId: row.donationId ? Number(row.donationId) : null,
    donationReference: row.donationReference ? String(row.donationReference) : null,
    donorName: row.donorName ? String(row.donorName) : null,
    donorEmail: row.donorEmail ? String(row.donorEmail) : null,
    amount: Number(row.amount),
    currency: String(row.currency),
    donationPurpose: row.donationPurpose ? String(row.donationPurpose) : null,
    paymentMethod: row.paymentMethod ? String(row.paymentMethod) : null,
    pesapalOrderTrackingId: row.pesapalOrderTrackingId ? String(row.pesapalOrderTrackingId) : null,
    internalReference: row.internalReference ? String(row.internalReference) : null,
    receiptPdfUrl: row.receiptPdfUrl ? String(row.receiptPdfUrl) : null,
    issuedAt: String(row.issuedAt),
    sentToEmail: row.sentToEmail ? String(row.sentToEmail) : null,
    status: String(row.status),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

// Orchestrates the exact insertion parameters.
// Previously wrapped in BEGIN/COMMIT via separate `queryPostgres` calls — but
// those ran on different pooled clients, so the transaction was illusory. This
// is a single INSERT (atomic at the statement level) so the wrapper is unused.
export async function createDonationIntentPostgres(
  payload: Record<string, unknown>,
  externalClient?: PostgresClient,
): Promise<{ id: number; merchantReference: string }> {
  const runner = externalClient ?? { query: queryPostgres };

  const donationRef = `OZK-DON-${new Date().getFullYear()}-${Math.random().toString().substring(2, 8)}`;
  const merchantRef = `OZK-DNRC-${Date.now()}`;

  const res = await runner.query(
    `INSERT INTO donations (
       donation_reference, donor_type, donor_name, organization_name, email, phone, country, district_or_city,
       donation_purpose, supported_school_name, supported_school_district, donor_message,
       anonymous, consent_to_updates, amount, currency, payment_status, pesapal_merchant_reference
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Pending Payment', $17) RETURNING id`,
    [
      donationRef, payload.donorType, payload.donorName, payload.organizationName, payload.email,
      payload.phone, payload.country, payload.districtOrCity, payload.donationPurpose, payload.supportedSchoolName,
      payload.supportedSchoolDistrict, payload.donorMessage, payload.anonymous, payload.consentToUpdates,
      payload.amount, payload.currency || "UGX", merchantRef,
    ],
  );
  return { id: Number(res.rows[0].id), merchantReference: merchantRef };
}

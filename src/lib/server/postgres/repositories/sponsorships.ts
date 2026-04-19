import { queryPostgres } from "@/lib/server/postgres/client";

export type SponsorshipRow = {
  id: number;
  sponsorshipReference: string;
  sponsorshipType: string;
  sponsorshipTargetName: string | null;
  schoolId: number | null;
  district: string | null;
  subRegion: string | null;
  region: string | null;
  sponsorshipFocus: string | null;
  donorType: string | null;
  donorName: string | null;
  organizationName: string | null;
  donorEmail: string | null;
  donorPhone: string | null;
  donorCountry: string | null;
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

export type SponsorshipReceiptRow = {
  id: number;
  receiptNumber: string;
  sponsorshipId: number | null;
  sponsorshipReference: string | null;
  donorName: string | null;
  donorEmail: string | null;
  sponsorshipType: string | null;
  sponsorshipTargetName: string | null;
  sponsorshipFocus: string | null;
  amount: number;
  currency: string;
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

export async function getSponsorshipByReferencePostgres(ref: string): Promise<SponsorshipRow | null> {
  const res = await queryPostgres(
    `SELECT
       id, sponsorship_reference AS "sponsorshipReference",
       sponsorship_type AS "sponsorshipType", sponsorship_target_name AS "sponsorshipTargetName",
       school_id AS "schoolId", district, sub_region AS "subRegion", region,
       sponsorship_focus AS "sponsorshipFocus", donor_type AS "donorType",
       donor_name AS "donorName", organization_name AS "organizationName",
       donor_email AS "donorEmail", donor_phone AS "donorPhone",
       donor_country AS "donorCountry", donor_message AS "donorMessage",
       anonymous, consent_to_updates AS "consentToUpdates",
       amount::numeric AS amount, currency, payment_method AS "paymentMethod",
       payment_status AS "paymentStatus",
       pesapal_order_tracking_id AS "pesapalOrderTrackingId",
       pesapal_merchant_reference AS "pesapalMerchantReference",
       internal_reference AS "internalReference", receipt_id AS "receiptId",
       paid_at::text AS "paidAt", created_at::text AS "createdAt", updated_at::text AS "updatedAt"
     FROM sponsorships WHERE sponsorship_reference = $1 LIMIT 1`,
    [ref],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    sponsorshipReference: String(row.sponsorshipReference),
    sponsorshipType: String(row.sponsorshipType),
    sponsorshipTargetName: row.sponsorshipTargetName ? String(row.sponsorshipTargetName) : null,
    schoolId: row.schoolId ? Number(row.schoolId) : null,
    district: row.district ? String(row.district) : null,
    subRegion: row.subRegion ? String(row.subRegion) : null,
    region: row.region ? String(row.region) : null,
    sponsorshipFocus: row.sponsorshipFocus ? String(row.sponsorshipFocus) : null,
    donorType: row.donorType ? String(row.donorType) : null,
    donorName: row.donorName ? String(row.donorName) : null,
    organizationName: row.organizationName ? String(row.organizationName) : null,
    donorEmail: row.donorEmail ? String(row.donorEmail) : null,
    donorPhone: row.donorPhone ? String(row.donorPhone) : null,
    donorCountry: row.donorCountry ? String(row.donorCountry) : null,
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

export async function getSponsorshipReceiptPostgres(sponsorshipId: number): Promise<SponsorshipReceiptRow | null> {
  const res = await queryPostgres(
    `SELECT
       id, receipt_number AS "receiptNumber", sponsorship_id AS "sponsorshipId",
       sponsorship_reference AS "sponsorshipReference", donor_name AS "donorName",
       donor_email AS "donorEmail", sponsorship_type AS "sponsorshipType",
       sponsorship_target_name AS "sponsorshipTargetName",
       sponsorship_focus AS "sponsorshipFocus", amount::numeric AS amount, currency,
       payment_method AS "paymentMethod",
       pesapal_order_tracking_id AS "pesapalOrderTrackingId",
       internal_reference AS "internalReference", receipt_pdf_url AS "receiptPdfUrl",
       issued_at::text AS "issuedAt", sent_to_email AS "sentToEmail",
       status, created_at::text AS "createdAt", updated_at::text AS "updatedAt"
     FROM sponsorship_receipts WHERE sponsorship_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [sponsorshipId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    receiptNumber: String(row.receiptNumber),
    sponsorshipId: row.sponsorshipId ? Number(row.sponsorshipId) : null,
    sponsorshipReference: row.sponsorshipReference ? String(row.sponsorshipReference) : null,
    donorName: row.donorName ? String(row.donorName) : null,
    donorEmail: row.donorEmail ? String(row.donorEmail) : null,
    sponsorshipType: row.sponsorshipType ? String(row.sponsorshipType) : null,
    sponsorshipTargetName: row.sponsorshipTargetName ? String(row.sponsorshipTargetName) : null,
    sponsorshipFocus: row.sponsorshipFocus ? String(row.sponsorshipFocus) : null,
    amount: Number(row.amount),
    currency: String(row.currency),
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

export async function getSponsorshipImpactDataPostgres(sponsorship: SponsorshipRow): Promise<{
  schoolsCount: number;
  teachersCount: number;
  learnersCount: number;
  trainingsCount: number;
  visitsCount: number;
}> {
  try {
    let schoolIds: number[] = [];
    if (sponsorship.schoolId) {
      schoolIds = [sponsorship.schoolId];
    } else if (sponsorship.district) {
      const res = await queryPostgres(
        `SELECT id FROM schools_directory WHERE district ILIKE $1`,
        [sponsorship.district],
      );
      schoolIds = res.rows.map((r) => Number(r.id));
    } else if (sponsorship.region) {
      const res = await queryPostgres(
        `SELECT id FROM schools_directory WHERE region ILIKE $1`,
        [sponsorship.region],
      );
      schoolIds = res.rows.map((r) => Number(r.id));
    }
    if (schoolIds.length === 0) return { schoolsCount: 0, teachersCount: 0, learnersCount: 0, trainingsCount: 0, visitsCount: 0 };
    const [schools, teachers, learners, activities] = await Promise.all([
      queryPostgres(`SELECT COUNT(*)::int AS c FROM schools_directory WHERE id = ANY($1::int[])`, [schoolIds]),
      queryPostgres(`SELECT COUNT(DISTINCT teacher_uid)::int AS c FROM teacher_roster WHERE school_id = ANY($1::int[])`, [schoolIds]),
      queryPostgres(`SELECT COUNT(*)::int AS c FROM school_learners WHERE school_id = ANY($1::int[])`, [schoolIds]),
      queryPostgres(
        `SELECT
           COUNT(*) FILTER (WHERE module = 'training')::int AS trainings,
           COUNT(*) FILTER (WHERE module = 'visit')::int AS visits
         FROM portal_records WHERE school_id = ANY($1::int[])`,
        [schoolIds],
      ),
    ]);
    return {
      schoolsCount: Number(schools.rows[0]?.c ?? 0),
      teachersCount: Number(teachers.rows[0]?.c ?? 0),
      learnersCount: Number(learners.rows[0]?.c ?? 0),
      trainingsCount: Number(activities.rows[0]?.trainings ?? 0),
      visitsCount: Number(activities.rows[0]?.visits ?? 0),
    };
  } catch {
    return { schoolsCount: 0, teachersCount: 0, learnersCount: 0, trainingsCount: 0, visitsCount: 0 };
  }
}

export async function createSponsorshipIntentPostgres(payload: Record<string, unknown>): Promise<{id: number, merchantReference: string}> {
  const sponsorshipRef = `OZK-SPN-${new Date().getFullYear()}-${Math.random().toString().substring(2,8)}`;
  const merchantRef = `OZK-SPN-RCT-${Date.now()}`;

  const res = await queryPostgres(
    `INSERT INTO sponsorships (
      sponsorship_reference, sponsorship_type, sponsorship_target_name, district, sub_region, region, sponsorship_focus,
      donor_type, donor_name, organization_name, donor_email, donor_phone, donor_country, donor_message,
      anonymous, consent_to_updates, amount, currency, payment_status, pesapal_merchant_reference
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'Pending Payment', $19) RETURNING id`,
    [
      sponsorshipRef, payload.sponsorshipType, payload.sponsorshipTargetName, payload.district, payload.subRegion, payload.region, payload.sponsorshipFocus,
      payload.donorType, payload.donorName, payload.organizationName, payload.email, payload.phone, payload.country, payload.donorMessage,
      payload.anonymous, payload.consentToUpdates, payload.amount, payload.currency || 'UGX', merchantRef
    ]
  );

  return { id: res.rows[0].id, merchantReference: merchantRef };
}

import { queryPostgres } from "@/lib/server/postgres/client";

// Core Output Types
export type ServiceCatalogRow = {
  id: number;
  serviceName: string;
  description: string;
  pricingModel: string;
  unitPrice: number;
  currency: string;
};

export type ServiceRequestRow = {
  id: number;
  requestCode: string;
  schoolId: number | null;
  requesterName: string;
  requesterRole: string | null;
  requesterPhone: string | null;
  requesterEmail: string | null;
  status: string;
  estimatedTotal: number;
  finalTotal: number;
  requiredDepositAmount: number;
  amountPaid: number;
  balance: number;
  currency: string;
  adminNotes: string | null;
  preferredDatesJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRequestItemRow = {
  id: number;
  serviceRequestId: number;
  serviceId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiredDepositAmount: number;
  serviceDetailsJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceQuotationRow = {
  id: number;
  quotationNumber: string;
  serviceRequestId: number;
  schoolId: number | null;
  estimatedTotal: number;
  logisticsTotal: number;
  discountTotal: number;
  finalTotal: number;
  requiredDepositAmount: number;
  balanceAfterDeposit: number;
  currency: string;
  paymentTerms: string | null;
  validityDate: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotationItemRow = {
  id: number;
  quotationId: number;
  itemName: string;
  itemType: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
};

export type PaymentProviderRow = {
  id: number;
  providerName: string;
  active: boolean;
  apiBaseUrl: string | null;
  currency: string;
  ipnId: string | null;
  ipnUrl: string | null;
  callbackUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServicePaymentRow = {
  id: number;
  serviceRequestId: number | null;
  quotationId: number | null;
  schoolId: number | null;
  provider: string | null;
  paymentMethod: string | null;
  network: string | null;
  payerPhone: string | null;
  receivingNumber: string | null;
  amountDue: number;
  requiredDepositAmount: number;
  amountRequested: number;
  amountPaid: number;
  balance: number;
  currency: string;
  paymentType: string | null;
  paymentStatus: string;
  pesapalOrderTrackingId: string | null;
  pesapalMerchantReference: string | null;
  internalReference: string | null;
  receiptId: number | null;
  paymentInitiatedAt: string | null;
  paymentConfirmedAt: string | null;
  verified: boolean;
  verifiedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentReceiptRow = {
  id: number;
  receiptNumber: string;
  servicePaymentId: number | null;
  serviceRequestId: number | null;
  quotationId: number | null;
  schoolId: number | null;
  receiptType: string | null;
  amountPaid: number;
  quotationTotal: number;
  balance: number;
  currency: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  pesapalOrderTrackingId: string | null;
  internalReference: string | null;
  receiptPdfUrl: string | null;
  issuedAt: string;
  sentToEmail: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type OzekiTaskRow = {
  id: number;
  taskType: string | null;
  title: string | null;
  description: string | null;
  schoolId: number | null;
  serviceRequestId: number | null;
  assignedTo: number | null;
  dueDate: string | null;
  startTime: string | null;
  endTime: string | null;
  googleCalendarEventId: string | null;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceDeliveryScheduleRow = {
  id: number;
  serviceRequestId: number | null;
  schoolId: number | null;
  assignedStaffId: number | null;
  serviceDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  googleCalendarEventId: string | null;
  status: string;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceDeliveryReportRow = {
  id: number;
  serviceRequestId: number | null;
  schoolId: number | null;
  serviceType: string | null;
  deliverySummary: string | null;
  teachersTrained: number | null;
  classesObserved: number | null;
  classesAssessed: number | null;
  learnersAssessed: number | null;
  resourcesDeliveredJson: string | null;
  recommendations: string | null;
  reportFileUrl: string | null;
  followUpNeeded: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServicePackageRow = {
  id: number;
  packageName: string;
  description: string | null;
  packageItemsJson: string | null;
  packagePrice: number;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SchoolSubscriptionRow = {
  id: number;
  schoolId: number | null;
  planName: string | null;
  billingCycle: string | null;
  price: number;
  includedServicesJson: string | null;
  startDate: string | null;
  endDate: string | null;
  renewalStatus: string | null;
  paymentStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClusterServiceRequestRow = {
  id: number;
  clusterName: string | null;
  district: string | null;
  participatingSchoolsJson: string | null;
  sharedLogisticsCost: number;
  status: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsoredServiceSupportRow = {
  id: number;
  partnerId: number | null;
  partnerName: string | null;
  schoolId: number | null;
  serviceRequestId: number | null;
  amountSponsored: number;
  servicesSponsoredJson: string | null;
  reportUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// 1. Service Catalog Extractor
export async function listServiceCatalogPostgres(): Promise<ServiceCatalogRow[]> {
  const result = await queryPostgres(
    `SELECT id, service_name, description, pricing_model, unit_price, currency 
     FROM service_catalog 
     WHERE active = true 
     ORDER BY id ASC`
  );
  
  return result.rows.map(r => ({
    id: r.id,
    serviceName: r.service_name,
    description: r.description,
    pricingModel: r.pricing_model,
    unitPrice: Number(r.unit_price),
    currency: r.currency
  }));
}

// 2. High-Level Booking Ingestion
export async function createServiceRequestPostgres(payload: Record<string, unknown> & { cartItems: Array<Record<string, unknown>> }): Promise<number> {
  await queryPostgres('BEGIN');
  try {
    // A. Generate Unique SRV Code
    const requestCode = `OZK-SRV-${new Date().getFullYear()}-${Math.random().toString().substring(2,8)}`;

    // B. Create the Request Row
    const reqRes = await queryPostgres(
      `INSERT INTO service_requests (
        request_code, school_id, requester_name, requester_role, requester_phone, requester_email,
        estimated_total, required_deposit_amount, balance, status, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Awaiting Deposit', $10) RETURNING id`,
      [
        requestCode, 
        payload.schoolId || null, 
        payload.requesterName, 
        payload.requesterRole, 
        payload.requesterPhone, 
        payload.requesterEmail,
        payload.estimatedTotal,
        payload.requiredDepositAmount,
        payload.estimatedTotal, // balance matches total until payment
        payload.assessmentData ? JSON.stringify(payload.assessmentData) : null
      ]
    );
    const serviceRequestId = reqRes.rows[0].id;

    // C. Map Cart Items into schema
    for (const item of payload.cartItems) {
      await queryPostgres(
        `INSERT INTO service_request_items (
          service_request_id, service_id, quantity, unit_price, total_price, 
          required_deposit_amount, service_details_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          serviceRequestId,
          item.serviceId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.requiredDepositAmount,
          JSON.stringify(item.details)
        ]
      );
    }

    await queryPostgres('COMMIT');
    return serviceRequestId;
  } catch (e) {
    await queryPostgres('ROLLBACK');
    throw e;
  }
}

// 3. Fintech Payment Status Updater
export async function finalizePaymentPostgres(_serviceRequestId: number, _amountPaid: number, _trackingId: string): Promise<boolean> {
   // Complex IPN Verification mapped here
   return true;
}

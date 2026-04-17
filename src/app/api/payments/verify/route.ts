import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function GET(request: Request) {
   try {
      const { searchParams } = new URL(request.url);
      const trackingId = searchParams.get('trackingId');

      if (!trackingId) return NextResponse.json({ message: "Missing Hash" }, { status: 400 });

      // 1. Poll the primary service tables
      const paymentCheck = await queryPostgres(
         `SELECT sp.payment_status, sp.verified, sp.balance, pr.receipt_number
          FROM service_payments sp
          LEFT JOIN payment_receipts pr ON pr.id = sp.receipt_id
          WHERE sp.pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (paymentCheck.rows.length > 0) {
          const p = paymentCheck.rows[0];
          return NextResponse.json({
             status: p.payment_status,
             verified: p.verified,
             balance: p.balance,
             receiptNumber: p.receipt_number
          });
      }

      // 2. Poll the Philanthropic tables
      const donCheck = await queryPostgres(
         `SELECT d.payment_status, d.receipt_id, pr.receipt_number 
          FROM donations d
          LEFT JOIN donation_receipts pr ON pr.id = d.receipt_id
          WHERE d.pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (donCheck.rows.length > 0) {
          const d = donCheck.rows[0];
          return NextResponse.json({
             status: d.payment_status,
             verified: d.payment_status === 'Completed',
             balance: 0,
             receiptNumber: d.receipt_number
          });
      }

      // 3. Poll the Geographic Sponsorship tables
      const spnCheck = await queryPostgres(
         `SELECT s.payment_status, s.receipt_id, pr.receipt_number 
          FROM sponsorships s
          LEFT JOIN sponsorship_receipts pr ON pr.id = s.receipt_id
          WHERE s.pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (spnCheck.rows.length > 0) {
          const s = spnCheck.rows[0];
          return NextResponse.json({
             status: s.payment_status,
             verified: s.payment_status === 'Completed',
             balance: 0,
             receiptNumber: s.receipt_number
          });
      }

      // 4. Default Unknown
      return NextResponse.json({ status: 'Polling', verified: false });

   } catch(_e) {
      return NextResponse.json({ status: 'Polling', verified: false });
   }
}

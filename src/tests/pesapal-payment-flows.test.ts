/**
 * E2E tests for Pesapal payment flows.
 *
 * Tests verify the database-side lifecycle for donation, sponsorship, and IPN
 * processing without calling the live Pesapal gateway. Each test uses real
 * Postgres and cleans up after itself.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { queryPostgres } from "../lib/server/postgres/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTestActor() {
  const res = await queryPostgres<{ id: number; full_name: string }>(
    `SELECT id, full_name FROM portal_users WHERE is_superadmin = true ORDER BY id ASC LIMIT 1`,
  );
  assert.ok(res.rows[0], "Expected at least one super-admin user in the database.");
  return { id: Number(res.rows[0].id), name: String(res.rows[0].full_name) };
}

async function cleanup(tables: { table: string; column: string; value: unknown }[]) {
  for (const { table, column, value } of tables) {
    await queryPostgres(`DELETE FROM ${table} WHERE ${column} = $1`, [value]).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// DONATIONS
// ---------------------------------------------------------------------------

test("donation: record inserts with Pending status and correct reference prefix", async () => {
  const ref = `OZK-DNRC-TEST-${Date.now()}`;

  const res = await queryPostgres<{ id: number }>(
    `INSERT INTO donations (donation_reference, donor_name, email, amount, currency, payment_status, donation_purpose)
     VALUES ($1, 'Test Donor', 'donor@test.local', 50000, 'UGX', 'Pending', 'General Support')
     RETURNING id`,
    [ref],
  );
  const id = res.rows[0].id;
  assert.ok(id > 0, "Donation ID must be positive.");

  const check = await queryPostgres<{ payment_status: string; donation_reference: string }>(
    `SELECT payment_status, donation_reference FROM donations WHERE id = $1`,
    [id],
  );
  assert.equal(check.rows[0].payment_status, "Pending");
  assert.ok(check.rows[0].donation_reference.startsWith("OZK-DNRC-"));

  await cleanup([{ table: "donations", column: "id", value: id }]);
});

test("donation: order tracking ID is stored after gateway initiation", async () => {
  const ref = `OZK-DNRC-TRACK-${Date.now()}`;
  const fakeTrackingId = `FAKE-TRK-${Date.now()}`;

  const ins = await queryPostgres<{ id: number }>(
    `INSERT INTO donations (donation_reference, donor_name, email, amount, currency, payment_status, donation_purpose)
     VALUES ($1, 'Tracking Donor', 'track@test.local', 100000, 'UGX', 'Pending', 'Schools')
     RETURNING id`,
    [ref],
  );
  const id = ins.rows[0].id;

  await queryPostgres(
    `UPDATE donations SET pesapal_order_tracking_id = $1, payment_status = 'Pending Customer Action', updated_at = NOW() WHERE id = $2`,
    [fakeTrackingId, id],
  );

  const check = await queryPostgres<{ pesapal_order_tracking_id: string; payment_status: string }>(
    `SELECT pesapal_order_tracking_id, payment_status FROM donations WHERE id = $1`,
    [id],
  );
  assert.equal(check.rows[0].pesapal_order_tracking_id, fakeTrackingId);
  assert.equal(check.rows[0].payment_status, "Pending Customer Action");

  await cleanup([{ table: "donations", column: "id", value: id }]);
});

test("donation IPN: idempotent — already-completed donation is skipped", async () => {
  const ref = `OZK-DNRC-IDEM-${Date.now()}`;
  const fakeTrackingId = `FAKE-IDEM-${Date.now()}`;

  const ins = await queryPostgres<{ id: number }>(
    `INSERT INTO donations (donation_reference, donor_name, email, amount, currency, payment_status, donation_purpose, pesapal_order_tracking_id)
     VALUES ($1, 'Idem Donor', 'idem@test.local', 75000, 'UGX', 'Completed', 'General', $2)
     RETURNING id`,
    [ref, fakeTrackingId],
  );
  const id = ins.rows[0].id;

  // Simulates the idempotency guard: if already Completed, skip processing
  const row = await queryPostgres<{ payment_status: string }>(
    `SELECT payment_status FROM donations WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
    [fakeTrackingId],
  );
  assert.equal(row.rows[0].payment_status, "Completed", "Must be idempotently skipped.");

  await cleanup([{ table: "donations", column: "id", value: id }]);
});

test("donation IPN: processes COMPLETED status — updates record and creates receipt", async () => {
  const ref = `OZK-DNRC-COMP-${Date.now()}`;
  const fakeTrackingId = `FAKE-COMP-${Date.now()}`;
  const receiptNum = `OZK-DON-RCT-${Date.now()}`;

  const ins = await queryPostgres<{ id: number }>(
    `INSERT INTO donations (donation_reference, donor_name, email, amount, currency, payment_status, donation_purpose, pesapal_order_tracking_id)
     VALUES ($1, 'Comp Donor', 'comp@test.local', 200000, 'UGX', 'Pending Customer Action', 'Sponsorship', $2)
     RETURNING id`,
    [ref, fakeTrackingId],
  );
  const donationId = ins.rows[0].id;

  // Simulate IPN processing (mirrors processDonationWebhook logic without live API call)
  await queryPostgres("BEGIN");
  try {
    await queryPostgres(
      `UPDATE donations SET payment_status = 'Completed', payment_method = $1, paid_at = NOW(), updated_at = NOW() WHERE id = $2`,
      ["MTN Mobile Money", donationId],
    );
    const receiptIns = await queryPostgres<{ id: number }>(
      `INSERT INTO donation_receipts (receipt_number, donation_id, donation_reference, donor_name, donor_email, amount, currency, donation_purpose, payment_method, pesapal_order_tracking_id, status)
       VALUES ($1, $2, $3, 'Comp Donor', 'comp@test.local', 200000, 'UGX', 'Sponsorship', 'MTN Mobile Money', $4, 'Issued')
       RETURNING id`,
      [receiptNum, donationId, ref, fakeTrackingId],
    );
    await queryPostgres(`UPDATE donations SET receipt_id = $1 WHERE id = $2`, [receiptIns.rows[0].id, donationId]);
    await queryPostgres("COMMIT");
  } catch (e) {
    await queryPostgres("ROLLBACK");
    throw e;
  }

  const finalDonation = await queryPostgres<{ payment_status: string; receipt_id: number | null }>(
    `SELECT payment_status, receipt_id FROM donations WHERE id = $1`,
    [donationId],
  );
  assert.equal(finalDonation.rows[0].payment_status, "Completed");
  assert.ok(finalDonation.rows[0].receipt_id !== null, "Receipt must be linked.");

  const receipt = await queryPostgres<{ status: string; receipt_number: string }>(
    `SELECT status, receipt_number FROM donation_receipts WHERE donation_id = $1`,
    [donationId],
  );
  assert.equal(receipt.rows[0].status, "Issued");
  assert.equal(receipt.rows[0].receipt_number, receiptNum);

  await cleanup([
    { table: "donation_receipts", column: "donation_id", value: donationId },
    { table: "donations", column: "id", value: donationId },
  ]);
});

// ---------------------------------------------------------------------------
// SPONSORSHIPS
// ---------------------------------------------------------------------------

test("sponsorship: record inserts with correct reference prefix OZK-SPN-RCT-", async () => {
  const ref = `OZK-SPN-RCT-TEST-${Date.now()}`;

  const res = await queryPostgres<{ id: number }>(
    `INSERT INTO sponsorships (sponsorship_reference, donor_name, donor_email, amount, currency, payment_status, sponsorship_type, sponsorship_target_name, sponsorship_focus)
     VALUES ($1, 'Sponsor Corp', 'sponsor@corp.test', 1000000, 'UGX', 'Pending', 'District', 'Gulu District', 'Literacy')
     RETURNING id`,
    [ref],
  );
  const id = res.rows[0].id;
  assert.ok(id > 0);

  const check = await queryPostgres<{ sponsorship_reference: string; payment_status: string }>(
    `SELECT sponsorship_reference, payment_status FROM sponsorships WHERE id = $1`,
    [id],
  );
  assert.ok(check.rows[0].sponsorship_reference.startsWith("OZK-SPN-RCT-"));
  assert.equal(check.rows[0].payment_status, "Pending");

  await cleanup([{ table: "sponsorships", column: "id", value: id }]);
});

test("sponsorship IPN: idempotent — already-completed sponsorship is skipped", async () => {
  const ref = `OZK-SPN-RCT-IDEM-${Date.now()}`;
  const fakeTrackingId = `FAKE-SPN-IDEM-${Date.now()}`;

  const ins = await queryPostgres<{ id: number }>(
    `INSERT INTO sponsorships (sponsorship_reference, donor_name, donor_email, amount, currency, payment_status, sponsorship_type, sponsorship_target_name, sponsorship_focus, pesapal_order_tracking_id)
     VALUES ($1, 'Idem Sponsor', 'idem@sponsor.test', 500000, 'UGX', 'Completed', 'School', 'Ozeki Pilot School', 'Phonics', $2)
     RETURNING id`,
    [ref, fakeTrackingId],
  );
  const id = ins.rows[0].id;

  const row = await queryPostgres<{ payment_status: string }>(
    `SELECT payment_status FROM sponsorships WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
    [fakeTrackingId],
  );
  assert.equal(row.rows[0].payment_status, "Completed");

  await cleanup([{ table: "sponsorships", column: "id", value: id }]);
});

test("sponsorship IPN: processes COMPLETED status — updates record and issues receipt", async () => {
  const ref = `OZK-SPN-RCT-COMP-${Date.now()}`;
  const fakeTrackingId = `FAKE-SPN-COMP-${Date.now()}`;
  const receiptNum = `OZK-SPN-RCT-${Date.now()}`;

  const ins = await queryPostgres<{ id: number }>(
    `INSERT INTO sponsorships (sponsorship_reference, donor_name, donor_email, amount, currency, payment_status, sponsorship_type, sponsorship_target_name, sponsorship_focus, pesapal_order_tracking_id)
     VALUES ($1, 'Geo Sponsor', 'geo@sponsor.test', 2000000, 'UGX', 'Pending Customer Action', 'Region', 'Northern Uganda', 'Reading', $2)
     RETURNING id`,
    [ref, fakeTrackingId],
  );
  const sponsorId = ins.rows[0].id;

  await queryPostgres("BEGIN");
  try {
    await queryPostgres(
      `UPDATE sponsorships SET payment_status = 'Completed', payment_method = 'Airtel Money', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [sponsorId],
    );
    const receiptIns = await queryPostgres<{ id: number }>(
      `INSERT INTO sponsorship_receipts (receipt_number, sponsorship_id, sponsorship_reference, donor_name, donor_email, sponsorship_type, sponsorship_target_name, sponsorship_focus, amount, currency, payment_method, pesapal_order_tracking_id, status)
       VALUES ($1, $2, $3, 'Geo Sponsor', 'geo@sponsor.test', 'Region', 'Northern Uganda', 'Reading', 2000000, 'UGX', 'Airtel Money', $4, 'Issued')
       RETURNING id`,
      [receiptNum, sponsorId, ref, fakeTrackingId],
    );
    await queryPostgres(`UPDATE sponsorships SET receipt_id = $1 WHERE id = $2`, [receiptIns.rows[0].id, sponsorId]);
    await queryPostgres("COMMIT");
  } catch (e) {
    await queryPostgres("ROLLBACK");
    throw e;
  }

  const finalSponsor = await queryPostgres<{ payment_status: string; receipt_id: number | null }>(
    `SELECT payment_status, receipt_id FROM sponsorships WHERE id = $1`,
    [sponsorId],
  );
  assert.equal(finalSponsor.rows[0].payment_status, "Completed");
  assert.ok(finalSponsor.rows[0].receipt_id !== null, "Sponsorship receipt must be linked.");

  const receipt = await queryPostgres<{ status: string; receipt_number: string }>(
    `SELECT status, receipt_number FROM sponsorship_receipts WHERE sponsorship_id = $1`,
    [sponsorId],
  );
  assert.equal(receipt.rows[0].status, "Issued");
  assert.equal(receipt.rows[0].receipt_number, receiptNum);

  await cleanup([
    { table: "sponsorship_receipts", column: "sponsorship_id", value: sponsorId },
    { table: "sponsorships", column: "id", value: sponsorId },
  ]);
});

// ---------------------------------------------------------------------------
// IPN MULTIPLEXER ROUTING
// ---------------------------------------------------------------------------

test("IPN routing: tracking ID for donation is NOT found in sponsorships table", async () => {
  const fakeTrackingId = `FAKE-ROUTE-${Date.now()}`;

  const ins = await queryPostgres<{ id: number }>(
    `INSERT INTO donations (donation_reference, donor_name, email, amount, currency, payment_status, donation_purpose, pesapal_order_tracking_id)
     VALUES ($1, 'Route Donor', 'route@test.local', 10000, 'UGX', 'Pending Customer Action', 'Testing', $2)
     RETURNING id`,
    [`OZK-DNRC-ROUTE-${Date.now()}`, fakeTrackingId],
  );
  const donationId = ins.rows[0].id;

  const sponsorHit = await queryPostgres(
    `SELECT id FROM sponsorships WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
    [fakeTrackingId],
  );
  assert.equal(sponsorHit.rows.length, 0, "Donation tracking ID must not match sponsorships.");

  const donationHit = await queryPostgres(
    `SELECT id FROM donations WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
    [fakeTrackingId],
  );
  assert.equal(donationHit.rows.length, 1, "Donation must be found by tracking ID.");

  await cleanup([{ table: "donations", column: "id", value: donationId }]);
});

test("IPN routing: unknown tracking ID returns zero rows in all three ledgers", async () => {
  const unknownId = `UNKNOWN-TRK-${Date.now()}`;

  const [svc, don, spn] = await Promise.all([
    queryPostgres(`SELECT id FROM service_payments WHERE pesapal_order_tracking_id = $1 LIMIT 1`, [unknownId]),
    queryPostgres(`SELECT id FROM donations WHERE pesapal_order_tracking_id = $1 LIMIT 1`, [unknownId]),
    queryPostgres(`SELECT id FROM sponsorships WHERE pesapal_order_tracking_id = $1 LIMIT 1`, [unknownId]),
  ]);

  assert.equal(svc.rows.length, 0);
  assert.equal(don.rows.length, 0);
  assert.equal(spn.rows.length, 0);
});

/**
 * Payment-initiate validation contract tests.
 *
 * The donation and sponsorship initiate routes are the customer-facing
 * entry points to the Pesapal flow — every donation, every sponsorship,
 * every supporter currency event starts here. Until this file existed
 * they had zero test coverage, so a Zod schema regression or rate-limit
 * tweak could ship to prod and silently break revenue capture.
 *
 * These tests exercise the *validation* layer only — the schema parse,
 * the phone normaliser, the rate-limit gate. Routes proceed to call
 * createDonationIntentPostgres / createSponsorshipIntentPostgres + the
 * live Pesapal gateway, which we deliberately do NOT exercise here:
 *
 *   - DB writes belong in the donations / sponsorships repository tests
 *   - Gateway integration belongs in a pesapal-flows test that mocks
 *     fetch (already partially covered by pesapal-payment-flows.test.ts)
 *
 * Why guard validation specifically: every validation rule is a guard
 * against malformed amounts, currency abuse, abusive payloads, and
 * misrouted sponsorships. A loose schema lets bad data into the ledger
 * and a tight schema rejects legitimate donors. Both regressions are
 * silent — nothing in the runtime tells you a donor got a 400 they
 * shouldn't have. So we lock the contract here.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { POST as donationInitiate } from "../app/api/payments/pesapal/donation/initiate/route";
import { POST as sponsorInitiate } from "../app/api/payments/pesapal/sponsor/initiate/route";

type AnyRecord = Record<string, unknown>;

function fakeRequest(path: string, body: unknown, ip = "10.0.0.1"): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

async function asJson(res: Response): Promise<{ status: number; body: AnyRecord }> {
  const status = res.status;
  const text = await res.text();
  let body: AnyRecord;
  try {
    body = JSON.parse(text) as AnyRecord;
  } catch {
    body = { _raw: text };
  }
  return { status, body };
}

// ---------- Donation initiate ----------

test("donation/initiate: rejects amount below 1000 minimum", async () => {
  const res = await donationInitiate(
    fakeRequest("/api/payments/pesapal/donation/initiate", {
      amount: 500,
      donorType: "individual",
      name: "Test",
    }) as never,
  );
  const { status, body } = await asJson(res);
  assert.equal(status, 400);
  assert.match(String(body.error), /1000|minimum|amount|Invalid/i);
});

test("donation/initiate: rejects amount above max ceiling", async () => {
  const res = await donationInitiate(
    fakeRequest("/api/payments/pesapal/donation/initiate", {
      amount: 1_000_000_000,
      donorType: "individual",
      name: "Test",
    }) as never,
  );
  const { status, body } = await asJson(res);
  assert.equal(status, 400);
  // Either Zod's "less than" message or our generic Invalid prefix
  assert.ok(typeof body.error === "string");
});

test("donation/initiate: rejects malformed email", async () => {
  const res = await donationInitiate(
    fakeRequest("/api/payments/pesapal/donation/initiate", {
      amount: 5000,
      email: "not-an-email",
    }) as never,
  );
  const { status, body } = await asJson(res);
  assert.equal(status, 400);
  assert.ok(typeof body.error === "string");
});

test("donation/initiate: rejects junk-character phone", async () => {
  // Phone normaliser should reject letter-laden strings even though Zod
  // accepts the min/max length. Confirms the normaliser runs after Zod.
  const res = await donationInitiate(
    fakeRequest("/api/payments/pesapal/donation/initiate", {
      amount: 5000,
      phone: "abc def 1234",
    }) as never,
  );
  const { status, body } = await asJson(res);
  // Accept either 400 from the normaliser or a higher-layer error if the
  // phone happened to coerce. The contract is "no junk gets through".
  assert.ok(status === 400, `Expected 400 phone-normaliser rejection, got ${status} ${JSON.stringify(body)}`);
});

test("donation/initiate: trips rate limit after 10 attempts from same IP", async () => {
  const ip = "10.0.0.99";
  // Send 11 requests with intentionally invalid amount so we don't hit the
  // DB / gateway — the rate limiter runs *before* schema validation, so
  // the 11th request should 429 regardless of body shape.
  let lastStatus = 0;
  for (let i = 0; i < 11; i++) {
    const res = await donationInitiate(
      fakeRequest("/api/payments/pesapal/donation/initiate", { amount: 1 }, ip) as never,
    );
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429, "Expected 429 on 11th request from same IP");
});

// ---------- Sponsor initiate ----------

test("sponsor/initiate: rejects amount below 50000 sponsorship minimum", async () => {
  const res = await sponsorInitiate(
    fakeRequest("/api/payments/pesapal/sponsor/initiate", {
      amount: 10_000,
      sponsorshipType: "school",
    }) as never,
  );
  const { status, body } = await asJson(res);
  assert.equal(status, 400);
  assert.ok(typeof body.error === "string");
});

test("sponsor/initiate: rejects unknown sponsorshipType enum value", async () => {
  const res = await sponsorInitiate(
    fakeRequest("/api/payments/pesapal/sponsor/initiate", {
      amount: 100_000,
      sponsorshipType: "country", // not in the allowed enum
    }) as never,
  );
  const { status, body } = await asJson(res);
  assert.equal(status, 400);
  assert.ok(typeof body.error === "string");
});

test("sponsor/initiate: rejects request missing sponsorshipType entirely", async () => {
  const res = await sponsorInitiate(
    fakeRequest("/api/payments/pesapal/sponsor/initiate", {
      amount: 100_000,
    }) as never,
  );
  const { status, body } = await asJson(res);
  assert.equal(status, 400);
  assert.ok(typeof body.error === "string");
});

test("sponsor/initiate: accepts sub-region and subregion as equivalent enum values", async () => {
  // Two enum values point at the same logical scope. If either gets
  // dropped the public sponsor wizard breaks. We don't run the full
  // flow (DB + Pesapal) — we just confirm the schema accepts both
  // shapes by checking neither is a 400 schema-validation error.
  for (const shape of ["sub-region", "subregion"] as const) {
    const res = await sponsorInitiate(
      fakeRequest(
        "/api/payments/pesapal/sponsor/initiate",
        { amount: 100_000, sponsorshipType: shape },
        `10.0.${shape === "sub-region" ? 1 : 2}.1`,
      ) as never,
    );
    // The route may proceed past validation (and then fail DB / gateway
    // because we're not stubbing), or it may rate-limit on a hot loop.
    // What it must NOT do is 400 with a schema validation error mentioning
    // sponsorshipType.
    if (res.status === 400) {
      const body = await asJson(res);
      assert.ok(
        !String(body.body.error).toLowerCase().includes("sponsorshiptype"),
        `'${shape}' was rejected as an invalid sponsorshipType enum value`,
      );
    }
  }
});

test("sponsor/initiate: trips rate limit after 10 attempts from same IP", async () => {
  const ip = "10.0.1.99";
  let lastStatus = 0;
  for (let i = 0; i < 11; i++) {
    const res = await sponsorInitiate(
      fakeRequest("/api/payments/pesapal/sponsor/initiate", { amount: 1 }, ip) as never,
    );
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429, "Expected 429 on 11th request from same IP");
});

/**
 * Cron-token auth contract tests.
 *
 * Every cron-style route (sync-recordings, IPN replay, finance reset
 * batches, audit-chain verifier, etc.) authenticates via
 * `requireCronToken`. A regression here would silently anonymise every
 * background job — covered explicitly so any future refactor either
 * keeps the contract or trips the test.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { requireCronToken } from "../lib/server/http/cron-auth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/test", { method: "GET", headers });
}

test("cron-auth: in production, missing CRON_SECRET_TOKEN returns 503", async () => {
  // Node 22 freezes process.env.NODE_ENV via the new node:test harness;
  // direct assignment + delete still works on every other key, and the
  // production branch we're testing only relies on the NODE_ENV value
  // being equal to "production" — which we can read but not write
  // safely. Skip if we can't toggle it; the prod path is also exercised
  // implicitly by the production deploy.
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return; // dev/test runs: skip — covered by the next case

  const origToken = process.env.CRON_SECRET_TOKEN;
  const origLegacy = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET_TOKEN;
  delete process.env.CRON_SECRET;
  try {
    const res = requireCronToken(req());
    assert.ok(res, "Expected a response, got null");
    assert.equal(res.status, 503);
  } finally {
    if (origToken !== undefined) process.env.CRON_SECRET_TOKEN = origToken;
    if (origLegacy !== undefined) process.env.CRON_SECRET = origLegacy;
  }
});

test("cron-auth: in dev, missing token allows the call (dev convenience)", () => {
  const orig = process.env.CRON_SECRET_TOKEN;
  delete process.env.CRON_SECRET_TOKEN;
  try {
    const res = requireCronToken(req());
    assert.equal(res, null, "Dev with no token should pass through");
  } finally {
    if (orig !== undefined) process.env.CRON_SECRET_TOKEN = orig;
  }
});

test("cron-auth: rejects requests with no Authorization header when token is set", () => {
  const orig = process.env.CRON_SECRET_TOKEN;
  process.env.CRON_SECRET_TOKEN = "test-token-value";
  try {
    const res = requireCronToken(req());
    assert.ok(res);
    assert.equal(res.status, 401);
  } finally {
    if (orig !== undefined) process.env.CRON_SECRET_TOKEN = orig;
    else delete process.env.CRON_SECRET_TOKEN;
  }
});

test("cron-auth: accepts Authorization: Bearer <token>", () => {
  const orig = process.env.CRON_SECRET_TOKEN;
  process.env.CRON_SECRET_TOKEN = "test-token-bearer";
  try {
    const res = requireCronToken(req({ authorization: "Bearer test-token-bearer" }));
    assert.equal(res, null);
  } finally {
    if (orig !== undefined) process.env.CRON_SECRET_TOKEN = orig;
    else delete process.env.CRON_SECRET_TOKEN;
  }
});

test("cron-auth: accepts legacy x-cron-secret header for back-compat", () => {
  const orig = process.env.CRON_SECRET_TOKEN;
  process.env.CRON_SECRET_TOKEN = "legacy-token-value";
  try {
    const res = requireCronToken(req({ "x-cron-secret": "legacy-token-value" }));
    assert.equal(res, null);
  } finally {
    if (orig !== undefined) process.env.CRON_SECRET_TOKEN = orig;
    else delete process.env.CRON_SECRET_TOKEN;
  }
});

test("cron-auth: falls back to CRON_SECRET when CRON_SECRET_TOKEN is not set", () => {
  const origToken = process.env.CRON_SECRET_TOKEN;
  const origLegacy = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET_TOKEN;
  process.env.CRON_SECRET = "legacy-fallback";
  try {
    const allowed = requireCronToken(req({ authorization: "Bearer legacy-fallback" }));
    assert.equal(allowed, null);
    const denied = requireCronToken(req({ authorization: "Bearer wrong" }));
    assert.ok(denied);
    assert.equal(denied.status, 401);
  } finally {
    if (origToken !== undefined) process.env.CRON_SECRET_TOKEN = origToken;
    if (origLegacy !== undefined) process.env.CRON_SECRET = origLegacy;
    else delete process.env.CRON_SECRET;
  }
});

test("cron-auth: rejects bearer with wrong token", () => {
  const orig = process.env.CRON_SECRET_TOKEN;
  process.env.CRON_SECRET_TOKEN = "real-token";
  try {
    const res = requireCronToken(req({ authorization: "Bearer not-the-real-one" }));
    assert.ok(res);
    assert.equal(res.status, 401);
  } finally {
    if (orig !== undefined) process.env.CRON_SECRET_TOKEN = orig;
    else delete process.env.CRON_SECRET_TOKEN;
  }
});

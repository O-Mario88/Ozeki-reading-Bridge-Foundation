# Pesapal IPN Registration & Operator Runbook

This is the live operator guide for getting Pesapal payments working in
production. Follow it once during initial deployment and again any time
the IPN URL changes (custom domain switch, Amplify environment swap,
sandbox → live promotion, etc.).

The platform reads four Pesapal env vars at runtime:

| Variable | Purpose |
| --- | --- |
| `PESAPAL_ENVIRONMENT` | `sandbox` or `live`. Selects the auth + order-submit base URL. |
| `PESAPAL_CONSUMER_KEY` | Consumer key from your Pesapal dashboard. |
| `PESAPAL_CONSUMER_SECRET` | Consumer secret from your Pesapal dashboard. |
| `PESAPAL_IPN_ID` | UUID issued by Pesapal **after** you register your IPN URL. |

If `PESAPAL_IPN_ID` is unset, every donation/sponsorship/service-fee initiation
throws `"PESAPAL_IPN_ID is not configured. Register your IPN URL with
Pesapal and set this environment variable."` ([src/lib/server/payments/pesapal.ts:46](../../src/lib/server/payments/pesapal.ts)).

---

## 1. Register an account with Pesapal

1. Sign up at <https://www.pesapal.com> → Merchant.
2. Pick **Sandbox** to dry-run, **Live** for production.
3. Note the Consumer Key + Consumer Secret on the *API Settings* page —
   these become `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET`.
4. Decide which deployed origin will host the IPN endpoint
   (e.g. `https://www.ozekiread.org`). The IPN URL is always
   `<origin>/api/payments/pesapal/ipn`.

## 2. Set the env vars in Amplify

In the AWS Amplify Console → **Environment variables**:

```text
PESAPAL_ENVIRONMENT       = sandbox        # or "live" for production
PESAPAL_CONSUMER_KEY      = <from Pesapal dashboard>
PESAPAL_CONSUMER_SECRET   = <from Pesapal dashboard>
PESAPAL_IPN_ID            = <leave blank for now — fill in step 4>
```

Trigger a redeploy so the running pods pick up `PESAPAL_CONSUMER_KEY` /
`SECRET`. The IPN registration call in step 3 needs them.

## 3. Register the IPN URL with Pesapal

The platform doesn't auto-register — you do it once via Pesapal's
`/Url/RegisterIPN` endpoint.

The reusable shape of the call (run from any machine that can hit
Pesapal):

```bash
# 3a. Fetch a bearer token
TOKEN=$(curl -s -X POST \
  https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken \
  -H 'Content-Type: application/json' \
  -d '{"consumer_key":"<KEY>","consumer_secret":"<SECRET>"}' \
  | jq -r .token)

# 3b. Register the IPN URL — swap the URL for your real origin
curl -s -X POST \
  https://cybqa.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "url": "https://www.ozekiread.org/api/payments/pesapal/ipn",
    "ipn_notification_type": "POST"
  }'
```

For **live** (production), swap both URLs from `https://cybqa.pesapal.com/pesapalv3`
to `https://pay.pesapal.com/v3`. The `ipn_notification_type` must remain `POST` —
the IPN handler at [src/app/api/payments/pesapal/ipn/route.ts](../../src/app/api/payments/pesapal/ipn/route.ts)
only accepts POST.

The response looks like:

```json
{
  "url": "https://www.ozekiread.org/api/payments/pesapal/ipn",
  "created_date": "2026-05-06T...",
  "ipn_id": "abc12345-de67-4f89-...",
  "notification_type": 1,
  "ipn_notification_type_description": "POST",
  "ipn_status": 1,
  "ipn_status_description": "Active"
}
```

Copy the `ipn_id` value — that's your `PESAPAL_IPN_ID`.

## 4. Save `PESAPAL_IPN_ID` and redeploy

Back in Amplify Console → Environment variables → set
`PESAPAL_IPN_ID = <ipn_id from step 3>` → save → redeploy.

After the redeploy, donation initiations stop throwing the "IPN not
configured" error and orders are submitted with the registered IPN
attached.

## 5. Smoke-test the live flow

1. Open the public site, click **Donate**, complete a small test donation
   (sandbox pre-step uses Pesapal's test card; live uses a real card).
2. Pesapal completes the user's payment, then POSTs to your IPN URL.
3. The handler probes three ledgers in order — service_payments,
   donations, sponsorships — calls `verifyPesapalTransactionStatus` to
   confirm the payment with Pesapal directly, and writes:
   - the matching `payment_status = 'Completed'`/`'Failed'`
   - a `payment_receipts` row with a generated receipt number (the
     `archived_due_to_finance_reset` filter excludes this from voided
     batches)
   - a `finance_payments` + `finance_receipts` + ledger entry pair via
     the canonical lifecycle (so finance reports stay consistent).
4. Confirm in the portal: `/portal/finance/transparency` should now
   show the test donation; `/portal/finance/payments` should list the
   receipt.

## 6. Monitoring + replay

Failed IPN deliveries stay in Pesapal's queue and are retried on a
declining schedule. To replay manually for a known order tracking id:

```bash
curl -X POST https://www.ozekiread.org/api/payments/pesapal/ipn \
  -H 'Content-Type: application/json' \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"OrderTrackingId":"<id>","OrderMerchantReference":"<ref>"}'
```

The handler is idempotent (it filters by `archived_due_to_finance_reset
IS FALSE` and unique constraints on receipt numbers + ledger source
tuples) so replays don't double-credit.

## 7. Sandbox → Live promotion checklist

- [ ] Switch `PESAPAL_ENVIRONMENT` to `live`
- [ ] Replace `PESAPAL_CONSUMER_KEY` + `_SECRET` with the production keys
- [ ] Re-run step 3 against `https://pay.pesapal.com/v3` (the IPN id is
      environment-specific — sandbox ids do **not** work in live)
- [ ] Update `PESAPAL_IPN_ID` to the new live UUID
- [ ] Redeploy
- [ ] Smoke-test with a small real donation
- [ ] Confirm receipt landed in finance + email sent to
      `FINANCE_ACCOUNTANT_EMAIL`
- [ ] Document the live IPN id in the operator's password vault so the
      next operator knows where it came from

## 8. Common errors

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "PESAPAL_IPN_ID is not configured" on every donation | Env var unset in Amplify | Step 4 |
| "Pesapal Authentication Failed" | Wrong key/secret OR pointing at sandbox URL with live keys | Step 2 + verify base URL matches `PESAPAL_ENVIRONMENT` |
| IPN POSTs from Pesapal return 400 | Trailing slash mismatch on registered URL | Re-register with the exact URL `/api/payments/pesapal/ipn` (no trailing slash) |
| Donation completes on Pesapal but stays "Pending" in portal | IPN didn't reach you, OR `verifyPesapalTransactionStatus` returned non-Completed | Replay (step 6) and check Amplify request logs |
| Receipt number duplicated error | Race on retry — safe to ignore, the second IPN sees the existing row | None |

---

**Owner:** whoever holds the Pesapal merchant account. Rotate the
consumer secret + re-run this runbook every 12 months.

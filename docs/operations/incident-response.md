# Incident Response Playbook

Use this playbook when something is wrong in production and users are
affected. The goal is to *contain*, *diagnose*, and *recover* in that
order. Don't skip to a fix until you've confirmed the symptom.

## 0. Triage in 60 seconds

Before doing anything, answer these three questions:

1. **What is broken?** "Login fails" / "Donations don't complete" /
   "Reports show wrong totals" — be specific. If you can reproduce it in
   your own browser, write down the exact steps.
2. **Who is affected?** All users, or one specific role? Field staff in one
   region? Donors only? Knowing the blast radius decides urgency.
3. **What changed recently?** Open Railway → Deployments and look at the
   last 24 hours. Look at recent migration runs. New things break before
   stable things.

If users are blocked from finishing a donation or login, this is a **P0**
and you should announce in the operator chat before investigating.

## 1. Contain

If the platform is making things worse (e.g., charging users twice,
sending corrupted reports), pause writes:

- **Stop accepting traffic**: Railway → web service → **Settings** →
  Replicas to 0. This returns 502 to users — disruptive but better than
  silent corruption.
- **Stop cron**: Railway → cron service → Pause. Prevents background jobs
  from amplifying the issue.

For most incidents, you do NOT need to stop the service — only do this if
the site is actively making the problem worse with each request.

## 2. Diagnose

### Symptom: site is unreachable

```bash
curl -i https://<your-domain>/api/health/live
```

- 200: Node process is up. Continue with the readiness check.
- 5xx / timeout: Node is down or unreachable. Check Railway → web service →
  **Logs** for crash output, then the **Deployments** tab for the latest
  deploy status.

```bash
curl -i https://<your-domain>/api/health
```

- 200: DB is reachable.
- 503: DB is unreachable from web. Check Postgres service status; the
  internal URL `postgres.railway.internal:5432/railway` only resolves
  inside Railway's private network so connection issues here mean either
  the Postgres service is down or the `DATABASE_URL` env var was edited.

### Symptom: login broken

1. Reproduce in an incognito window. If you get "Invalid credentials" with
   a known-good password, the seed admin's hash got rotated — re-run the
   bootstrap (`POST /api/migrate/bootstrap`) which is idempotent and will
   re-seed the super-admin row.
2. If you get "Multi-factor authentication is unavailable", `SMTP_HOST` is
   missing in production. Check Railway → web → Variables. Production
   *correctly* refuses privileged login when SMTP is unconfigured (see
   [secret-rotation.md](./secret-rotation.md)).
3. If MFA OTP e-mails don't arrive, check spam first; then verify SMTP
   creds with `swaks` from your laptop.

### Symptom: donation flow broken

1. Hit `GET /api/admin/db-info` — confirm `donations` and `sponsorships`
   tables exist (these come from the runtime `/api/migrate/sponsorships`
   endpoint, see [database-schema-overview.md](./database-schema-overview.md)).
2. Check Pesapal IPN registration: `PESAPAL_IPN_ID` env var must be set in
   Railway. Without it, Pesapal silently rejects callbacks. See
   [pesapal-ipn-runbook.md](./pesapal-ipn-runbook.md).
3. Check the recent rows: `SELECT * FROM donations ORDER BY created_at DESC
   LIMIT 5;` — if `pesapal_order_tracking_id` is set but `paid_at` is null,
   the IPN is not firing. If `pesapal_order_tracking_id` is null, the
   initiate call to Pesapal is failing — check `PESAPAL_CONSUMER_KEY/SECRET`
   and that Pesapal env is `live` not `sandbox`.

### Symptom: reports show wrong numbers

1. Compare to raw SQL: open the relevant `*_repository.ts` file (e.g.,
   `src/lib/server/postgres/repositories/finance.ts`) and copy the SQL it
   runs into psql / Railway query console. If the SQL gives a different
   answer than the report, it's a UI/aggregation bug — file a ticket.
2. If both report and SQL agree but the number is "obviously wrong", the
   underlying data is wrong — somebody entered something they shouldn't
   have. Check the audit log: `/portal/auditor/audit-trail`.

### Symptom: cron jobs not running

See [cron-jobs-reference.md](./cron-jobs-reference.md) → "Common failure
modes" table.

### Symptom: PDF generation failed

`/api/pdf-engine`, finance receipts, training certificates use `pdf-lib`
in-process. If you see "PDF generation failed" in logs, look for:

- Missing logo file referenced from a template — check `assets/branded/`
  exists and is included in the build.
- Out-of-memory: PDF rendering of large reports can OOM small Railway
  plans. Increase the plan or paginate the report.

## 3. Recover

In rough order of escalation:

### Restart

```
Railway → web service → Settings → Restart
```

Solves: stale connections, crashed worker, memory leaks.

### Re-bootstrap schema

```bash
curl -X POST -H "Authorization: Bearer $MIGRATE_TOKEN" \
  https://<your-domain>/api/migrate/bootstrap
```

Solves: missing migrations, drift between schema and code, missing seed
super-admin row. Idempotent.

### Roll back deploy

```
Railway → web service → Deployments → previous green deploy → Redeploy
```

Solves: a recent code change introduced the issue. Verify the previous
deploy was actually healthy before rolling back.

### Restore database

See [backup-and-restore.md](./backup-and-restore.md). Last resort —
rolls back **all** writes since the snapshot.

## 4. Communicate

While you're working:

- Post a status note in the operator chat as soon as you've confirmed an
  incident. Update it when you contain, when you diagnose, when you
  recover.
- If donations are affected, prepare a donor-facing note even if you don't
  send it. Knowing what you'd say helps you decide whether to stop
  payment intake.
- After recovery, write a short timeline (incident time → contained →
  recovered) and what you changed. Save it in this docs folder so the next
  incident has a precedent to learn from.

## 5. Postmortem (next day)

Within 24 hours:

1. Was the root cause a code bug, an env-var issue, an external service
   problem, or operator error?
2. What signal would have caught this earlier? Add it to the cron health
   query or to a monitoring dashboard.
3. What's one defence-in-depth change that would prevent the same class of
   incident? File it as a ticket; don't just hope.

## See also

- [client-onboarding.md](./client-onboarding.md) — first-week orientation
- [cron-jobs-reference.md](./cron-jobs-reference.md) — what runs when
- [backup-and-restore.md](./backup-and-restore.md) — recovery procedures
- [secret-rotation.md](./secret-rotation.md) — credential management
- [pesapal-ipn-runbook.md](./pesapal-ipn-runbook.md) — payment troubleshooting

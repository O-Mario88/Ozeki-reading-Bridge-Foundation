# Cron Jobs Reference

The platform runs background work through a single hourly cron that fans out to
individual job endpoints. This document describes every job, what it does, when
it fires, and how to spot a failure.

## Architecture

A single external scheduler (Railway Cron, GitHub Actions, EasyCron, or any
cURL-capable scheduler) hits **one** URL hourly:

```
GET https://<your-domain>/api/cron/dispatch
Authorization: Bearer <CRON_SECRET_TOKEN>
```

`dispatch` decides which child jobs to run for the current hour/day-of-week
and fans out to them in parallel. Every child job is independently
authenticated with the same token, so they can also be triggered manually for
testing.

## Required environment

| Variable | Purpose |
|---|---|
| `CRON_SECRET_TOKEN` | Bearer token the scheduler must present. Required. |
| `CRON_SECRET` | Fallback name accepted for the same token. |

If neither is set, every cron endpoint returns `401 Unauthorized` and the
scheduler will see only failed runs — that is the intended safe default.

## Job catalogue

Schedule key:
- **always** = runs every hour
- **every 3h** = runs when `hour % 3 === 0` (00, 03, 06, 09, 12, 15, 18, 21 UTC)
- **daily 06:00 UTC** = runs once per day at 06:00 UTC
- **Mondays 06:00 UTC** = runs once per week

| Job | Schedule | What it does | Failure signal |
|---|---|---|---|
| `process-events` | always | Drains the platform-events outbox; sends queued e-mails, audit notifications, and webhook deliveries (limit 50 per tick). | `platform_events.status` rows stuck in `pending` for >2 hours |
| `sync-recordings` | always | Fetches new recorded-lesson metadata from the upstream provider; updates `recorded_lessons` rows. | `recorded_lessons.last_sync_at` older than 2 hours |
| `refresh-kpis` | every 3h | Recomputes the home-dashboard KPI snapshot tables (`kpi_snapshots`, etc.). | KPI cards show stale `as_of` timestamps |
| `digest-daily` | daily 06:00 UTC | Sends the 24-hour digest e-mail to admin/ME users. | No e-mail in inbox; check `digest_runs` table |
| `auto-issue-certificates` | daily 06:00 UTC | Issues training certificates to learners who reached attendance + assessment thresholds. | `training_certificates` not appearing for graduated learners |
| `digest-weekly` | Mondays 06:00 UTC | 168-hour digest variant for week-in-review reporting. | Same as digest-daily |
| `emis-sync` | (separate schedule) | Pulls EMIS roster + pushes outcomes. **Disabled unless `EMIS_ENABLED=true`.** | `emis_sync_runs` last row status `failed` |
| `gsc-sync` | (separate schedule) | Google Search Console traffic sync for marketing dashboards. Only runs if Google credentials are configured. | `gsc_sync_runs` empty after schedule fires |
| `clean-idempotency` | (separate schedule) | Purges expired rows from `idempotency_keys` to keep the table small. | Table grows unbounded if not run |
| `verify-audit-chain` | (separate schedule) | Walks the append-only audit log and verifies the hash chain. | Returns `tamper: true` if any row's hash doesn't match |

## Forcing a job manually

`dispatch` accepts a `force=` query string for ad-hoc runs without changing
the clock:

```
GET /api/cron/dispatch?force=kpis      # forces refresh-kpis
GET /api/cron/dispatch?force=daily     # forces digest-daily + auto-issue-certificates
GET /api/cron/dispatch?force=weekly    # forces digest-weekly
```

Or hit the child route directly:

```
curl -H "Authorization: Bearer $CRON_SECRET_TOKEN" \
  https://<your-domain>/api/cron/refresh-kpis
```

## Setting up the scheduler on Railway

Railway has a built-in Cron service. In the project dashboard:

1. **+ New** → **Empty Service** → name it `cron`.
2. **Settings** → **Service Type** → **Cron**.
3. Schedule: `0 * * * *` (top of every hour, UTC).
4. Command:
   ```
   curl -fsS -H "Authorization: Bearer $CRON_SECRET_TOKEN" \
     https://<your-domain>/api/cron/dispatch
   ```
5. Variables: copy `CRON_SECRET_TOKEN` from the `web` service.

For redundancy, you can also point an external uptime monitor (UptimeRobot,
BetterStack, etc.) at the same URL with the bearer header. Two different cron
sources is fine — the jobs are idempotent.

## How to know it's healthy

Run this query weekly (or hook it into a dashboard):

```sql
SELECT
  date_trunc('hour', started_at) AS hour,
  COUNT(*) FILTER (WHERE status = 'success') AS ok,
  COUNT(*) FILTER (WHERE status != 'success') AS failed
FROM cron_run_log
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 168;
```

You should see ~24 rows per day with `failed = 0`. If `failed` is consistently
non-zero for one job, look at its individual log table (`emis_sync_runs`,
`digest_runs`, etc.) for the `summary` column.

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Every job returns 401 | `CRON_SECRET_TOKEN` not set or doesn't match the bearer header | Re-copy the token from Railway → web → Variables |
| `process-events` queue grows | SMTP credentials missing or wrong | Verify `SMTP_*` env vars; check `platform_events.last_error` |
| `digest-daily` runs but no e-mail | SMTP from-address bounces; recipients filtered | Check spam folder, then `SMTP_FROM` config |
| `auto-issue-certificates` issues 0 | Threshold tightened in `teaching_improvement_settings`, or attendance not capturing | Inspect that table's row; verify a known-graduated learner via SQL |
| `refresh-kpis` errors with "relation does not exist" | A migration didn't run on this DB | Re-run `POST /api/migrate/bootstrap` |
| `emis-sync` permanently `disabled` | Expected if `EMIS_ENABLED!=true` | Not a fault — flip the flag only when the EMIS MoU is signed |

## See also

- [client-onboarding.md](./client-onboarding.md) — first-week orientation
- [incident-response.md](./incident-response.md) — playbook for when something breaks
- [pesapal-ipn-runbook.md](./pesapal-ipn-runbook.md) — payment IPN registration

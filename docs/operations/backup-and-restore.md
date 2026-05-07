# Backup & Restore Runbook

This runbook covers Postgres backups for the Railway-hosted production
database and the restore procedure for accidental data loss or schema
corruption. Follow it for every disaster-recovery drill and at least once a
quarter as a smoke test.

## Backup strategy

We rely on two complementary mechanisms:

1. **Railway automatic snapshots** — daily, retained per the project plan.
   This is the primary recovery mechanism for "we lost the database".
2. **Manual SQL dumps** — taken before risky operations (schema migrations,
   bulk imports, finance resets) and stored in the operator's password
   manager. This is the secondary mechanism for "we lost a specific table".

You only need (1) for routine operations. Use (2) when you are about to do
something irreversible.

## Verifying Railway backups are enabled

1. Open https://railway.app, select the project (`overflowing-victory`).
2. Click the **Postgres** service tile.
3. Open the **Backups** tab.
4. Confirm:
   - **Status**: Enabled
   - **Retention**: at least 7 days (14+ recommended)
   - **Last successful**: within the last 24 hours

If retention is less than 7 days, click **Settings** and increase. If "Last
successful" is older than 24 hours, escalate to Railway support — backups are
their responsibility on the managed Postgres plan.

## Taking a manual dump (before risky changes)

You will need:
- `pg_dump` (install with `brew install postgresql@16` or `apt install postgresql-client-16`)
- The Postgres connection string from Railway — Project → Postgres service →
  **Variables** → `DATABASE_PUBLIC_URL` (the public proxy URL, **not** the
  internal one)

Then:

```bash
# Set the connection string in your shell (do NOT save it to a file)
export DATABASE_URL="postgresql://postgres:****@viaduct.proxy.rlwy.net:NNNN/railway"

# Take a compressed dump
pg_dump --format=custom --no-owner --no-privileges \
  "$DATABASE_URL" \
  > "ozeki-$(date +%Y%m%d-%H%M%S).dump"

# Verify the dump is non-empty and parseable
pg_restore --list "ozeki-*.dump" | head -20
```

Store the resulting `.dump` file in your password manager's secure file
vault, **not** in iCloud / Dropbox / e-mail. Delete the local copy when you
are done.

## Restoring from a Railway snapshot (whole-database recovery)

Use this when: the database is corrupted, a destructive query ran by
mistake, or you need to roll back a failed migration that already applied
partial schema changes.

**This will overwrite the entire production database.** Coordinate with the
operations lead before proceeding.

1. **Open Railway** → project → **Postgres** service → **Backups** tab.
2. Find the snapshot timestamp you want to restore. The list is sorted
   newest-first; pick the most recent snapshot taken **before** the issue
   you are recovering from.
3. Click **Restore** on that row. Railway will:
   - Stop the Postgres service.
   - Replace the volume with the snapshot.
   - Restart Postgres.
   This takes roughly 2–10 minutes depending on database size.
4. Once the Postgres service is healthy (green dot), restart the **web**
   service so it reconnects: web service → **Settings** → **Restart**.
5. Verify the restore:
   - `GET https://<your-domain>/api/health` should return 200.
   - Log into the portal as the seed super-admin and check a recent record
     (e.g., the Schools list) shows the expected pre-incident state.

If the snapshot is older than the most recent good state, you may need to
manually re-apply lost data from your manual dumps, exports, or audit logs.

## Restoring a single table from a manual dump

Use this when: one table is corrupted but the rest of the database is fine.

```bash
# Restore only the schools_directory table from a dump
pg_restore --no-owner --no-privileges \
  --dbname="$DATABASE_URL" \
  --table=schools_directory \
  "ozeki-20260507-103000.dump"
```

If you need to restore the table to a different name (so you can compare
before overwriting), use `pg_restore --table=schools_directory` into a
scratch database first, then `INSERT INTO schools_directory SELECT ...
FROM scratch.schools_directory` once you've verified the data.

## Re-bootstrapping the schema

After any restore, schema and code must agree. Run:

```bash
curl -X POST -H "Authorization: Bearer $MIGRATE_TOKEN" \
  https://<your-domain>/api/migrate/bootstrap
```

The migrations are idempotent so this is safe to run on a healthy DB. The
response includes per-file timing and a `seedSuperAdmin` probe.

Verify with:

```bash
curl -H "Authorization: Bearer $MIGRATE_TOKEN" \
  https://<your-domain>/api/admin/db-info | jq .
```

You should see ~240 tables and non-zero row counts on `portal_users`,
`schools_directory`, etc.

## Quarterly drill

Once per quarter, an operator should:

1. Take a manual dump (above) and store it.
2. Spin up a free Railway Postgres in a scratch project.
3. Restore the dump into it: `pg_restore --dbname=<scratch-url> dump-file`.
4. Run `\dt` (or hit `/api/admin/db-info` against a scratch web deploy
   pointed at it) and confirm table count + a known row.
5. Tear down the scratch project.

This proves the dump is restorable. A backup you've never restored is not a
backup.

## What is NOT backed up

- Uploaded files (school photos, evidence PDFs, training certificates) — if
  these are stored in Railway volumes, they're snapshotted with the
  filesystem. If you migrate to S3 / R2 later, set up a separate S3
  versioning + lifecycle policy.
- Secrets (`.env` values, API keys) — store these in your password manager.
  Railway service variables are not part of the database snapshot.
- E-mail content already sent — those are gone the moment SMTP delivers them.

## Escalation

If you can't recover with the steps above:

1. Contact Railway support with the project ID
   (`bbb048a6-c5a6-46f8-a453-8ee5ee59fe69`) and ask whether an older
   snapshot exists.
2. If you have a manual dump, restore from that even if it loses some hours
   of data.
3. As a last resort, file a support request through the operator e-mail
   distribution list and pause writes (set Railway → web service → Replicas
   to 0) so the broken state doesn't get worse while you investigate.

## See also

- [secret-rotation.md](./secret-rotation.md) — managing the credentials
  used by `pg_dump`
- [incident-response.md](./incident-response.md) — broader incident playbook

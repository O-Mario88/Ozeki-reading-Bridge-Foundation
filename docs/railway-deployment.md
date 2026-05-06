# Railway Deployment Guide

The Ozeki Reading Bridge Foundation platform deploys to Railway as a single
Dockerfile-based service. Railway builds the image, runs a PostgreSQL service
in the same project, and exposes the app over HTTPS via a generated subdomain
(or your custom domain).

## Prerequisites

- A Railway account with a project linked to this GitHub repo
- A Postgres plugin or external Postgres connection string
- Service variables populated from `.env.example`

## Architecture

| Concern | Mechanism |
| --- | --- |
| Build | `Dockerfile` — multi-stage Node 22 → standalone Next.js 15 |
| Start command | `node server.js` (set in `railway.json` and `package.json`) |
| Healthcheck | `GET /api/health/live` — liveness probe, 200 once the Node server is bound. `GET /api/health` is the strict readiness probe and may return 503 if Postgres / SMTP / etc. are not yet wired up |
| Persistence | Railway Volume mounted at `/app/data` |
| Database | Railway Postgres plugin → `DATABASE_URL` injected automatically |
| Secrets | Service Variables in the Railway dashboard |
| Cron | External scheduler hits `GET /api/cron/dispatch` hourly |

## First-Deploy Checklist

### 1. Create the service

1. New service → **Deploy from GitHub** → select this repo
2. Railway detects the `Dockerfile` automatically — no Nixpacks config needed
3. The build uses these stages: `deps` (npm ci) → `builder` (next build) → `runner` (node:22-bookworm-slim with `node server.js`)

### 2. Add Postgres

1. New service in the same project → **Database → Postgres**
2. Railway generates `DATABASE_URL` and injects it into your app service via service-to-service references (use `${{Postgres.DATABASE_URL}}` if you need to reference it manually)
3. SSL is on by default — our `client.ts` auto-detects and uses encrypted connections

### 3. Attach a Volume for uploaded files

The app writes evidence photos, generated PDFs, and queued offline payloads to
`APP_DATA_DIR` (default `/app/data`). Without a volume these are wiped on every
redeploy.

1. Service → **Variables/Volumes** tab → **New Volume**
2. Mount path: `/app/data`
3. Size: start with 5 GB, scale as uploads grow

### 4. Set required service variables

Copy from `.env.example` — everything in the "Required for production deploy"
list of `README.md` must be set:

- `DATABASE_URL` — auto-injected if you used the Postgres plugin
- `NODE_ENV=production`
- `PORTAL_PASSWORD_SALT`, `PORTAL_SESSION_SECRET`, `SECRET_KEY`, `MIGRATE_TOKEN`, `CRON_SECRET`
- `BYPASS_MFA=false` (must be unset or false in production)
- Pesapal: `PESAPAL_ENVIRONMENT`, `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_IPN_ID`
- SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `FINANCE_EMAIL_FROM`
- Google OAuth: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_ALLOWED_DOMAINS`
- Frontend: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `PUBLIC_SITE_HOST`, `ADMIN_PORTAL_HOST`

The Pesapal IPN ID must come from running the IPN registration step — see
[docs/operations/pesapal-ipn-runbook.md](operations/pesapal-ipn-runbook.md).

### 5. Trigger the first build

Railway auto-deploys on push to `main`. To trigger manually: service →
**Deployments** → **Redeploy**.

The first deploy runs `npm run postgres:bootstrap` automatically only if you
add it to the start command — by default the schema is bootstrapped lazily by
the migration endpoint. To prebake on first deploy, run `npm run
postgres:bootstrap` once via Railway's CLI:

```bash
railway run npm run postgres:bootstrap
```

### 6. Configure the cron dispatcher

Railway has cron jobs (Pro plan and above) — create a cron service that
invokes:

```http
GET https://<your-domain>/api/cron/dispatch
Authorization: Bearer <CRON_SECRET>
```

…hourly. Alternatively, use any external cron service (cron-job.org,
EasyCron, GitHub Actions schedule).

### 7. Custom domain

Service → **Settings → Networking → Custom Domain** → add `www.ozekiread.org`
and `admin.ozekiread.org`. Railway generates the DNS records to add at your
registrar.

## Configuration Files

- `Dockerfile` — multi-stage build, runtime user `node`, exposes port 3000
- `railway.json` — startCommand, healthcheckPath, restart policy
- `Procfile` — `web: node server.js` (kept for portability across other
  Procfile-aware platforms)
- `package.json` `start` and `start:standalone` both run `node server.js`

If Railway picks up an old custom start command from the dashboard (e.g.
`npm run start:standalone`), it still resolves to `node server.js` via the
script — but for clarity, leave the Service Settings → Deploy → Custom Start
Command field empty so Railway falls back to `railway.json` and the Dockerfile
CMD.

## Common Pitfalls

- **`MODULE_NOT_FOUND: scripts/start-standalone.mjs`** — your service has a
  stale custom start command. Clear the override in Railway dashboard or wait
  for `package.json` to take effect; both `start` and `start:standalone` now
  point at `node server.js`.
- **`DATABASE_URL is not configured` during build** — Railway only injects
  service-to-service variables at runtime by default. The codebase uses
  `force-dynamic` on every DB-backed public page so the build does not need
  database access. If you add a new DB-backed public page, mark it
  `export const dynamic = "force-dynamic"`.
- **`VOLUME` rejected by Railway** — Railway does not honor Docker `VOLUME`
  directives; persistent disks must be attached via the Volumes tab. The
  Dockerfile already omits `VOLUME` for this reason.
- **PDF generation broken** — we replaced Puppeteer with pdf-lib. No browser
  binary is shipped in the runtime image. If you re-introduce Puppeteer for
  any reason, add the chromium apt-get back to the runner stage.

## Rollback

Service → **Deployments** → pick a previous green deploy → **Redeploy**.
Railway keeps the last 30 deployment images by default.

## Logs and Monitoring

- App logs: Service → **Logs** (live tail)
- Build logs: Service → **Deployments** → click a deployment
- Resource usage: Service → **Metrics** (CPU, memory, network)
- Health: `GET /api/health` returns `{ ok: true, db: { connected: true } }` when ready

## Migration from AWS Amplify

The previous deployment target was AWS Amplify. To clean up after migration:

1. Disconnect the Amplify app from GitHub (Amplify console → App settings →
   General → Disconnect repository) so it stops auto-building.
2. Delete the Amplify app once the Railway deployment is stable.
3. Confirm Route 53 / your DNS provider points apex and `www` records to
   Railway's custom-domain CNAMEs.
4. Drain DNS cache (24–48h) before tearing down the Amplify app.

The repository no longer contains `amplify.yml` or any Amplify-specific build
scripts. The `build:aws` npm script has been removed.

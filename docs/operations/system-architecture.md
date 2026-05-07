# System Architecture

A one-page mental model of how the platform fits together. Use this when
onboarding a new operator or when an incident report asks "where would
that error come from?"

## The picture

```
                            INTERNET
                                │
            ┌───────────────────┴────────────────────┐
            │                                        │
   ozekiread.org (DNS)                  Pesapal sandbox / live
            │                                        │
            ▼                                        │
   ┌─────────────────┐                               │
   │ Railway Edge    │                               │
   │ (TLS, routing)  │                               │
   └────────┬────────┘                               │
            │                                        │
            ▼                                        │
   ┌─────────────────────────────────┐               │
   │ Next.js 15 (App Router)         │◀──── IPN ─────┤
   │   • public site (/)             │               │
   │   • portal (/portal)            │──── init ────▶│
   │   • REST API (/api)             │               │
   │   • PWA + offline form queue    │               │
   │   served from a single          │               │
   │   "web" service on Railway      │               │
   └────┬────┬────────┬───────┬──────┘               │
        │    │        │       │                      │
        │    │        │       │                      │
        ▼    ▼        ▼       ▼                      │
   ┌──────┐ ┌────┐ ┌──────┐ ┌─────────────┐          │
   │ PG   │ │SMTP│ │Google│ │EMIS API     │          │
   │ (RW) │ │    │ │OAuth │ │(opt-in)     │          │
   └──────┘ └────┘ └──────┘ └─────────────┘          │
        ▲                                            │
        │                                            │
   ┌────┴───────┐                                    │
   │ Cron       │                                    │
   │ (Railway   │                                    │
   │  scheduler)│                                    │
   │ hits /api/ │                                    │
   │ cron/      │                                    │
   │ dispatch   │                                    │
   │ hourly     │                                    │
   └────────────┘
```

## What runs where

### Railway

The whole platform is hosted on **Railway**, project name
`overflowing-victory` (project id
`bbb048a6-c5a6-46f8-a453-8ee5ee59fe69`). Three services:

1. **`web`** — the Next.js app. Single Node process per replica, serves
   public site + portal + API + IPN endpoints.
2. **Postgres** (Railway plugin) — the only datastore. Internal URL
   `postgres.railway.internal:5432/railway`, public proxy URL via
   `viaduct.proxy.rlwy.net:NNNN`.
3. **`cron`** (optional) — Railway Cron service that hits
   `/api/cron/dispatch` once per hour. Can be replaced by any external
   scheduler.

### Public domain

`web-production-f8075.up.railway.app` (Railway-generated, always works).
Custom domain `ozekiread.org` is configured but DNS in Squarespace may
not yet be cut over. See `docs/railway-deployment.md`.

### Health endpoints

- `GET /api/health/live` — cheap liveness check, returns 200 once Node
  is bound. **Used by Railway as the deploy gate.**
- `GET /api/health` — readiness check, queries Postgres. Returns 503 if
  the DB is unreachable. Use this for external uptime monitors.

## External services we depend on

| Service | What we use it for | Failure impact |
|---|---|---|
| **Pesapal** (V3) | Donations + service-fee payments | Donations fail; existing data unaffected. Fail-soft. |
| **SMTP provider** (e.g., SendGrid, Postmark, AWS SES) | Password reset OTP, MFA challenges, finance receipts, training certificate delivery | Privileged login blocked in production; user-facing receipts queue up but don't deliver. |
| **Google OAuth** (optional) | "Sign in with Google" for staff, Google Meet auto-creation in scheduler | Affected staff fall back to e-mail/password login. |
| **Google Search Console** (optional) | Marketing dashboards (`gsc-sync` cron) | Marketing reports get stale; nothing else affected. |
| **EMIS API** (opt-in) | Uganda Ministry of Education roster sync | Disabled by default. No impact when off. |
| **Vimeo / YouTube** (passive) | Recorded-lesson hosting | Lessons can't be embedded; metadata still works. |

We deliberately do **not** depend on AWS, Vercel, or any other Cloud
provider. Migrating to a different host is just "deploy the same Docker
image somewhere else and re-point DNS".

## The codebase

All code lives in this repo. Key directories:

```
src/
├── app/                  # Next.js App Router
│   ├── (public-routes)/  # marketing site, /donate, /book-visit, etc.
│   ├── portal/           # staff portal (auth-gated)
│   ├── admin/            # diagnostic endpoints (token-gated)
│   ├── api/              # REST API
│   │   ├── portal/       # auth-gated portal API (~211 routes)
│   │   ├── public/       # public read-only API
│   │   ├── payments/     # Pesapal init + IPN
│   │   ├── auth/         # login, logout, MFA
│   │   ├── cron/         # background jobs
│   │   ├── migrate/      # bootstrap + token-gated migrations
│   │   └── admin/        # token-gated admin diagnostics
│   └── layout.tsx        # root layout, theming, PWA registration
├── components/           # ~245 React components
├── lib/
│   ├── server/
│   │   ├── postgres/
│   │   │   ├── client.ts           # connection pool
│   │   │   └── repositories/       # ~91 SQL-facing repo files
│   │   └── audit/                  # audit log helpers
│   ├── auth.ts                     # session helpers
│   ├── permissions.ts              # role + capability matrix
│   └── logger.ts                   # structured logger
├── services/             # higher-level service layer over repos
└── tests/                # ~26 node:test files

database/postgres/        # 82 idempotent SQL migrations, lex-ordered
docs/                     # this folder
public/                   # static assets, PWA manifest
```

## How a request flows

1. **Browser** → Railway edge → Next.js `web` service.
2. The request hits a route handler in `src/app/api/.../route.ts`.
3. The handler:
   - Authenticates the caller via `getAuthenticatedPortalUser()` (portal
     routes) or `requireCronToken()` / `requireAdminToken()` (cron / admin).
   - Validates the payload with Zod (when applicable).
   - Calls a function in `src/lib/server/postgres/repositories/...` to
     read or mutate Postgres.
   - Logs an audit row via `auditLog(...)` for any mutation.
   - Returns JSON (or PDF for download routes).
4. Postgres is the **only** server-side datastore. There is no Redis, no
   in-process cache (other than `unstable_cache`), no queue. Background
   work is just hourly cron + Postgres advisory locks.

## How a donation flows

```
1. Donor opens /donate, fills the wizard.
2. Frontend POSTs /api/payments/pesapal/donation/initiate.
3. Server stores a row in `donations` (status='pending') and returns
   Pesapal redirect URL.
4. Donor pays on Pesapal's hosted form.
5. Pesapal POSTs to /api/payments/pesapal/ipn (server-to-server).
6. IPN handler verifies the payload, updates `donations.status` and
   issues `donation_receipts`. Idempotent via `idempotency_keys`.
7. Donor is redirected back to /donate/thanks.
```

If step 5 doesn't fire, the donation row stays `pending` until the donor
re-attempts or the operator reconciles manually. See
[pesapal-ipn-runbook.md](./pesapal-ipn-runbook.md).

## How an offline form flows

Field staff often work where there's no signal:

1. Coach opens the portal on their phone (PWA installed earlier).
2. They fill in a coaching-visit form.
3. The form POST is intercepted by the service worker because there's no
   network. It's stored in IndexedDB (Dexie) as a queued mutation.
4. When the device reconnects, the service worker drains the queue,
   replaying each request to the live API.
5. If a replay fails (e.g., conflict), it's surfaced in the portal's
   offline-queue badge and a human resolves it.

## What is NOT in this codebase

- **The marketing CMS** — pages are just React components in
  `src/app/(public-routes)/`, not a CMS.
- **Real-time features** — no WebSockets / SSE. Polling only.
- **A separate admin app** — admin views live under `/portal/superadmin/*`
  and `/admin/*`, served by the same Next.js process.
- **Reverse-proxy or load balancer** — Railway provides edge routing.

## See also

- [database-schema-overview.md](./database-schema-overview.md) — the data layer
- [cron-jobs-reference.md](./cron-jobs-reference.md) — background work
- [incident-response.md](./incident-response.md) — when things break
- [client-onboarding.md](./client-onboarding.md) — first-week orientation
- [docs/railway-deployment.md](../railway-deployment.md) — deploy mechanics

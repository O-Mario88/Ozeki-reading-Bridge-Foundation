# Ozeki Reading Bridge Foundation Web App

Full-stack Next.js web application for Ozeki Reading Bridge Foundation.

## Stack
- Next.js 16 (App Router, TypeScript)
- SQLite (`better-sqlite3`) for backend persistence
- Google Calendar API integration (`googleapis`) for invites and Google Meet links
- Cookie session auth for staff/volunteer portal access
- REST-style API routes for booking, contact, downloads, impact, blog, resources, and portal data entry

## Scalable Architecture Blueprint
- Architecture document:
  - `docs/scalable-platform-architecture.md`
- Supabase migration scaffold (Postgres + RLS + assignment model + core modules):
  - `supabase/migrations/20260215_000001_core_platform.sql`

This project currently runs on SQLite for local delivery speed. The Supabase scaffold is included to support migration to a multi-tenant production architecture with Row Level Security.

## Implemented Website Structure
- Home
- About
- Programs & Services
- Signature Program (`/phonics-training`)
- 1001 Story Project (`/story-project`)
- Impact
- Resources Library (filter/search + lead capture + downloads)
- Blog (categories, search, author profile, TOC on article pages)
- Free Phonics Diagnostic Quiz
- Events & Webinars
- Book a Visit (appointment form)
- Partner With Us
- Contact (form + WhatsApp link)
- Case Studies
- Testimonials
- Partners
- Media
- Transparency
- Academy (premium portal concept page)
- Pricing
- For Teachers
- For Schools
- Portal Sign In (`/portal/login`)
- Training Session Portal (`/portal/training`)

## Dynamic Backend Features
- `POST /api/bookings`:
  Stores school booking requests and sends Google Calendar invite (when configured).
- `POST /api/contacts`:
  Stores school/partner/media/general inquiries.
- `POST /api/downloads`:
  Captures resource leads and download intent.
- `GET /api/impact`:
  Returns live dashboard metrics from training and assessment records.
- `POST /api/newsletter`:
  Captures weekly tip newsletter subscribers.
- `GET /api/blog`:
  Returns blog summaries.
- `GET /api/resources`:
  Returns resource catalog.
- `POST /api/auth/login`:
  Staff/volunteer sign in.
- `POST /api/auth/logout`:
  Staff/volunteer sign out.
- `GET|POST /api/portal/training-sessions`:
  Secure training-session data entry and retrieval.
- `GET|POST /api/portal/assessments`:
  Secure learner-assessment data entry and retrieval.
- `GET|POST /api/portal/online-trainings`:
  Secure online training scheduler with Google Calendar + Google Meet integration.

## Google Meet + Calendar Integration
- Full setup guide:
  - `docs/google-workspace-meet-calendar-setup.md`
- Status endpoint (admin/super-admin):
  - `GET /api/portal/integrations/google/status`
- OAuth helper scripts:
  - `npm run google:auth:url`
  - `npm run google:auth:exchange -- --code=...`
  - `npm run google:status`

SQLite database defaults to `data/app.db` and can be overridden with `APP_DATA_DIR` or
`SQLITE_DB_PATH` / `DATABASE_PATH`.

## Portal Data Model
- Training sessions capture:
  school name, participant names, participant role (Classroom teacher/School Leader), phone, email, district, sub-county, parish, and optional village.
- Assessment records capture:
  school/location, learners assessed, stories published, and assessment date.
- Impact metrics are computed from portal records:
  teachers trained, schools trained, learners assessed, stories published, and training sessions completed.

## Staff/Volunteer Login
User auto-seeding is controlled by `PORTAL_AUTO_SEED_USERS`:
- `false` (recommended for deployment): do not auto-create accounts.
- `true` (development convenience): seed baseline portal accounts if missing.

Set custom credentials in `.env.local` (or copy from `.env.example`):
- `PORTAL_STAFF_EMAIL`
- `PORTAL_STAFF_PASSWORD`
- `PORTAL_VOLUNTEER_EMAIL`
- `PORTAL_VOLUNTEER_PASSWORD`
- `PORTAL_ADMIN_EMAIL`
- `PORTAL_ADMIN_PASSWORD`
- `PORTAL_SUPERADMIN_EMAIL`
- `PORTAL_SUPERADMIN_PASSWORD`
- `PORTAL_AUTO_SEED_USERS`
- `PORTAL_PASSWORD_SALT`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIMEZONE`
- `GOOGLE_WORKSPACE_OAUTH_REDIRECT_URI`
- `APP_ORIGIN`
- `BOOKING_CALENDAR_DURATION_MINUTES`
- `APP_DATA_DIR`
- `SQLITE_DB_PATH`
- `DATABASE_PATH`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTHOG_KEY`
- `POSTHOG_HOST`
- `METABASE_SITE_URL`

## SEO & Technical Setup
- Clean routes for all core pages
- Metadata per page
- Structured data (Organization and FAQ JSON-LD on key pages)
- Auto-generated `sitemap.xml` and `robots.txt`
- Mobile-first responsive UI

## Local Development
1. Install dependencies:
```bash
npm install
```
2. Run dev server:
```bash
npm run dev
```
3. Open:
```text
http://localhost:3000
```

## Quality Checks
```bash
npm run lint
npm run build
```

`npm run build` runs a native-module preflight (`verify:native`) before the Next.js build.

## Deployment Prep
1. Use Node.js `22.x` to `24.x` (see `package.json` `engines` field).
2. Install dependencies with the deployment Node version (`npm ci` recommended).
3. If Node version changed after install, rebuild native dependencies:
   ```bash
   npm rebuild better-sqlite3
   ```
4. Set `PORTAL_AUTO_SEED_USERS=false`.
5. Set strong real credentials and secrets in environment variables.
6. Purge test/dummy records from Super Admin > Data Management.
7. Start from a clean runtime data volume (`APP_DATA_DIR`, defaults to `./data`).
8. Use `npm start` (runs `node .next/standalone/server.js`).

This project now uses Next.js `output: "standalone"` for deployment-friendly server bundles.

Health endpoint:
- `GET /api/health`

## AWS Deployment
- AWS guide:
  - `docs/aws-deployment.md`
- For source deployments (Elastic Beanstalk/App Runner source), the included `Procfile` uses:
  - `web: npm run start:standalone`
- App Runner source deployments can also use the included:
  - `apprunner.yaml`
- For ECS/Fargate + Docker, set container health check path to:
  - `/api/health`

## Docker
Build image:
```bash
docker build -t ozeki-reading-bridge-foundation:latest .
```

Run container:
```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  ozeki-reading-bridge-foundation:latest
```

Notes:
- SQLite data is persisted via `/app/data` volume mount.
- The image includes Chromium and sets `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` for newsletter PDF generation.
- Docker image healthcheck probes `http://127.0.0.1:${PORT:-3000}/api/health`.

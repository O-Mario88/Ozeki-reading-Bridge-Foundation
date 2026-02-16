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

SQLite database file is created at `data/app.db`.

## Portal Data Model
- Training sessions capture:
  school name, participant names, participant role (Classroom teacher/School Leader), phone, email, district, sub-county, parish, and optional village.
- Assessment records capture:
  school/location, learners assessed, stories published, and assessment date.
- Impact metrics are computed from portal records:
  teachers trained, schools trained, learners assessed, stories published, and training sessions completed.

## Staff/Volunteer Login
Default seeded accounts are created automatically if not already present:
- Staff: `staff@ozekireadingbridge.org`
- Volunteer: `volunteer@ozekireadingbridge.org`
- Passwords can be set through environment variables.

Set custom credentials in `.env.local` (or copy from `.env.example`):
- `PORTAL_STAFF_EMAIL`
- `PORTAL_STAFF_PASSWORD`
- `PORTAL_VOLUNTEER_EMAIL`
- `PORTAL_VOLUNTEER_PASSWORD`
- `PORTAL_PASSWORD_SALT`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIMEZONE`
- `BOOKING_CALENDAR_DURATION_MINUTES`
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

Both commands currently pass.

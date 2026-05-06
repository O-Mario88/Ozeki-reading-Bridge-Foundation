# Deployment Checklist

## Required Environment
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...`
- `DATABASE_SSL=true|false` (set explicitly for target environment)
- `PORTAL_SESSION_SECRET` (strong secret)
- `PORTAL_PASSWORD_SALT` (20+ chars)
- `LOG_ACTIVE_DB=true` (recommended)

## Must Not Be Set in Production
- `ALLOW_SQLITE`
- `SQLITE_DB_PATH`
- `DATABASE_PATH`

## Database Preparation
1. Run PostgreSQL schema bootstrap:
   - `npm run postgres:bootstrap`
2. Verify connectivity:
   - `GET /api/health` should return `activeDb=postgres` and `checks.database=ok`.
3. Confirm `organization_profile` table exists (migration `0033_organization_profile.sql`).
4. Confirm public-content engagement tables exist (migration `0034_public_content_engagement.sql`):
   - `portal_leadership_team_members`
   - `portal_core_values`
   - `story_views`
   - `story_ratings`
   - `story_comments`

## Startup Safety
- Use `npm run start` (standalone wrapper) so startup DB preflight runs.
- Startup should log:
  - `DB=postgres host=... database=... ssl=...`
- Optional strict fail-fast:
  - set `DB_STARTUP_STRICT=true` to crash startup when DB preflight fails.
  - leave unset/false to allow app boot in degraded mode while `/api/health` reports DB failure.

## CI/Pre-Deploy
- Production build (Railway runs this automatically via the Dockerfile):
  - `npm run build`
- General CI verify (artifact-safe when DB is unavailable):
  - `npm run ci:verify`
- Full strict pre-deploy verification (recommended before release):
  - `npm run ci:verify:strict`
- Ensure strict deploy check passes:
  - rejects `ALLOW_SQLITE`
  - rejects SQLite path env vars

## PDF Branding Readiness
- Set organization profile from Admin Settings:
  - `/portal/admin/settings`
- Verify sample branding PDF:
  - `/api/portal/admin/pdf-branding-sample`
  - check first-page header and multi-page watermark behavior.
- Optional local sample generation:
  - `npm run generate:pdf-sample`

## Operational Validation
- Generate at least one invoice/receipt/report PDF after deploy.
- Confirm branded metadata values match the active organization profile.
- Confirm no secrets appear in logs.
- Validate import workflows after deploy:
  - schools template download
  - schools preview + commit
  - training participants preview + commit
  - missing-schools template download when participant rows reference unknown schools
- Confirm imported schools and participants appear in portal views and reports that depend on them.

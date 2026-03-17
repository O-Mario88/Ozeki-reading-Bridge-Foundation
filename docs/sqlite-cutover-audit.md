# SQLite Cutover Audit (2026-03-17)

## Summary
SQLite usage remained in the repository because legacy modules and migration scripts still referenced `getDb()`/SQLite concepts, while PostgreSQL migration was partially completed. The runtime now hard-fails SQLite paths to prevent accidental production usage.

## SQLite Entry Points (code)

### Runtime code paths
- `src/lib/db.ts`
  - Legacy SQLite bootstrap/migration logic and broad `getDb()` call surface.
  - Now hard-disabled via policy error when reached.
- `src/lib/finance-db.ts`
  - Imports `getDb` from `src/lib/db.ts`; many legacy branches still call `getDb()`.
- `src/lib/blog-db.ts`
  - Contains legacy SQLite guard function (`getDb()` throws).
- `src/lib/national-intelligence.ts`
  - Contains legacy SQLite guard function (`getDb()` throws).
- `src/lib/national-intelligence-async.ts`
  - Still contains multiple `getDb()` references.
- `src/lib/training-report-automation.ts`
  - Contains legacy SQLite guard function (`getDb()` throws).
- `src/lib/runtime-paths.ts`
  - `getRuntimeDbFilePath()` hard-fails to prevent SQLite DB file path usage.

### Legacy migration artifacts
- Historical SQLite import scripts still exist under `scripts/postgres-import-*.ts` and require final retirement/replacement with PostgreSQL-native import paths.
- These scripts are no longer exposed via `package.json` runtime scripts.

## Hardening Applied
- `src/lib/db.ts`
  - `getDb()` now fails fast with explicit PostgreSQL-only policy errors.
- `src/lib/db-runtime-policy.ts` (new)
  - Central runtime policy: SQLite disabled unconditionally in all environments.
- `src/lib/runtime-paths.ts`
  - SQLite DB path resolution removed; `getRuntimeDbFilePath()` now hard-fails.
- `scripts/deploy-readiness-check.mjs`
  - Rejects `ALLOW_SQLITE`, `SQLITE_DB_PATH`, and `DATABASE_PATH` in all modes.
- `apprunner.yaml`
  - Removed `better-sqlite3` rebuild step.
- `scripts/start-standalone.mjs`
  - Adds production DB startup preflight (`SELECT 1`) and logs active DB target.
- `database/postgres/0034_public_content_engagement.sql`
  - Adds PostgreSQL-native tables for:
    - `portal_leadership_team_members`
    - `portal_core_values`
    - `story_views`
    - `story_ratings`
    - `story_comments`
- `src/lib/server/postgres/repositories/public-content.ts` (new)
  - Adds PostgreSQL repository functions for:
    - testimonials (public + portal management)
    - about/team/core values (public + portal management)
    - stories/anthologies public read + comments/ratings/views

## Runtime Paths Migrated Off `getDb()`
- Public pages/routes now on PostgreSQL repository APIs:
  - `/about`, `/about/leadership-team`
  - `/stories`, `/stories/[slug]`, `/anthologies/[slug]`
  - `/api/stories`, `/api/stories/[slug]`, `/api/stories/[slug]/ratings`, `/api/stories/[slug]/comments`
  - `/api/anthologies`, `/api/pdf-engine`
  - `/api/testimonials/[id]/photo`, `/api/testimonials/[id]/video`
  - `/impact/case-studies` + detail page + sitemap dynamic story/change-story entries
- Portal management paths migrated:
  - `/portal/about`
  - `/api/portal/about/team`
  - `/api/portal/about/core-values`
  - `/portal/testimonials`
  - `/api/portal/testimonials`

## Remaining Refactor Scope
The following modules still contain PostgreSQL migration debt and should be migrated function-by-function to repository APIs:
- `src/lib/finance-db.ts`
- `src/lib/national-intelligence-async.ts`
- Any routes that still call legacy functions from the above.

## Guardrail Policy
- Production: SQLite impossible (`DATABASE_URL` required).
- Non-production: SQLite impossible (same hard-disable policy).

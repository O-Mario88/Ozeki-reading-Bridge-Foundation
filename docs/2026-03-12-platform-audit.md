# Platform Audit - March 12, 2026

## Executive Findings
- The legacy platform is a monolith where frontend pages and backend logic are coupled inside a single Next.js app.
- Backend logic spans `~44k` lines of TypeScript across `src/lib/db.ts`, `src/lib/finance-db.ts`, and `src/lib/national-intelligence.ts`.
- API surface is very large (`156` route handlers under `src/app/api`), with direct SQLite access in most handlers.
- Database behavior is migration-by-runtime (`ALTER TABLE` and schema drift checks inside app code), which is unsafe for production.
- Deployment scripts assume native SQLite persistence and include runtime data copying into build artifacts.

## Frontend Audit
### Useful assets retained
- Core public user journeys: homepage, impact dashboard, blog/stories, partner/transparency narratives.
- Staff portal journeys: schools, trainings, visits, evaluations, assessments, finance, reports.
- Existing media assets under `public/photos`, `public/partners`, and donor pack artifacts.

### Issues detected
- Excessive route sprawl (`135` page routes) with duplicate/overlapping paths.
- Server components directly importing backend DB modules (`@/lib/db` and `@/lib/finance-db`), preventing clean architecture boundaries.
- Tight coupling to local API route semantics (`/api/...`) across many client components.
- Build safety disabled (`eslint.ignoreDuringBuilds` + `typescript.ignoreBuildErrors`).
- Multiple stale artifacts (`package-lock 2.json`, duplicated style files, `.next_stale*` build dirs).

## Backend Audit
### Preserved business domains
- Schools, contacts/staff roster, learners.
- Trainings, school visits, lesson evaluations.
- Assessments and reading-level analytics.
- Stories/blog/newsletter content workflows.
- Finance workflows (invoices, receipts, expenses, ledger, statements, public snapshots).
- Impact reporting, dashboard aggregates, audit logs.

### Obsolete or risky patterns removed
- Next.js API backend as system-of-record.
- Runtime SQLite schema mutation in request lifecycle.
- Frontend-only access controls for sensitive operations.
- Single-process heavy logic for report generation and audit sweeps without async queue boundary.

## Database Audit (SQLite)
- Source DB: `data/app.db`.
- Approximate discovered tables: `120+`.
- Core tables preserved in migration map:
  - `portal_users`, geo tables, `schools_directory`, `school_contacts`, `school_learners`, `teacher_roster`
  - `training_sessions`, `training_participants`, `coaching_visits`, `visit_participants`
  - `lesson_evaluations`, `lesson_evaluation_items`
  - `assessment_sessions`, `assessment_session_results`
  - `story_library`, `story_anthologies`, `portal_blog_posts`
  - finance tables (`finance_*`)
  - `impact_reports`
- Notable schema risks in old DB:
  - duplicated "next" tables (`*_next`) and partially superseded entities.
  - text-based JSON blobs with weak validation.
  - mixed naming conventions and status enums.
  - limited referential integrity enforcement across some modules.

## Deployment Audit
### Legacy blockers
- SQLite-native dependency (`better-sqlite3`) in production path.
- Build-time copy of runtime data into server output.
- Single runtime process for frontend + backend + file persistence assumptions.
- App-level host split logic coupled to middleware behavior instead of infrastructure boundaries.

### Rebuild direction
- Frontend: standalone Next.js app targeting AWS Amplify SSR.
- Backend: Django + DRF targeting AWS Elastic Beanstalk/App Runner patterns.
- Database: PostgreSQL (RDS) only.
- Media/static: environment-based storage strategy (S3 in production).

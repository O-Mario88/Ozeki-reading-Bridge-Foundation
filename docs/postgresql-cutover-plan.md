# PostgreSQL Cutover Plan for Current `main`

## Decision
- Migrate production persistence from SQLite to PostgreSQL now.
- Do not change frontend page contracts during the database cutover.
- Do not keep a long-term mixed SQLite/PostgreSQL write path.
- Treat file storage as a separate cutover stream from relational data.

## Why This Is the Right Time
- The current production app still depends on local SQLite and local writable storage through [src/lib/db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/db.ts), [src/lib/finance-db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-db.ts), and [src/lib/runtime-paths.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/runtime-paths.ts).
- Public and portal pages call directly into those modules from many routes under [src/app](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app).
- The live failure pattern already matches local-disk persistence problems:
  - dashboard data returning zeroed aggregates
  - sessions needing hardening
  - PDFs and generated artifacts relying on runtime-local paths
  - finance documents and report assets depending on file paths under `data/`

This means the database migration is not optional cleanup. It is part of stabilizing production behavior.

## Scope Freeze
### Must-Have for the PostgreSQL cutover
- Portal auth and staff sessions
- Geography and school directory
- School contacts, teacher roster, learner roster
- Assessments, visits, lesson evaluations, training attendance
- Finance contacts, invoices, receipts, payments, expenses, ledger, statements
- Blog posts, portal records, evidence, resources
- Public impact aggregates and report source data
- Audit logs

### Phase 2 after cutover
- Recomputed analytics caches and summary tables
- Google Meet transcript sync persistence refinements
- Story ratings/views/comments if still low-volume
- Advanced national intelligence helper tables that can be rebuilt

### Archive or recompute instead of migrating as-is
- `*_next` tables
- derived rollup tables that can be regenerated
- temporary or denormalized cache tables used only for reporting acceleration

## What Exists Today
The current SQLite database at [data/app.db](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/data/app.db) contains a wide monolith schema. The highest-value live tables currently include:

| Domain | Tables | Current rows |
| --- | --- | ---: |
| Auth | `portal_users`, `portal_sessions`, `audit_logs` | `6`, `4`, `322` |
| Schools | `schools_directory`, `school_contacts`, `school_learners`, `teacher_roster`, `learner_roster` | `42`, `65`, `20`, `23`, `20` |
| Assessments | `assessment_sessions`, `assessment_session_results`, `assessment_records` | `18`, `18`, `19` |
| Evaluations | `lesson_evaluations`, `lesson_evaluation_items` | `1`, `21` |
| Training | `portal_training_attendance` | `19` |
| Finance | `finance_contacts`, `finance_invoices`, `finance_receipts`, `finance_payments`, `finance_expenses`, `finance_transactions_ledger`, `finance_monthly_statements` | `32`, `32`, `30`, `15`, `15`, `45`, `3` |
| Files | `finance_files` | `167` |

Important note: several tables that appear product-critical currently have zero rows in the local canonical DB, including `training_sessions`, `coaching_visits`, `portal_blog_posts`, `story_library`, `story_anthologies`, `impact_reports`, and `training_report_artifacts`. The public site is therefore partly surviving on bundled/static content and not on a healthy shared operational database.

## Functional Coupling That Must Be Preserved
The safest way to migrate this repo is to preserve the current service contracts first, then swap the storage layer underneath them.

High-impact examples:
- [src/app/api/auth/login/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/auth/login/route.ts) uses `authenticatePortalUser()` and `createPortalSession()`
- [src/app/api/impact/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/impact/route.ts) uses `getImpactSummary()` and drilldown helpers
- [src/app/api/impact/report-engine/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/impact/report-engine/route.ts) depends on `getPublicImpactAggregate()`
- [src/app/api/portal/schools/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/schools/route.ts), [src/app/api/portal/assessments/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/assessments/route.ts), [src/app/api/portal/lesson-evaluations/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/lesson-evaluations/route.ts), and the finance routes all read from the same monolithic DB layer
- Public blog pages rely on [src/lib/blog-data.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/blog-data.ts), which merges static content with DB content

The migration should therefore preserve these function-level contracts at first. The frontend should not need a page-by-page rewrite just to switch storage engines.

## Target Architecture for the Cutover
This plan is for stabilizing the current `main` branch first, not for a full application rewrite.

### Storage target
- PostgreSQL as the only production system of record
- SQL migrations checked into the repo
- no runtime `ALTER TABLE` mutations inside request-time application code

### Application target
- Keep the current Next.js routes and page contracts initially
- Introduce a thin server-side data-access layer between route handlers and raw SQL
- Move from one giant `better-sqlite3` module toward domain repositories

### File storage target
- Move runtime-local files to S3-compatible object storage
- keep only metadata and object keys in PostgreSQL
- stop storing operational truth in `stored_path` or `pdf_stored_path` values that assume local disk

## Implementation Shape
### Step 1: Introduce a database adapter layer
Add a new server-only layer, for example:
- `src/lib/server/db/client.ts`
- `src/lib/server/db/schema/*`
- `src/lib/server/repositories/auth.ts`
- `src/lib/server/repositories/schools.ts`
- `src/lib/server/repositories/assessments.ts`
- `src/lib/server/repositories/finance.ts`
- `src/lib/server/repositories/content.ts`

Initial rule:
- existing exported functions from [src/lib/db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/db.ts) and [src/lib/finance-db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-db.ts) remain the call surface
- those functions begin delegating to repositories

This gives us storage replacement without forcing route contract changes.

### Step 2: Define PostgreSQL schema by domain
#### Auth and access
- `portal_users`
- `portal_sessions`
- `audit_logs`

Changes:
- keep user IDs stable with `legacy_id`
- normalize boolean flags and role handling
- eventually replace DB-backed sessions with signed-cookie plus session table or Redis, but not during first cutover

#### Geography and schools
- `geo_regions`
- `geo_subregions`
- `geo_districts`
- `geo_subcounties`
- `geo_parishes`
- `schools_directory`
- `school_contacts`
- `school_learners`
- `teacher_roster`

Changes:
- enforce foreign keys instead of text-only geography joins
- keep legacy geography text columns where needed for historical records
- preserve `school_uid`, `contact_uid`, and `learner_uid`

#### Training, visits, evaluations
- `portal_training_attendance`
- `training_sessions`
- `training_participants`
- `coaching_visits`
- `visit_participants`
- `visit_demo`
- `visit_leadership_meeting`
- `lesson_evaluations`
- `lesson_evaluation_items`

Changes:
- move JSON blobs such as focus areas and classes implementing into `jsonb`
- preserve historical scores exactly
- attach hard FKs to schools, users, and visits

#### Assessments
- `assessment_sessions`
- `assessment_session_results`
- `assessment_records`
- `assessment_item_responses`
- benchmark/settings tables

Changes:
- use `jsonb` for scoring payloads only where structure varies
- convert date text to `timestamptz` or `date`
- preserve assessment model versions and benchmark versions

#### Finance
- `finance_contacts`
- `finance_invoices`
- `finance_invoice_items`
- `finance_receipts`
- `finance_payments`
- `finance_payment_allocations`
- `finance_expenses`
- `finance_transactions_ledger`
- `finance_statement_lines`
- `finance_reconciliation_matches`
- `finance_monthly_statements`
- `finance_settings`
- `finance_email_logs`
- `finance_files`
- `finance_public_snapshots`
- `finance_audit_exceptions`
- `finance_txn_risk_scores`
- `finance_budgets_monthly`

Changes:
- preserve invoice and receipt numbers exactly
- enforce transaction integrity with FKs and database constraints
- move file references from `stored_path` to object keys and metadata
- keep ledger balances and document totals verifiable after import

#### Content and public publishing
- `portal_blog_posts`
- `portal_records`
- `portal_evidence`
- `portal_resources`
- `portal_testimonials`
- `portal_core_values`
- `portal_leadership_team_members`
- `story_library`
- `story_anthologies`
- `story_comments`
- `story_ratings`
- `story_views`

Changes:
- keep static fallback blog content temporarily
- import operational content data only if present
- move media references to object storage URLs or object keys

#### Reporting and public aggregates
- `impact_reports`
- `training_report_artifacts`
- national report tables
- public aggregate source tables such as:
  - `impact_public_training_events`
  - `impact_public_visit_events`
  - `impact_public_assessment_events`
  - `impact_public_lesson_evaluation_events`
  - `impact_public_school_scope`

Changes:
- treat aggregate tables as rebuildable unless they are the only source of truth
- keep report metadata and templates in PostgreSQL
- generated PDFs should be regenerated or stored in object storage

## Tables to Drop from Migration Scope
- `impact_reports_next`
- `training_feedback_entries_next`
- any `*_next` rebuild tables
- denormalized analytics tables that can be recomputed after source import, such as:
  - `school_insights_rollup`
  - `training_feedback_themes_by_training_period`
  - `training_participation_summary_by_geo_period`
  - `teaching_quality_by_school_period`
  - `teaching_learning_alignment_by_school_period`
  - `reading_level_distribution_by_school_grade_period`
  - `story_participation_by_school_period`
  - `teacher_improvement_by_teacher`
  - `school_support_status_by_school_period`
  - `teacher_support_status_by_teacher_period`

These should not block cutover. Rebuild them from source tables after import.

## File and Media Migration Strategy
Relational migration alone is not enough because multiple modules store file paths that point into `data/`.

Examples:
- `finance_files.stored_path`
- `portal_evidence.stored_path`
- `training_report_artifacts.pdf_stored_path`
- `story_library.pdf_stored_path`
- `story_library.cover_image_path`
- `story_anthologies.pdf_stored_path`
- `story_anthologies.cover_image_path`

Plan:
1. Inventory all files under `data/finance`, `data/training`, `data/gallery`, `data/about`, `data/testimonials`, and related folders.
2. Upload them to S3 using deterministic keys:
   - `finance/invoices/<invoice-number>.pdf`
   - `finance/receipts/<receipt-number>.pdf`
   - `evidence/<yyyy-mm>/<uuid>-<filename>`
   - `reports/training/<report-code>.pdf`
3. Replace local path columns with:
   - `storage_provider`
   - `object_key`
   - `public_url` or signed URL generation logic
   - content hash
4. For missing files, regenerate where possible instead of migrating broken path references.

## Cutover Sequence
### Phase 0: Freeze and backup
- freeze schema changes on `main`
- take a full SQLite backup
- export a row-count and checksum report for must-have tables

### Phase 1: Foundation
- add PostgreSQL client and migration tooling
- introduce repository interfaces
- keep existing route signatures unchanged
- add environment config for `DATABASE_URL`

### Phase 2: Auth and school core
- migrate `portal_users`, `portal_sessions`, `audit_logs`
- migrate geography and school tables
- switch auth and school reads to PostgreSQL first

Reason:
- these are foundational for almost every staff flow
- they have relatively low row counts and high functional value

### Phase 3: Assessments, visits, and evaluations
- migrate assessment and visit source tables
- rebuild the functions behind:
  - `getPublicImpactAggregate()`
  - `getImpactSummary()`
  - school and district drilldowns

Reason:
- this fixes the public dashboard and report source data

### Phase 4: Finance
- migrate finance tables and file metadata
- switch invoice, receipt, statement, and ledger flows to PostgreSQL
- keep email logic unchanged except for file lookup and document storage references

Reason:
- finance is internally important but can be tested in isolation after core school and assessment data are stable

### Phase 5: Content and reports
- migrate portal content tables
- move generated report metadata to PostgreSQL
- keep static public blog fallback until DB-backed publishing is verified

### Phase 6: Remove SQLite production path
- remove `better-sqlite3` from production runtime
- remove data-dir fallback logic from production code
- keep SQLite import tooling only as an archival migration utility

## Verification Gates
Each phase must pass verification before the next begins.

### Data integrity
- exact row count match for must-have source tables
- sampled FK validation:
  - school -> contacts
  - school -> teachers
  - school -> learners
  - invoice -> items
  - receipt -> invoice
  - payment -> allocations

### Functional checks
- login and session persistence
- school create/edit/load
- assessment save/load
- lesson evaluation save/load
- public dashboard non-zero data where source data exists
- report JSON generation
- finance invoice create/send/download
- receipt create/send/download

### Report checks
- JSON report endpoints produce the same numbers before and after cutover
- AI narrative layer gets the same fact payload
- PDF generation is validated separately from DB migration

## Risks and How to Control Them
### Risk: breaking page functionality during migration
Control:
- keep route contracts and exported service functions stable during the first cutover

### Risk: importing bad or duplicate data
Control:
- preserve `legacy_id`
- deduplicate by business keys such as email, school code, invoice number, and receipt number

### Risk: hidden SQLite-only assumptions
Control:
- search and replace all direct SQL access patterns that depend on SQLite behavior
- remove runtime schema mutation logic and replace it with explicit migrations

### Risk: broken files after cutover
Control:
- migrate files as object storage assets, not as local paths
- regenerate PDFs when canonical source data exists

## Rollback Plan
- keep the frozen SQLite backup untouched
- do the first live cutover through staging first
- switch production through an environment-level DB toggle only after verification
- if production cutover fails, roll back by restoring the previous app version and previous DB target, not by attempting ad hoc hotfix SQL

## Recommended First Implementation PR
Do not start by rewriting every query in [src/lib/db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/db.ts).

Start with one disciplined foundation PR:
1. add PostgreSQL connection and migration tooling
2. add repository interfaces for auth, schools, assessments, and finance
3. route `authenticatePortalUser()`, `createPortalSession()`, school directory reads, and basic assessment aggregate reads through repositories
4. add a migration script that imports:
   - `portal_users`
   - `audit_logs`
   - geography tables
   - `schools_directory`
   - `school_contacts`
   - `school_learners`
   - `teacher_roster`
   - `assessment_sessions`
   - `assessment_session_results`
   - `assessment_records`

That first PR is the lowest-risk way to prove the cutover approach before touching finance and report artifact storage.

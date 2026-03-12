# SQLite -> PostgreSQL Migration Map

## Migration Process
1. Backup legacy SQLite (`backend/scripts/backup_sqlite.sh`).
2. Run Django migrations on PostgreSQL.
3. Execute `backend/scripts/migrate_sqlite_to_postgres.py`.
4. Validate counts and spot-check referential integrity.

## Key Entity Mapping
- `portal_users.id` -> `accounts_user.legacy_id`
  - role flags (`is_superadmin`, `is_admin`, `is_me`, `is_supervisor`) -> `accounts_user.role`
- `schools_directory.id` -> `schools_school.legacy_id`
  - `school_code` -> `code`
  - district/subcounty/parish text + geo IDs -> normalized FKs + fallback text fields
- `school_contacts.contact_id` -> `schools_schoolcontact.legacy_id`
- `school_learners.learner_id` -> `learners_learner.legacy_id`
- `teacher_roster.id` -> `schools_teacher.legacy_id`
- `training_sessions.id` -> `training_trainingsession.legacy_id`
- `coaching_visits.id` -> `visits_schoolvisit.legacy_id`
- `lesson_evaluations.id` -> `evaluations_lessonevaluation.legacy_id`
- `assessment_sessions.id` -> `assessments_assessmentsession.legacy_id`
- `assessment_session_results.id` -> `assessments_assessmentresult.legacy_id`
- `story_anthologies.id` -> `content_storyanthology.legacy_id`
- `story_library.id` -> `content_story.legacy_id`
- `portal_blog_posts.id` -> `content_blogpost.legacy_id`
- `impact_reports.id` -> `reports_impactreport.legacy_id`
- `finance_contacts.id` -> `finance_financecontact.legacy_id`
- `finance_invoices.id` -> `finance_invoice.legacy_id`
- `finance_receipts.id` -> `finance_receipt.legacy_id`
- `finance_expenses.id` -> `finance_expense.legacy_id`
- `finance_public_snapshots.id` -> `finance_publicfinancesnapshot.legacy_id`

## Enum/Status Normalization
- Contact categories normalized to lowercase snake_case.
- Gender values normalized across school contacts/learners/teachers.
- Visit, finance, and workflow statuses mapped to strict Django `TextChoices`.

## Data Dropped or Deferred
- Legacy duplicate tables (`*_next`) not imported.
- Unstructured transient payload blobs without stable schema are deferred to phase 2.
- Non-critical analytics cache tables are recomputed in new architecture.

## Integrity Checks
- Row count parity checks for core entities.
- FK validation: school -> contacts/learners/teachers.
- Finance validation: invoice/receipt/expense totals and ledger row presence.
